use anchor_lang::prelude::*;

use crate::errors::ErrorCode;
use crate::utils::hash::hash_answers;
use crate::{state::Game, AnswerInput};

#[derive(Accounts)]
pub struct UpdateGame<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [b"game", game.admin.as_ref(), game.game_code.as_bytes()],
        bump = game.bump
    )]
    pub game: Account<'info, Game>,
    pub system_program: Program<'info, System>,
}

impl<'info> UpdateGame<'info> {
    pub fn update_game(
        &mut self,
        name: Option<String>,
        entry_fee: Option<u64>,
        commission: Option<u8>,
        start_time: Option<i64>,
        end_time: Option<i64>,
        max_winners: Option<u8>,
        answers: Option<Vec<AnswerInput>>,
        // game_code is not allowed to be updated
    ) -> Result<()> {
        require!(self.game.admin == self.admin.key(), ErrorCode::NotAdmin);
        if let Some(ref name) = name {
            require!(name.len() > 0 && name.len() < 33, ErrorCode::NameTooLong);
        }

        if let Some(name) = name {
            self.game.name = name;
        }
        if let Some(entry_fee) = entry_fee {
            self.game.entry_fee = entry_fee;
        }
        if let Some(commission) = commission {
            self.game.commission = commission;
        }
        if let Some(start_time) = start_time {
            self.game.start_time = start_time;
        }
        if let Some(end_time) = end_time {
            self.game.end_time = end_time;
        }
        if let Some(max_winners) = max_winners {
            require!(
                max_winners > 0 && max_winners < 11,
                ErrorCode::MaxWinnersTooHigh
            );
            self.game.max_winners = max_winners;
        }
        if let Some(answers) = answers {
            if answers.len() != self.game.answers.len() {
                let new_space =
                    Game::INIT_SPACE + (answers.len() * crate::CorrectAnswers::INIT_SPACE);

                let rent = Rent::get()?;
                let new_minimum_balance = rent.minimum_balance(new_space);
                let lamports_diff =
                    new_minimum_balance.saturating_sub(self.game.to_account_info().lamports());

                if lamports_diff > 0 {
                    anchor_lang::solana_program::program::invoke(
                        &anchor_lang::solana_program::system_instruction::transfer(
                            &self.admin.key(),
                            &self.game.key(),
                            lamports_diff,
                        ),
                        &[
                            self.admin.to_account_info(),
                            self.game.to_account_info(),
                            self.system_program.to_account_info(),
                        ],
                    )?;
                }

                self.game.to_account_info().realloc(new_space, false)?;
            }
            let hashed_answers = hash_answers(answers);
            self.game.answers = hashed_answers;
        }

        Ok(())
    }
}
