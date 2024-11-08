use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};
use std::str::FromStr;

use crate::errors::ErrorCode;
use crate::state::{Game, GameCreated, MAX_GAME_CODE_LENGTH, MAX_NAME_LENGTH};

#[derive(Accounts)]
#[instruction(
    name: String,
    game_code: String,
    entry_fee: u64,
    commission: u8,
    start_time: i64,
    end_time: i64,
    max_winners: u8,
    donation_amount: u64
)]
pub struct InitGame<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = Game::INIT_SPACE,
        seeds = [b"game", admin.key().as_ref(), game_code.as_bytes()],
        bump
    )]
    pub game: Account<'info, Game>,

    pub token_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = admin,
        seeds = [b"vault", admin.key().as_ref(), game_code.as_bytes()],
        bump,
        token::mint = token_mint,
        token::authority = game,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = admin_token_account.owner == admin.key(),
        constraint = admin_token_account.mint == token_mint.key()
    )]
    pub admin_token_account: Option<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitGame<'info> {
    pub fn init_game(
        &mut self,
        name: String,
        game_code: String,
        entry_fee: u64,
        commission: u8,
        start_time: i64,
        end_time: i64,
        max_winners: u8,
        answer_hash: [u8; 32],
        donation_amount: u64,
        bumps: &InitGameBumps,
    ) -> Result<()> {
        require!(
            name.len() > 0 && name.len() <= MAX_NAME_LENGTH,
            ErrorCode::NameTooLong
        );
        require!(
            game_code.len() > 0 && game_code.len() <= MAX_GAME_CODE_LENGTH,
            ErrorCode::GameCodeTooLong
        );
        require!(max_winners > 0, ErrorCode::MaxWinnersTooLow);
        require!(start_time < end_time, ErrorCode::InvalidTimeRange);

        // Handle initial donation if provided
        if donation_amount > 0 {
            if self.token_mint.key()
                == Pubkey::from_str("So11111111111111111111111111111111111111112").unwrap()
            {
                // Transfer SOL
                let cpi_context = CpiContext::new(
                    self.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: self.admin.to_account_info(),
                        to: self.vault.to_account_info(),
                    },
                );
                anchor_lang::system_program::transfer(cpi_context, donation_amount)?;
            } else {
                // Transfer SPL tokens
                let admin_token_account = self
                    .admin_token_account
                    .as_ref()
                    .ok_or(ErrorCode::AdminTokenAccountNotProvided)?;

                let transfer_ctx = CpiContext::new(
                    self.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: admin_token_account.to_account_info(),
                        to: self.vault.to_account_info(),
                        authority: self.admin.to_account_info(),
                    },
                );
                anchor_spl::token::transfer(transfer_ctx, donation_amount)?;
            }
        }

        // Emit the event
        emit!(GameCreated {
            admin: self.admin.key(),
            game: self.game.key(),
            name: name.clone(),
            game_code: game_code.clone(),
            entry_fee,
            start_time,
            end_time,
        });

        // Initialize game account
        self.game.set_inner(Game {
            admin: self.admin.key(),
            name,
            game_code,
            token_mint: self.token_mint.key(),
            entry_fee,
            commission,
            bump: bumps.game,
            vault_bump: bumps.vault,
            start_time,
            end_time,
            max_winners,
            total_players: 0,
            answer_hash,
            donation_amount,
        });

        Ok(())
    }
}
