use crate::errors::ErrorCode;
use crate::state::{Game, GameEnded, ProgramConfig};
use crate::utils::payout::calculate_payouts;
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Token, TokenAccount},
};

#[derive(Accounts)]
pub struct EndGame<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"game", game.admin.as_ref(), game.game_code.as_bytes()],
        bump = game.bump,
        constraint = game.admin == admin.key() @ ErrorCode::InvalidAdmin
    )]
    pub game: Account<'info, Game>,

    /// CHECK: The vault PDA that owns the token account
    #[account(
        mut,
        seeds = [b"vault", game.admin.as_ref(), game.game_code.as_bytes()],
        bump = game.vault_bump,
    )]
    pub vault: UncheckedAccount<'info>,

    // Only needed for SPL token games
    #[account(
        mut,
        associated_token::mint = game.token_mint,
        associated_token::authority = vault
    )]
    pub vault_token_account: Option<Account<'info, TokenAccount>>,

    // Admin's token account for receiving commission
    #[account(
        mut,
        constraint = !game.is_native @ ErrorCode::InvalidTokenAccount,
        constraint = admin_token_account.to_account_info().key() != Pubkey::default() @ ErrorCode::InvalidTokenAccount,
        constraint = admin_token_account.owner == admin.key() @ ErrorCode::InvalidTokenAccount,
        constraint = admin_token_account.mint == game.token_mint @ ErrorCode::InvalidTokenAccount
    )]
    pub admin_token_account: Option<Account<'info, TokenAccount>>,

    // Treasury's token account for receiving fees
    #[account(
        mut,
        constraint = !game.is_native @ ErrorCode::InvalidTokenAccount,
        constraint = treasury_token_account.to_account_info().key() != Pubkey::default() @ ErrorCode::InvalidTokenAccount,
        constraint = treasury_token_account.owner == config.treasury_pubkey @ ErrorCode::InvalidTokenAccount,
        constraint = treasury_token_account.mint == game.token_mint @ ErrorCode::InvalidTokenAccount
    )]
    pub treasury_token_account: Option<Account<'info, TokenAccount>>,

    #[account(
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, ProgramConfig>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,

    /// CHECK: Safe because we just transfer SOL to this account
    #[account(
        mut,
        constraint = treasury.key() == config.treasury_pubkey @ ErrorCode::InvalidTreasury
    )]
    pub treasury: UncheckedAccount<'info>,
}

impl<'info> EndGame<'info> {
    pub fn end_game(&mut self) -> Result<()> {
        let current_time = Clock::get()?.unix_timestamp;

        // If ending early, update the end_time to current_time
        if current_time < self.game.end_time {
            self.game.end_time = current_time;
        }

        // Calculate total pot (entry fees + donations)
        let total_pot = self
            .game
            .entry_fee
            .checked_mul(self.game.total_players.into())
            .ok_or(ErrorCode::NumericOverflow)?
            .checked_add(self.game.donation_amount)
            .ok_or(ErrorCode::NumericOverflow)?;

        // Calculate all payout amounts
        let (treasury_fee, admin_commission, prize_pool, per_winner) = calculate_payouts(
            total_pot,
            self.config.treasury_fee,
            self.game.commission,
            self.game.max_winners,
            self.game.total_players,
        )?;

        // Transfer fees and commission
        if treasury_fee > 0 || admin_commission > 0 {
            let vault_bump = self.game.vault_bump;
            let seeds = &[
                b"vault",
                self.game.admin.as_ref(),
                self.game.game_code.as_bytes(),
                &[vault_bump],
            ];
            let signer = &[&seeds[..]];

            if self.game.is_native {
                // Transfer SOL to treasury
                if treasury_fee > 0 {
                    let treasury_transfer_ix = anchor_lang::system_program::Transfer {
                        from: self.vault.to_account_info(),
                        to: self.treasury.to_account_info(),
                    };
                    let treasury_transfer_ctx = CpiContext::new_with_signer(
                        self.system_program.to_account_info(),
                        treasury_transfer_ix,
                        signer,
                    );
                    anchor_lang::system_program::transfer(treasury_transfer_ctx, treasury_fee)?;
                }

                // Transfer SOL commission to admin
                if admin_commission > 0 {
                    let admin_transfer_ix = anchor_lang::system_program::Transfer {
                        from: self.vault.to_account_info(),
                        to: self.admin.to_account_info(),
                    };
                    let admin_transfer_ctx = CpiContext::new_with_signer(
                        self.system_program.to_account_info(),
                        admin_transfer_ix,
                        signer,
                    );
                    anchor_lang::system_program::transfer(admin_transfer_ctx, admin_commission)?;
                }
            } else {
                let vault_token_account = self
                    .vault_token_account
                    .as_ref()
                    .ok_or(ErrorCode::VaultTokenAccountNotProvided)?;

                // Transfer tokens to treasury
                if treasury_fee > 0 {
                    let treasury_token_account = self
                        .treasury_token_account
                        .as_ref()
                        .ok_or(ErrorCode::TreasuryTokenAccountNotProvided)?;

                    let treasury_transfer_ctx = CpiContext::new_with_signer(
                        self.token_program.to_account_info(),
                        anchor_spl::token::Transfer {
                            from: vault_token_account.to_account_info(),
                            to: treasury_token_account.to_account_info(),
                            authority: self.vault.to_account_info(),
                        },
                        signer,
                    );
                    anchor_spl::token::transfer(treasury_transfer_ctx, treasury_fee)?;
                }

                // Transfer tokens commission to admin
                if admin_commission > 0 {
                    let admin_token_account = self
                        .admin_token_account
                        .as_ref()
                        .ok_or(ErrorCode::AdminTokenAccountNotProvided)?;

                    let admin_transfer_ctx = CpiContext::new_with_signer(
                        self.token_program.to_account_info(),
                        anchor_spl::token::Transfer {
                            from: vault_token_account.to_account_info(),
                            to: admin_token_account.to_account_info(),
                            authority: self.vault.to_account_info(),
                        },
                        signer,
                    );
                    anchor_spl::token::transfer(admin_transfer_ctx, admin_commission)?;
                }
            }
        }

        // Emit game ended event with per_winner amount
        emit!(GameEnded {
            game: self.game.key(),
            total_pot,
            prize_pool,
            treasury_fee,
            admin_commission,
            per_winner,
            end_time: current_time,
        });

        Ok(())
    }
}

// Client-side winner determination
// async function determineWinners(gameAddress: PublicKey, maxWinners: number) {
//     // Find all player accounts for this game
//     const playerAccounts = await program.account.playerAccount.all([
//       {
//         memcmp: {
//           offset: 8, // after discriminator
//           bytes: gameAddress.toBase58(),
//         },
//       },
//     ]);

//     // Sort by num_correct (descending) and finish_time (ascending)
//     const sortedPlayers = playerAccounts
//       .filter(p => p.account.finishedTime > 0) // Only include players who submitted
//       .sort((a, b) => {
//         if (b.account.numCorrect !== a.account.numCorrect) {
//           return b.account.numCorrect - a.account.numCorrect;
//         }
//         return a.account.finishedTime - b.account.finishedTime;
//       });

//     // Return top winners
//     return sortedPlayers.slice(0, maxWinners);
//   }
