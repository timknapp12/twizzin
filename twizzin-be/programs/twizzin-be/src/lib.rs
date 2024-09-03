use anchor_lang::prelude::*;

declare_id!("8uqVcDqy6CSS9Ss8VYpPWD5J8daQy3BvsAecQ64DgFAR");

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

    pub fn init_game(
        ctx: Context<InitGame>,
        name: String,
        entry_fee: u64,
        commission: u8,
        game_code: String,
        start_time: u64,
        end_time: u64,
        answers: Vec<AnswerInput>,
    ) -> Result<()> {
        ctx.accounts.init_game(
            name, entry_fee, commission, game_code, start_time, end_time, answers, &ctx.bumps,
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
