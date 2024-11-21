use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

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
        constraint = Clock::get()?.unix_timestamp >= game.end_time @ ErrorCode::GameNotEnded,
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
    pub vault: AccountInfo<'info>,

    #[account(
        mut,
        associated_token::mint = game.token_mint,
        associated_token::authority = vault,
        constraint = !game.is_native @ ErrorCode::InvalidTokenAccount
    )]
    pub vault_token_account: Option<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl<'info> CloseGame<'info> {
    pub fn close_game(&mut self) -> Result<()> {
        msg!("Vault owner: {}", self.vault.owner);
        msg!("Vault key: {}", self.vault.key());
        msg!("Admin key: {}", self.admin.key());
        msg!("Game code: {}", self.game.game_code);
        msg!("Vault bump: {}", self.game.vault_bump);

        // Transfer any remaining lamports from vault to admin
        let vault_balance = self.vault.lamports();
        if vault_balance > 0 {
            **self.vault.try_borrow_mut_lamports()? = 0;
            **self.admin.try_borrow_mut_lamports()? = self
                .admin
                .lamports()
                .checked_add(vault_balance)
                .ok_or(ErrorCode::NumericOverflow)?;
        }

        // If SPL token game, close vault token account and transfer any remaining tokens
        if !self.game.is_native {
            let vault_token_account = self
                .vault_token_account
                .as_ref()
                .ok_or(ErrorCode::VaultTokenAccountNotProvided)?;

            // Store the seeds in a variable to extend their lifetime
            let admin_key = self.admin.key();
            let game_code = self.game.game_code.as_bytes();
            let vault_bump = self.game.vault_bump;

            let vault_seeds = &[
                b"vault" as &[u8],
                admin_key.as_ref(),
                game_code,
                &[vault_bump],
            ];

            // Close vault token account, any remaining tokens + rent goes to admin
            let cpi_accounts = anchor_spl::token::CloseAccount {
                account: vault_token_account.to_account_info(),
                destination: self.admin.to_account_info(),
                authority: self.vault.to_account_info(),
            };

            let signer = &[&vault_seeds[..]];

            let cpi_ctx = CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                cpi_accounts,
                signer,
            );

            anchor_spl::token::close_account(cpi_ctx)?;
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
