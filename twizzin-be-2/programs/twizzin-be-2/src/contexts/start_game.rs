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
    pub fn start_game(&mut self) -> Result<()> {
        let game = &mut self.game;
        let current_time = Clock::get()?.unix_timestamp * 1000;

        // Update the start time to current time
        game.start_time = current_time;

        // Emit the game started event
        emit!(GameStarted {
            admin: self.admin.key(),
            game: self.game.key(),
            start_time: current_time,
        });

        Ok(())
    }
}
