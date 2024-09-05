use anchor_lang::prelude::*;

use crate::errors::ErrorCode;
use crate::Game;

#[derive(Accounts)]
pub struct EndGame<'info> {
    #[account(
        mut,
        constraint = admin.key() == game.admin @ ErrorCode::InvalidAdmin
    )]
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [b"game", game.admin.as_ref(), game.game_code.as_bytes()],
        bump = game.bump
    )]
    pub game: Account<'info, Game>,
    #[account(
        seeds = [b"vault", admin.key().as_ref(), game.game_code.as_bytes()],
        bump,
    )]
    pub vault: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> EndGame<'info> {
    pub fn end_game(&mut self) -> Result<()> {
        // identify_winners by most correct answers - if there is a tie then use timestamps
        // calculate commissions which is game.commission as a percentage of the pool and a 1% fee for the treasury
        // calculate player payouts - pool - commissions / number of winners
        // pay out winners
        // pay out treasury
        // pay out admin
        // close accounts
        Ok(())
    }
}
