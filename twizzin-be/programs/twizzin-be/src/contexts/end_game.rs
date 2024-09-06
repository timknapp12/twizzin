use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke_signed, pubkey::Pubkey, system_instruction};
use anchor_lang::system_program::{transfer, Transfer};

use crate::errors::ErrorCode;
use crate::state::game::PlayerEntry;
use crate::state::ProgramConfig;
use crate::utils::{calculate_payout::calculate_payout, find_winners::find_winners};
use crate::Game;

#[event]
pub struct WinnerPaid {
    pub winner: Pubkey,
    pub amount: u64,
}

#[event]
pub struct AdminPaid {
    pub admin: Pubkey,
    pub amount: u64,
}

#[event]
pub struct TreasuryPaid {
    pub treasury: Pubkey,
    pub amount: u64,
}

#[derive(Accounts)]
pub struct EndGame<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [b"game", game.admin.as_ref(), game.game_code.as_bytes()],
        bump = game.bump,
        close = admin
    )]
    pub game: Account<'info, Game>,
    #[account(
        mut,
        seeds = [b"vault", admin.key().as_ref(), game.game_code.as_bytes()],
        bump = game.vault_bump,
    )]
    pub vault: SystemAccount<'info>,
    #[account(
        mut,
        seeds = [b"config", admin.key().as_ref(), game.game_code.as_bytes()],
        bump,
        close = admin
    )]
    pub config: Account<'info, ProgramConfig>,
    pub system_program: Program<'info, System>,
    /// CHECK: This account is not read or written, just used for transferring funds
    #[account(
        mut,
        constraint = treasury.key() == config.treasury_pubkey @ ErrorCode::InvalidTreasury
    )]
    pub treasury: UncheckedAccount<'info>,
}

impl<'info> EndGame<'info> {
    pub fn end_game(&mut self) -> Result<(Vec<PlayerEntry>, Vec<PlayerEntry>, u64, u64)> {
        let pool = self.vault.lamports();
        let (sorted_players, winners) = find_winners(&self.game);
        let winners_count = winners.len() as u8;

        let commission_percent = self.game.commission;
        let (_, commission_amount, payout_per_winner) =
            calculate_payout(pool, commission_percent, winners_count);

        // Pay out winners
        for winner in &winners {
            self.pay_winner(&winner.player, payout_per_winner)?;
        }

        // Pay admin
        self.pay_admin(commission_amount)?;

        // Pay remaining balance to treasury
        self.pay_treasury()?;

        // Return sorted players and winners
        Ok((
            sorted_players,
            winners,
            commission_amount,
            payout_per_winner,
        ))
    }

    fn pay_winner(&self, winner_pubkey: &Pubkey, amount: u64) -> Result<()> {
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"vault",
            self.admin.key.as_ref(),
            self.game.game_code.as_bytes(),
            &[self.game.vault_bump],
        ]];

        let ix = system_instruction::transfer(&self.vault.key(), winner_pubkey, amount);

        invoke_signed(
            &ix,
            &[
                self.vault.to_account_info(),
                self.system_program.to_account_info(),
            ],
            signer_seeds,
        )?;

        emit!(WinnerPaid {
            winner: *winner_pubkey,
            amount,
        });

        msg!("Paid {} lamports to winner {}", amount, winner_pubkey);
        Ok(())
    }

    fn pay_admin(&self, amount: u64) -> Result<()> {
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"vault",
            self.admin.key.as_ref(),
            self.game.game_code.as_bytes(),
            &[self.game.vault_bump],
        ]];

        let cpi_ctx = CpiContext::new_with_signer(
            self.system_program.to_account_info(),
            Transfer {
                from: self.vault.to_account_info(),
                to: self.admin.to_account_info(),
            },
            signer_seeds,
        );

        transfer(cpi_ctx, amount)?;

        emit!(AdminPaid {
            admin: self.admin.key(),
            amount,
        });

        msg!("Paid {} lamports to admin", amount);
        Ok(())
    }

    fn pay_treasury(&self) -> Result<()> {
        let remaining_balance = self.vault.lamports();
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"vault",
            self.admin.key.as_ref(),
            self.game.game_code.as_bytes(),
            &[self.game.vault_bump],
        ]];

        let cpi_ctx = CpiContext::new_with_signer(
            self.system_program.to_account_info(),
            Transfer {
                from: self.vault.to_account_info(),
                to: self.treasury.to_account_info(),
            },
            signer_seeds,
        );

        transfer(cpi_ctx, remaining_balance)?;

        emit!(TreasuryPaid {
            treasury: self.config.treasury_pubkey,
            amount: remaining_balance,
        });

        msg!(
            "Paid remaining {} lamports to treasury {}",
            remaining_balance,
            self.config.treasury_pubkey
        );
        Ok(())
    }
}
