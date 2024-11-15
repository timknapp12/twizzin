use anchor_lang::prelude::*;
use anchor_spl::{
    token::{Token, TokenAccount},
    associated_token::AssociatedToken,
};

use crate::errors::ErrorCode;
use crate::state::{Game, PlayerAccount, PlayerJoined};

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        mut,
        seeds = [b"game", game.admin.as_ref(), game.game_code.as_bytes()],
        bump = game.bump
    )]
    pub game: Account<'info, Game>,

    #[account(
        init,
        payer = player,
        space = PlayerAccount::INIT_SPACE,
        seeds = [
            b"player",
            game.key().as_ref(),
            player.key().as_ref()
        ],
        bump
    )]
    pub player_account: Account<'info, PlayerAccount>,

    /// CHECK: The vault PDA that will own the token account
    #[account(
        mut,
        seeds = [b"vault", game.admin.as_ref(), game.game_code.as_bytes()],
        bump = game.vault_bump,
    )]
    pub vault: UncheckedAccount<'info>,

    /// The vault's associated token account
    #[account(
        mut,
        associated_token::mint = game.token_mint,
        associated_token::authority = vault
    )]
    pub vault_token_account: Option<Account<'info, TokenAccount>>,

    // Only needed for SPL token games with entry_fee > 0
    #[account(
        mut,
        constraint = 
            (game.entry_fee > 0 && !game.is_native && 
             player_token_account.to_account_info().key() != Pubkey::default() &&
             player_token_account.owner == player.key() &&
             player_token_account.mint == game.token_mint)
            @ ErrorCode::InvalidTokenAccount
    )]
    pub player_token_account: Option<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> JoinGame<'info> {
    pub fn join_game(&mut self, bumps: &JoinGameBumps) -> Result<()> {
        // Verify game hasn't ended
        let current_time = Clock::get()?.unix_timestamp;
        require!(current_time < self.game.end_time, ErrorCode::GameEnded);

        // Only handle entry fee transfer if amount is greater than 0
        if self.game.entry_fee > 0 {
            if self.game.is_native {
                // Transfer SOL
                let cpi_context = CpiContext::new(
                    self.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: self.player.to_account_info(),
                        to: self.vault.to_account_info(),
                    },
                );
                anchor_lang::system_program::transfer(cpi_context, self.game.entry_fee)?;
            } else {
                // Transfer SPL tokens
                let player_token_account = self.player_token_account
                    .as_ref()
                    .ok_or(ErrorCode::PlayerTokenAccountNotProvided)?;

                let vault_token_account = self.vault_token_account
                    .as_ref()
                    .ok_or(ErrorCode::AdminTokenAccountNotProvided)?;

                let transfer_ctx = CpiContext::new(
                    self.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: player_token_account.to_account_info(),
                        to: vault_token_account.to_account_info(),
                        authority: self.player.to_account_info(),
                    },
                );
                anchor_spl::token::transfer(transfer_ctx, self.game.entry_fee)?;
            }
        }

        // Initialize player account
        self.player_account.set_inner(PlayerAccount {
            game: self.game.key(),
            player: self.player.key(),
            join_time: current_time,
            finished_time: 0,
            num_correct: 0,
            answer_hash: [0; 32],
            bump: bumps.player_account,
        });

        // Increment total players in game
        self.game.total_players = self.game.total_players.checked_add(1)
            .ok_or(ErrorCode::PlayerCountOverflow)?;

        // Emit event for tracking
        emit!(PlayerJoined {
            game: self.game.key(),
            player: self.player.key(),
            join_time: current_time,
        });

        Ok(())
    }
}