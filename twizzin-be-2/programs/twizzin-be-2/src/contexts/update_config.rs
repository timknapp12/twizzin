use crate::errors::ErrorCode;
use crate::state::config::ProgramConfig;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config"],
        bump,
        constraint = authority.key() == config.authority_pubkey @ ErrorCode::InvalidAuthority
    )]
    pub config: Account<'info, ProgramConfig>,
}

impl<'info> UpdateConfig<'info> {
    pub fn update_config(
        &mut self,
        new_treasury: Option<Pubkey>,
        new_treasury_fee: Option<u16>,
    ) -> Result<()> {
        // Validate fee if provided
        if let Some(fee) = new_treasury_fee {
            require!(fee <= 1000, ErrorCode::TreasuryFeeTooHigh);
            self.config.treasury_fee = fee;
            msg!("Treasury fee updated to: {}bps", fee);
        }

        // Validate and update treasury if provided
        if let Some(treasury) = new_treasury {
            require!(
                !treasury.eq(&Pubkey::default()),
                ErrorCode::TreasuryAddressBlank
            );
            self.config.treasury_pubkey = treasury;
            msg!("Treasury updated to: {}", treasury);
        }

        Ok(())
    }
}
