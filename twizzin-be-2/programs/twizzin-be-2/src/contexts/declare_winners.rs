use crate::errors::ErrorCode;
use crate::state::{Game, PlayerAccount, WinnerInfo, Winners, WinnersDeclared, MAX_WINNERS};
use crate::utils::prize::calculate_prizes;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(winner_pubkeys: Vec<Pubkey>)]
pub struct DeclareWinners<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
       mut,
       seeds = [b"game", game.admin.as_ref(), game.game_code.as_bytes()],
       bump = game.bump,
       constraint = game.admin == admin.key() @ ErrorCode::InvalidAdmin,
       constraint = Clock::get()?.unix_timestamp * 1000 >= game.end_time @ ErrorCode::GameNotEnded
   )]
    pub game: Account<'info, Game>,

    #[account(
       init,
       payer = admin,
       space = Winners::INIT_SPACE,
       seeds = [b"winners", game.key().as_ref()],
       bump
   )]
    pub winners: Account<'info, Winners>,

    pub system_program: Program<'info, System>,
}

impl<'info> DeclareWinners<'info> {
    pub fn declare_winners(
        &mut self,
        winner_pubkeys: Vec<Pubkey>,
        bumps: &DeclareWinnersBumps,
        remaining_accounts: &'info [AccountInfo<'info>],
    ) -> Result<()> {
        let game = &self.game;

        // Validate winner count based on game settings
        let expected_winners = if game.all_are_winners {
            std::cmp::min(game.total_players as u8, MAX_WINNERS)
        } else {
            std::cmp::min(
                game.max_winners,
                std::cmp::min(game.total_players as u8, MAX_WINNERS),
            )
        };

        require!(
            winner_pubkeys.len() == expected_winners as usize,
            ErrorCode::InvalidWinnerCount
        );

        // Verify we have the correct number of remaining accounts
        require!(
            remaining_accounts.len() == winner_pubkeys.len(),
            ErrorCode::InvalidWinnerCount
        );

        // Check for duplicates
        let mut unique_winners = winner_pubkeys.clone();
        unique_winners.sort();
        unique_winners.dedup();
        require!(
            unique_winners.len() == winner_pubkeys.len(),
            ErrorCode::DuplicateWinner
        );

        let mut prev_score: u8 = u8::MAX;
        let mut prev_time = i64::MIN;

        // Store game key to prevent temporary value issue
        let game_key = game.key();

        // Validate each winner and their ordering
        for (i, (winner_pubkey, account)) in winner_pubkeys
            .iter()
            .zip(remaining_accounts.iter())
            .enumerate()
        {
            // Verify account PDA
            let seeds = &[b"player", game_key.as_ref(), winner_pubkey.as_ref()];
            let (expected_pda, _) = Pubkey::find_program_address(seeds, &crate::ID);
            require!(account.key() == expected_pda, ErrorCode::WinnerNotPlayer);

            // Deserialize and validate player account
            let player = Account::<PlayerAccount>::try_from(account)?;
            require!(player.game == game_key, ErrorCode::WinnerNotPlayer);
            require!(player.player == *winner_pubkey, ErrorCode::WinnerNotPlayer);
            require!(player.finished_time > 0, ErrorCode::PlayerNotFinished);

            // Verify ordering
            if i > 0 {
                require!(
                    (player.num_correct < prev_score)
                        || (player.num_correct == prev_score && player.finished_time > prev_time),
                    ErrorCode::InvalidWinnerOrder
                );
            }

            prev_score = player.num_correct;
            prev_time = player.finished_time;
        }

        // Calculate prizes
        let total_pot = game
            .entry_fee
            .checked_mul(game.total_players as u64)
            .ok_or(ErrorCode::NumericOverflow)?;

        let prizes = calculate_prizes(
            total_pot,
            expected_winners,
            game.even_split,
            game.is_native,
            0, // Rent exemption handled in end_game
        )?;

        // Create winner info entries
        let mut winner_infos = Vec::with_capacity(expected_winners as usize);
        let mut total_prize_pool = 0u64;

        for (i, (pubkey, prize)) in winner_pubkeys.iter().zip(prizes.iter()).enumerate() {
            winner_infos.push(WinnerInfo {
                player: *pubkey,
                rank: (i + 1) as u8,
                prize_amount: *prize,
                claimed: false,
            });
            total_prize_pool = total_prize_pool
                .checked_add(*prize)
                .ok_or(ErrorCode::NumericOverflow)?;
        }

        // Initialize winners account
        self.winners.set_inner(Winners {
            game: game.key(),
            num_winners: expected_winners,
            winners: winner_infos,
            bump: bumps.winners,
        });

        // Emit event
        emit!(WinnersDeclared {
            game: game_key,
            num_winners: expected_winners,
            total_prize_pool,
        });

        Ok(())
    }
}
