use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

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
    max_winners: u8
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

    pub token_program: Program<'info, Token>,
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
        bumps: &InitGameBumps,
    ) -> Result<()> {
        // Validations
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

        // Emit the event before initializing the game
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
        });

        Ok(())
    }
}
