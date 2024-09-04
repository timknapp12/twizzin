use anchor_lang::prelude::*;

use crate::errors::ErrorCode;
use crate::{state::Game, utils::hash::hash_with_salt, AnswerInput};

#[derive(Accounts)]
pub struct UpdatePlayer<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(
        mut,
        seeds = [b"game", game.admin.as_ref(), game.game_code.as_bytes()],
        bump = game.bump
    )]
    pub game: Account<'info, Game>,
    pub system_program: Program<'info, System>,
}

impl<'info> UpdatePlayer<'info> {
    pub fn update_player(&mut self, guesses: Vec<AnswerInput>, end_time: u64) -> Result<()> {
        let player_key = self.player.key();
        let correct_answers = self.game.answers.clone();

        // Find the player's entry in the game
        let player_entry = self
            .game
            .players
            .iter_mut()
            .find(|entry| entry.player == player_key)
            .ok_or(ErrorCode::PlayerNotFound)?;

        // Iterate through the guesses and compare with correct answers
        for guess in guesses {
            if let Some(correct_answer) = correct_answers
                .iter()
                .find(|ca| ca.display_order == guess.display_order)
            {
                let guess_hash = hash_with_salt(&guess.answer, &guess.salt);

                // Compare the hashed guess with the correct answer
                if guess_hash == correct_answer.answer {
                    player_entry.num_correct += 1;
                }
            }
        }

        player_entry.player_end_time = end_time;

        Ok(())
    }
}
