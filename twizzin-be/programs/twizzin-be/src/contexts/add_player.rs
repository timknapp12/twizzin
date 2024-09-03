use anchor_lang::{
    prelude::*,
    system_program::{transfer, Transfer},
};

use crate::errors::ErrorCode;
use crate::state::{Game, PlayerEntry};

#[derive(Accounts)]
pub struct AddPlayer<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(
        mut,
        seeds = [b"game", game.admin.as_ref(), game.game_code.as_bytes()],
        bump = game.bump
    )]
    pub game: Account<'info, Game>,
    #[account(
        mut,
        seeds = [b"vault", game.admin.as_ref(), game.game_code.as_bytes()],
        bump = game.vault_bump,
    )]
    pub vault: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> AddPlayer<'info> {
    pub fn add_player(&mut self, game_code: String) -> Result<()> {
        require!(self.game.game_code == game_code, ErrorCode::InvalidGameCode);

        // Check if player is already registered
        if self
            .game
            .players
            .iter()
            .any(|entry| entry.player == self.player.key())
        {
            msg!("Player already registered to the game");
            return Ok(());
        }

        // Transfer entry fee
        let cpi_context = CpiContext::new(
            self.system_program.to_account_info(),
            Transfer {
                from: self.player.to_account_info(),
                to: self.vault.to_account_info(),
            },
        );
        transfer(cpi_context, self.game.entry_fee)?;

        // Reallocate space for new player
        self.realloc(PlayerEntry::INIT_SPACE)?;

        // Add player to the game
        self.game.players.push(PlayerEntry {
            player: self.player.key(),
            num_correct: 0,
            player_end_time: 0,
        });
        msg!("Player successfully added to the game");
        Ok(())
    }

    pub fn realloc(&self, space_to_add: usize) -> Result<()> {
        msg!("Reallocating account size to add player to the game");
        let account_info = self.game.to_account_info();
        let new_account_size = account_info.data_len() + space_to_add;

        // Determine additional rent required
        let rent = Rent::get()?;
        let lamports_required = rent.minimum_balance(new_account_size);
        let additional_rent_to_fund = lamports_required.saturating_sub(account_info.lamports());

        msg!(
            "Adding a new player has the cost of {:?} SOL",
            additional_rent_to_fund
        );

        // Perform transfer of additional rent
        if additional_rent_to_fund > 0 {
            let cpi_context = CpiContext::new(
                self.system_program.to_account_info(),
                Transfer {
                    from: self.player.to_account_info(),
                    to: account_info.clone(),
                },
            );
            transfer(cpi_context, additional_rent_to_fund)?;
        }

        // Reallocate the space on GAME account
        account_info.realloc(new_account_size, false)?;
        msg!("Account Size Updated");

        Ok(())
    }
}
