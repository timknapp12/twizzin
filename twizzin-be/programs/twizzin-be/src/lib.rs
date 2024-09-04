use anchor_lang::prelude::*;

declare_id!("C5gNE451zYDXvyHKgmpAMHHtDmf3SFjDifRnPnFcZwxt");

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

    pub fn update_game(
        ctx: Context<UpdateGame>,
        name: Option<String>,
        entry_fee: Option<u64>,
        commission: Option<u8>,
        start_time: Option<u64>,
        end_time: Option<u64>,
        answers: Option<Vec<AnswerInput>>,
    ) -> Result<()> {
        ctx.accounts
            .update_game(name, entry_fee, commission, start_time, end_time, answers)
    }

    pub fn add_player(ctx: Context<AddPlayer>, game_code: String) -> Result<()> {
        ctx.accounts.add_player(game_code)
    }

    // this happens when a player submits their guesses
    pub fn update_player(
        ctx: Context<UpdatePlayer>,
        guesses: Vec<AnswerInput>,
        end_time: u64,
    ) -> Result<()> {
        ctx.accounts.update_player(guesses, end_time)
    }
    // end_game by escrow? - how do I trigger this?
    // identify_winners
    // calculate_payout
    // calculate_treasury
    // pay_winners
    // pay_treasury
    // close accounts (vault, escrow, players, game state)? close all of these?
    // who do we payout when closing accounts? Is it cheap and dirty to pay the treasury?
}
