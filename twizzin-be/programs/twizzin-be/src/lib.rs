use anchor_lang::prelude::*;

declare_id!("DPkdxvGPH81zodC8LnSg3xnhEKABSCadE5ifxNWwsQ6Y");

pub mod error;
pub use error::ErrorCode;

pub mod contexts;
pub use contexts::*;

pub mod state;
pub use state::*;

#[program]
pub mod twizzin_be {
    use super::*;

    pub fn init_game(
        ctx: Context<InitGame>,
        fee: u16,
        start_time: u64,
        end_time: u64,
    ) -> Result<()> {
        ctx.accounts
            .init_game(fee, start_time, end_time, &ctx.bumps)
    }
    // FUNCTIONS
    // join_game by player
    // submit guesses by player
    // end_game by escrow? - how do I trigger this?
    // identify_winners
    // calculate_payout
    // calculate_treasury
    // pay_winners
    // pay_treasury
    // close accounts (vault, escrow, players, game state)? close all of these?
    // who do we payout when closing accounts? Is it cheap and dirty to pay the treasury?
}
