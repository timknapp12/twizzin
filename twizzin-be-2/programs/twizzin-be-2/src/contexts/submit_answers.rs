use crate::errors::ErrorCode;
use crate::state::{AnswerInput, AnswersSubmitted, Game, PlayerAccount};
use crate::utils::merkle::{create_leaf_hash, verify_merkle_proof};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct SubmitAnswers<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        seeds = [b"game", game.admin.as_ref(), game.game_code.as_bytes()],
        bump = game.bump
    )]
    pub game: Account<'info, Game>,

    #[account(
        mut,
        seeds = [
            b"player",
            game.key().as_ref(),
            player.key().as_ref()
        ],
        bump = player_account.bump,
        constraint = player_account.player == player.key() @ ErrorCode::InvalidPlayer,
        constraint = player_account.game == game.key() @ ErrorCode::InvalidGame,
        constraint = player_account.finished_time == 0 @ ErrorCode::AlreadySubmitted,
    )]
    pub player_account: Account<'info, PlayerAccount>,

    pub system_program: Program<'info, System>,
}

impl<'info> SubmitAnswers<'info> {
    pub fn submit_answers(
        &mut self,
        answers: Vec<AnswerInput>,
        client_finish_time: i64,
    ) -> Result<()> {
        // Get current time in milliseconds
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp * 1000;

        // Validate client_finish_time
        require!(
            client_finish_time >= self.game.start_time,
            ErrorCode::GameNotStarted
        );
        require!(
            client_finish_time <= self.game.end_time,
            ErrorCode::GameEnded
        );
        // Ensure client_finish_time isn't in the future relative to blockchain time
        require!(
            client_finish_time < current_time,
            ErrorCode::InvalidFinishTime
        );

        // Verify answers and count correct ones
        let mut num_correct = 0;

        for answer in answers.iter() {
            let leaf = create_leaf_hash(answer.display_order, &answer.answer, &answer.question_id);

            if verify_merkle_proof(leaf, &answer.proof, self.game.answer_hash) {
                num_correct += 1;
            }
        }

        // Update player account with client's finish time
        self.player_account.finished_time = client_finish_time;
        self.player_account.num_correct = num_correct;

        // Emit event with client's finish time
        emit!(AnswersSubmitted {
            game: self.game.key(),
            player: self.player.key(),
            num_correct,
            finished_time: client_finish_time,
        });

        Ok(())
    }
}
