use crate::errors::ErrorCode;
use crate::state::{Game, GameUpdated, MAX_NAME_LENGTH};
use anchor_lang::prelude::*;

// game_code and token_mint are immutable and therefore not included in the context
#[derive(Accounts)]
pub struct UpdateGame<'info> {
    #[account(
        constraint = game.admin == admin.key() @ ErrorCode::InvalidAuthority
    )]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"game", admin.key().as_ref(), game.game_code.as_bytes()],
        bump = game.bump,
    )]
    pub game: Account<'info, Game>,
}

impl<'info> UpdateGame<'info> {
    pub fn update_game(
        &mut self,
        new_name: Option<String>,
        new_entry_fee: Option<u64>,
        new_commission: Option<u8>,
        new_start_time: Option<i64>,
        new_end_time: Option<i64>,
        new_max_winners: Option<u8>,
        new_answer_hash: Option<[u8; 32]>,
    ) -> Result<()> {
        let game = &mut self.game;

        // Update name if provided
        if let Some(name) = new_name {
            require!(
                name.len() > 0 && name.len() <= MAX_NAME_LENGTH,
                ErrorCode::NameTooLong
            );
            game.name = name;
        }

        // Update entry fee if provided
        if let Some(entry_fee) = new_entry_fee {
            game.entry_fee = entry_fee;
        }

        // Update commission if provided
        if let Some(commission) = new_commission {
            game.commission = commission;
        }

        // Update time range if either is provided
        let start_time = new_start_time.unwrap_or(game.start_time);
        let end_time = new_end_time.unwrap_or(game.end_time);
        require!(start_time < end_time, ErrorCode::InvalidTimeRange);

        if new_start_time.is_some() {
            game.start_time = start_time;
        }
        if new_end_time.is_some() {
            game.end_time = end_time;
        }

        // Update max winners if provided with enhanced validation
        if let Some(max_winners) = new_max_winners {
            require!(max_winners >= 1, ErrorCode::MaxWinnersTooLow);
            game.max_winners = max_winners;
        }

        // Update answer hash if provided
        if let Some(answer_hash) = new_answer_hash {
            game.answer_hash = answer_hash;
        }

        // Emit update event
        emit!(GameUpdated {
            admin: self.admin.key(),
            game: self.game.key(),
            name: self.game.name.clone(),
            entry_fee: self.game.entry_fee,
            start_time: self.game.start_time,
            end_time: self.game.end_time,
        });

        Ok(())
    }
}
