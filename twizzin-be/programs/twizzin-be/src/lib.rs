use anchor_lang::prelude::*;

declare_id!("ALQmwhCJVQk3rDu85aVfKTmujDax8uTdZ3HRKnjPVPxg");

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

    pub fn init_config(ctx: Context<InitConfig>, treasury_pubkey: Pubkey) -> Result<()> {
        ctx.accounts.init_config(treasury_pubkey)
    }

    pub fn init_game(
        ctx: Context<InitGame>,
        name: String,
        entry_fee: u64,
        commission: u8,
        game_code: String,
        start_time: i64,
        end_time: i64,
        max_winners: u8,
        answers: Vec<AnswerInput>,
    ) -> Result<()> {
        ctx.accounts.init_game(
            name,
            entry_fee,
            commission,
            game_code,
            start_time,
            end_time,
            max_winners,
            answers,
            &ctx.bumps,
        )
    }

    pub fn update_game(
        ctx: Context<UpdateGame>,
        name: Option<String>,
        entry_fee: Option<u64>,
        commission: Option<u8>,
        start_time: Option<i64>,
        end_time: Option<i64>,
        max_winners: Option<u8>,
        answers: Option<Vec<AnswerInput>>,
    ) -> Result<()> {
        ctx.accounts.update_game(
            name,
            entry_fee,
            commission,
            start_time,
            end_time,
            max_winners,
            answers,
        )
    }

    pub fn add_player(ctx: Context<AddPlayer>, game_code: String) -> Result<()> {
        ctx.accounts.add_player(game_code)
    }

    // this happens when a player submits their guesses
    pub fn update_player(
        ctx: Context<UpdatePlayer>,
        guesses: Vec<AnswerInput>,
        end_time: i64,
    ) -> Result<()> {
        ctx.accounts.update_player(guesses, end_time)
    }

    pub fn end_game<'info>(
        ctx: Context<'_, '_, '_, 'info, EndGame<'info>>,
    ) -> Result<(Vec<PlayerEntry>, Vec<PlayerEntry>, u64, u64)> {
        ctx.accounts.end_game(&ctx.remaining_accounts)
    }
}
