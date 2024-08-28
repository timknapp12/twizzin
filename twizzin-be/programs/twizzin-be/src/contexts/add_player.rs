use anchor_lang::prelude::*;

use crate::state::Game;

#[derive(Accounts)]
pub struct AddPlayer<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    pub game: Account<'info, Game>,
}

impl<'info> AddPlayer<'info> {
    pub fn add_player(&mut self) -> Result<()> {
        Ok(())
    }
}
