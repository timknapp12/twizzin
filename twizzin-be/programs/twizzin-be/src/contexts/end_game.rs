use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke_signed, pubkey::Pubkey, system_instruction};
use anchor_lang::system_program::{transfer, Transfer};

use crate::errors::ErrorCode;
use crate::state::{game::PlayerEntry, ProgramConfig};
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
    #[account()]
    pub config: Account<'info, ProgramConfig>,
    #[account(
        mut,
        constraint = treasury.key() == config.treasury_pubkey @ ErrorCode::InvalidTreasury
    )]
    /// CHECK: This account is used for transferring funds
    pub treasury: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> EndGame<'info> {
    pub fn end_game(
        &mut self,
        remaining_accounts: &[AccountInfo<'info>],
    ) -> Result<(Vec<PlayerEntry>, Vec<PlayerEntry>, u64, u64)> {
        let pool = self.vault.lamports();
        let (sorted_players, winners) = find_winners(&self.game);
        let winners_count = winners.len() as u8;

        let commission_percent = self.game.commission;
        let (_, commission_amount, payout_per_winner) =
            calculate_payout(pool, commission_percent, winners_count);

        // Pay out winners
        for winner in winners.iter() {
            if let Some(winner_account) = remaining_accounts
                .iter()
                .find(|acc| acc.key() == winner.player)
            {
                self.pay_winner(winner_account, payout_per_winner)?;
            }
        }

        self.pay_admin(commission_amount)?;
        self.pay_treasury_and_close_vault()?;

        Ok((
            sorted_players,
            winners,
            commission_amount,
            payout_per_winner,
        ))
    }

    fn pay_winner(&self, winner_account: &AccountInfo<'info>, amount: u64) -> Result<()> {
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"vault",
            self.admin.key.as_ref(),
            self.game.game_code.as_bytes(),
            &[self.game.vault_bump],
        ]];
        // we don't use Anchor's Transfer, but solana primitives because we don't pass in known accounts of winners, since the program does it automatically
        let ix = system_instruction::transfer(&self.vault.key(), &winner_account.key(), amount);

        invoke_signed(
            &ix,
            &[
                self.vault.to_account_info(),
                winner_account.clone(),
                self.system_program.to_account_info(),
            ],
            signer_seeds,
        )?;

        emit!(WinnerPaid {
            winner: *winner_account.key,
            amount,
        });

        msg!("Paid {} lamports to winner {}", amount, winner_account.key);
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

    fn pay_treasury_and_close_vault(&self) -> Result<()> {
        let vault_balance = self.vault.lamports();

        if vault_balance > 0 {
            let signer_seeds: &[&[&[u8]]] = &[&[
                b"vault",
                self.admin.key.as_ref(),
                self.game.game_code.as_bytes(),
                &[self.game.vault_bump],
            ]];

            // Transfer entire balance to treasury, which is 1% of pool minus tx fees
            let cpi_ctx = CpiContext::new_with_signer(
                self.system_program.to_account_info(),
                Transfer {
                    from: self.vault.to_account_info(),
                    to: self.treasury.to_account_info(),
                },
                signer_seeds,
            );

            transfer(cpi_ctx, vault_balance)?;

            emit!(TreasuryPaid {
                treasury: self.treasury.key(),
                amount: vault_balance,
            });

            msg!(
                "Vault closed. {} lamports transferred to treasury",
                vault_balance
            );
        } else {
            msg!("Vault already empty");
        }

        Ok(())
    }
}
