use anchor_lang::prelude::*;

use crate::errors::ErrorCode;
use crate::state::Game;
use crate::utils::hash::hash_answers;
use crate::{AnswerInput, CorrectAnswers};

#[derive(Accounts)]
#[instruction(name: String, entry_fee: u64, commission: u8, game_code: String, start_time: u64, end_time: u64, answers: Vec<AnswerInput>)]
pub struct InitGame<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = Game::INIT_SPACE + (answers.len() * CorrectAnswers::INIT_SPACE),
        seeds = [b"game", admin.key().as_ref(), game_code.as_bytes()],
        bump
    )]
    pub game: Account<'info, Game>,
    #[account(
        seeds = [b"vault", admin.key().as_ref(), game_code.as_bytes()],
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
        commission: u8,
        game_code: String,
        start_time: u64,
        end_time: u64,
        answers: Vec<AnswerInput>, // display_order, correct_answer, question_id as salt
        bumps: &InitGameBumps,
    ) -> Result<()> {
        require!(name.len() > 0 && name.len() < 33, ErrorCode::NameTooLong);

        let hashed_answers = hash_answers(answers);

        self.game.set_inner(Game {
            admin: self.admin.key(),
            name,
            entry_fee,
            commission,
            game_code,
            bump: bumps.game,
            vault_bump: bumps.vault,
            start_time,
            end_time,
            players: Vec::new(),
            answers: hashed_answers,
        });

        Ok(())
    }
}
