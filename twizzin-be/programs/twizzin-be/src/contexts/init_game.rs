use anchor_lang::prelude::*;

use crate::errors::ErrorCode;
use crate::state::Game;

#[derive(Accounts)]
pub struct InitGame<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = Game::INIT_SPACE,
        seeds = [b"game", admin.key().as_ref()],
        bump
    )]
    pub game: Account<'info, Game>,
    #[account(
        seeds = [b"vault", admin.key().as_ref(), game.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitGame<'info> {
    pub fn init_game(
        &mut self,
        name: String,
        entry_fee: u64,
        commission: u16,
        start_time: u64,
        end_time: u64,
        bumps: &InitGameBumps,
    ) -> Result<()> {
        require!(name.len() > 0 && name.len() < 33, ErrorCode::NameTooLong);

        self.game.set_inner(Game {
            admin: self.admin.key(),
            name,
            entry_fee,
            commission,
            bump: bumps.game,
            vault_bump: bumps.vault,
            start_time,
            end_time,
            players: Vec::new(),
            answers: Vec::new(),
        });

        Ok(())
    }
}
