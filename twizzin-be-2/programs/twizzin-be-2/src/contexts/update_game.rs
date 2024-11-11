use crate::constants::SOL_ADDRESS;
use crate::errors::ErrorCode;
use crate::state::{Game, GameUpdated, MAX_NAME_LENGTH};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};
use std::str::FromStr;

// game_code and token_mint are immutable and therefore not included in the context
#[derive(Accounts)]
pub struct UpdateGame<'info> {
    #[account(
        constraint = game.admin == admin.key() @ ErrorCode::InvalidAuthority
    )]
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"game", admin.key().as_ref(), game.game_code.as_bytes()],
        bump = game.bump,
    )]
    pub game: Account<'info, Game>,

    #[account(
        mut,
        seeds = [b"vault", admin.key().as_ref(), game.game_code.as_bytes()],
        bump = game.vault_bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = admin_token_account.owner == admin.key(),
        constraint = admin_token_account.mint == token_mint.key()
    )]
    pub admin_token_account: Option<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
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
        new_donation_amount: Option<u64>,
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

        // Handle donation amount changes if provided
        if let Some(new_amount) = new_donation_amount {
            if new_amount != game.donation_amount {
                // Calculate the difference
                let is_native = self.token_mint.key() == Pubkey::from_str(SOL_ADDRESS).unwrap();

                if new_amount > game.donation_amount {
                    // Admin needs to deposit more
                    let additional_amount = new_amount - game.donation_amount;

                    if is_native {
                        // Transfer additional SOL
                        let cpi_context = CpiContext::new(
                            self.system_program.to_account_info(),
                            anchor_lang::system_program::Transfer {
                                from: self.admin.to_account_info(),
                                to: self.vault.to_account_info(),
                            },
                        );
                        anchor_lang::system_program::transfer(cpi_context, additional_amount)?;
                    } else {
                        // Transfer additional SPL tokens
                        let admin_token_account = self
                            .admin_token_account
                            .as_ref()
                            .ok_or(ErrorCode::AdminTokenAccountNotProvided)?;

                        let transfer_ctx = CpiContext::new(
                            self.token_program.to_account_info(),
                            anchor_spl::token::Transfer {
                                from: admin_token_account.to_account_info(),
                                to: self.vault.to_account_info(),
                                authority: self.admin.to_account_info(),
                            },
                        );
                        anchor_spl::token::transfer(transfer_ctx, additional_amount)?;
                    }
                } else {
                    // Vault needs to return tokens to admin
                    let return_amount = game.donation_amount - new_amount;

                    if is_native {
                        // Transfer SOL back to admin
                        let admin_key = self.admin.key();
                        let seeds = &[
                            b"vault",
                            admin_key.as_ref(),
                            game.game_code.as_bytes(),
                            &[game.vault_bump],
                        ];
                        let signer_seeds = &[&seeds[..]];
                        let transfer_ctx = CpiContext::new_with_signer(
                            self.system_program.to_account_info(),
                            anchor_lang::system_program::Transfer {
                                from: self.vault.to_account_info(),
                                to: self.admin.to_account_info(),
                            },
                            signer_seeds,
                        );
                        anchor_lang::system_program::transfer(transfer_ctx, return_amount)?;
                    } else {
                        // Transfer SPL tokens back to admin
                        let admin_token_account = self
                            .admin_token_account
                            .as_ref()
                            .ok_or(ErrorCode::AdminTokenAccountNotProvided)?;

                        let admin_key = self.admin.key();
                        let seeds = &[
                            b"vault",
                            admin_key.as_ref(),
                            game.game_code.as_bytes(),
                            &[game.vault_bump],
                        ];
                        let signer_seeds = &[&seeds[..]];
                        let transfer_ctx = CpiContext::new_with_signer(
                            self.token_program.to_account_info(),
                            anchor_spl::token::Transfer {
                                from: self.vault.to_account_info(),
                                to: admin_token_account.to_account_info(),
                                authority: self.vault.to_account_info(),
                            },
                            signer_seeds,
                        );
                        anchor_spl::token::transfer(transfer_ctx, return_amount)?;
                    }
                }

                // Update the stored donation amount
                game.donation_amount = new_amount;
            }
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
