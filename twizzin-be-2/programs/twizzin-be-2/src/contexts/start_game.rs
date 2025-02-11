use crate::errors::ErrorCode;
use crate::state::{Game, GameStarted};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct StartGame<'info> {
    #[account(
        constraint = game.admin == admin.key() @ ErrorCode::InvalidAuthority
    )]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"game", admin.key().as_ref(), game.game_code.as_bytes()],
        bump = game.bump,
    )]
    pub game: Account<'info, Game>,
}

impl<'info> StartGame<'info> {
    pub fn start_game(&mut self, total_time: i64) -> Result<()> {
        // Store the keys before mutating game
        let game_key = self.game.key();
        let admin_key = self.admin.key();

        let game = &mut self.game;
        let current_time = Clock::get()?.unix_timestamp * 1000;

        // Update the start time to current time
        game.start_time = current_time;
        // Calculate end time based on total_time
        game.end_time = current_time + total_time;

        // Use the stored keys in the event
        emit!(GameStarted {
            admin: admin_key,
            game: game_key,
            start_time: current_time,
            end_time: game.end_time,
        });

        Ok(())
    }
}
