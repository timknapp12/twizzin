use anchor_lang::prelude::*;

declare_id!("35V3AqBVBuUVczUxULiZ7eoXbCwVZcNZAN4otDeD4K2F");

pub mod contexts;
pub use contexts::*;

pub mod constants;
pub mod errors;
pub mod state;
pub mod utils;

use crate::state::AnswerInput;

#[program]
pub mod twizzin_be_2 {
    use super::*;

    pub fn init_config(
        ctx: Context<InitConfig>,
        treasury_pubkey: Pubkey,
        authority_pubkey: Pubkey,
        treasury_fee: u16,
    ) -> Result<()> {
        ctx.accounts
            .init_config(treasury_pubkey, authority_pubkey, treasury_fee)
    }

    pub fn update_config(
        ctx: Context<UpdateConfig>,
        new_treasury: Option<Pubkey>,
        new_treasury_fee: Option<u16>,
    ) -> Result<()> {
        ctx.accounts.update_config(new_treasury, new_treasury_fee)
    }

    pub fn init_game(
        ctx: Context<InitGame>,
        name: String,
        game_code: String,
        entry_fee: u64,
        commission: u16,
        start_time: i64,
        end_time: i64,
        max_winners: u8,
        answer_hash: [u8; 32],
        donation_amount: u64,
        all_are_winners: bool,
        even_split: bool,
    ) -> Result<()> {
        ctx.accounts.init_game(
            name,
            game_code,
            entry_fee,
            commission,
            start_time,
            end_time,
            max_winners,
            answer_hash,
            donation_amount,
            all_are_winners,
            even_split,
            &ctx.bumps,
        )
    }

    pub fn update_game(
        ctx: Context<UpdateGame>,
        new_name: Option<String>,
        new_entry_fee: Option<u64>,
        new_commission: Option<u16>,
        new_start_time: Option<i64>,
        new_end_time: Option<i64>,
        new_max_winners: Option<u8>,
        new_answer_hash: Option<[u8; 32]>,
        new_donation_amount: Option<u64>,
        new_all_are_winners: Option<bool>,
        new_even_split: Option<bool>,
    ) -> Result<()> {
        ctx.accounts.update_game(
            new_name,
            new_entry_fee,
            new_commission,
            new_start_time,
            new_end_time,
            new_max_winners,
            new_answer_hash,
            new_donation_amount,
            new_all_are_winners,
            new_even_split,
        )
    }

    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        ctx.accounts.join_game(&ctx.bumps)
    }

    pub fn start_game(ctx: Context<StartGame>) -> Result<()> {
        ctx.accounts.start_game()
    }

    pub fn submit_answers(
        ctx: Context<SubmitAnswers>,
        answers: Vec<AnswerInput>,
        client_finish_time: i64,
    ) -> Result<()> {
        ctx.accounts.submit_answers(answers, client_finish_time)
    }

    pub fn end_game(ctx: Context<EndGame>) -> Result<()> {
        ctx.accounts.end_game()
    }

    pub fn declare_winners<'info>(
        ctx: Context<'_, '_, 'info, 'info, DeclareWinners<'info>>,
        winner_pubkeys: Vec<Pubkey>,
    ) -> Result<()> {
        let remaining_accounts: &'info [AccountInfo<'info>] = ctx.remaining_accounts;
        ctx.accounts
            .declare_winners(winner_pubkeys, &ctx.bumps, remaining_accounts)
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        ctx.accounts.claim()
    }

    pub fn close_game(ctx: Context<CloseGame>) -> Result<()> {
        ctx.accounts.close_game()
    }

    pub fn close_player_account(ctx: Context<ClosePlayerAccount>) -> Result<()> {
        ctx.accounts.close_player_account()
    }
}
