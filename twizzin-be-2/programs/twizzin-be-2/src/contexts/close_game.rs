use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Token, TokenAccount},
};

use crate::errors::ErrorCode;
use crate::state::{Game, GameClosed, Winners};

#[derive(Accounts)]
pub struct CloseGame<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"game", admin.key().as_ref(), game.game_code.as_bytes()],
        bump = game.bump,
        constraint = game.admin == admin.key() @ ErrorCode::InvalidAdmin,
        constraint = Clock::get()?.unix_timestamp * 1000 >= game.end_time @ ErrorCode::GameNotEnded,
        close = admin
    )]
    pub game: Account<'info, Game>,

    #[account(
        mut,
        seeds = [b"winners", game.key().as_ref()],
        bump = winners.bump,
        constraint = verify_all_claimed(&winners) @ ErrorCode::UnclaimedPrizes,
        close = admin
    )]
    pub winners: Account<'info, Winners>,

    /// CHECK: Vault PDA that holds the funds
    #[account(
        mut,
        seeds = [b"vault", admin.key().as_ref(), game.game_code.as_bytes()],
        bump = game.vault_bump,
    )]
    pub vault: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = game.token_mint,
        associated_token::authority = vault,
        constraint = !game.is_native @ ErrorCode::InvalidTokenAccount
    )]
    pub vault_token_account: Option<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> CloseGame<'info> {
    pub fn close_game(&mut self) -> Result<()> {
        let vault_balance = self.vault.lamports();

        // For native SOL, transfer any remaining balance to admin using PDA signing
        if vault_balance > 0 {
            let admin_key = self.admin.key();
            let game_code = self.game.game_code.as_bytes();
            let vault_bump = self.game.vault_bump;

            let vault_seeds = &[
                b"vault" as &[u8],
                admin_key.as_ref(),
                game_code,
                &[vault_bump],
            ];
            let signer = &[&vault_seeds[..]];

            // Transfer SOL using a proper CPI
            anchor_lang::system_program::transfer(
                CpiContext::new_with_signer(
                    self.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: self.vault.to_account_info(),
                        to: self.admin.to_account_info(),
                    },
                    signer,
                ),
                vault_balance,
            )?;
        }

        // For SPL token game, close vault token account
        if !self.game.is_native {
            let vault_token_account = self
                .vault_token_account
                .as_ref()
                .ok_or(ErrorCode::VaultTokenAccountNotProvided)?;

            let admin_key = self.admin.key();
            let game_code = self.game.game_code.as_bytes();
            let vault_bump = self.game.vault_bump;

            let vault_seeds = &[
                b"vault" as &[u8],
                admin_key.as_ref(),
                game_code,
                &[vault_bump],
            ];
            let signer = &[&vault_seeds[..]];

            // First transfer any remaining tokens to admin
            if vault_token_account.amount > 0 {
                let transfer_ctx = CpiContext::new_with_signer(
                    self.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: vault_token_account.to_account_info(),
                        to: self.admin.to_account_info(),
                        authority: self.vault.to_account_info(),
                    },
                    signer,
                );
                anchor_spl::token::transfer(transfer_ctx, vault_token_account.amount)?;
            }

            // Then close the token account
            let close_ctx = CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                anchor_spl::token::CloseAccount {
                    account: vault_token_account.to_account_info(),
                    destination: self.admin.to_account_info(),
                    authority: self.vault.to_account_info(),
                },
                signer,
            );
            anchor_spl::token::close_account(close_ctx)?;
        }

        emit!(GameClosed {
            game: self.game.key(),
            admin: self.admin.key(),
            recovered_lamports: vault_balance
        });

        Ok(())
    }
}

// Helper function to verify all winners have claimed their prizes
fn verify_all_claimed(winners: &Account<Winners>) -> bool {
    winners.winners.iter().all(|winner| winner.claimed)
}
