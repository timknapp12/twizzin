use anchor_lang::prelude::*;

declare_id!("DPkdxvGPH81zodC8LnSg3xnhEKABSCadE5ifxNWwsQ6Y");

pub mod errors;
pub use errors::ErrorCode;

pub mod contexts;
pub use contexts::*;

pub mod state;
pub use state::*;

pub mod utils;

#[program]
pub mod twizzin_be {
    use super::*;

    // Removed Borsh derive macros
    // #[derive(BorshDeserialize, BorshSerialize)]
    // pub struct InitGame {
    //     // ... struct fields ...
    // }

    pub fn init_game(
        ctx: Context<InitGame>,
        name: String,
        entry_fee: u64,
        commission: u16,
        start_time: u64,
        end_time: u64,
        answers: Vec<(u8, String, String)>,
    ) -> Result<()> {
        ctx.accounts.init_game(
            name, entry_fee, commission, start_time, end_time, answers, &ctx.bumps,
        )
    }

    pub fn add_player(ctx: Context<AddPlayer>) -> Result<()> {
        ctx.accounts.add_player()
    }
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
