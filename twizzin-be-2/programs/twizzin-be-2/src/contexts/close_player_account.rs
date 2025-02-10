use crate::errors::ErrorCode;
use crate::state::{Game, PlayerAccount, PlayerAccountClosed, Winners};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ClosePlayerAccount<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        seeds = [b"game", game.admin.as_ref(), game.game_code.as_bytes()],
        bump = game.bump,
        constraint = Clock::get()?.unix_timestamp * 1000 >= game.end_time @ ErrorCode::GameNotEnded,
    )]
    pub game: Account<'info, Game>,

    // Optional winners account - only needed if checking if player was a winner
    #[account(
        seeds = [b"winners", game.key().as_ref()],
        bump,
    )]
    pub winners: Option<Account<'info, Winners>>,

    #[account(
        mut,
        seeds = [
            b"player",
            game.key().as_ref(),
            player.key().as_ref()
        ],
        bump = player_account.bump,
        constraint = player_account.player == player.key() @ ErrorCode::InvalidPlayer,
        constraint = verify_can_close(&winners, &player.key()) @ ErrorCode::CannotCloseWinnerAccount,
        close = player
    )]
    pub player_account: Account<'info, PlayerAccount>,

    pub system_program: Program<'info, System>,
}

impl<'info> ClosePlayerAccount<'info> {
    pub fn close_player_account(&mut self) -> Result<()> {
        // Account closure and rent refund is handled automatically by close = player
        emit!(PlayerAccountClosed {
            game: self.game.key(),
            player: self.player.key(),
        });
        Ok(())
    }
}

// Helper function to verify if a player can close their account
// Returns true if:
// 1. No winners account exists yet (game still ongoing or not declared) OR
// 2. Player is not in winners list OR
// 3. Player is in winners list and has already claimed
fn verify_can_close(winners: &Option<Account<Winners>>, player: &Pubkey) -> bool {
    if let Some(winners_acc) = winners {
        // If winners are declared, only allow if player isn't a winner or has claimed
        match winners_acc.winners.iter().find(|w| &w.player == player) {
            Some(winner_info) => winner_info.claimed,
            None => true, // Not a winner, can close
        }
    } else {
        true // No winners declared yet, can close
    }
}
