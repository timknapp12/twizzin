use anchor_lang::prelude::*;

use crate::errors::ErrorCode;
use crate::state::config::ProgramConfig;
#[derive(Accounts)]
pub struct InitConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = ProgramConfig::INIT_SPACE,
    )]
    pub config: Account<'info, ProgramConfig>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitConfig<'info> {
    pub fn init_config(
        &mut self,
        treasury_pubkey: Pubkey,
        authority_pubkey: Pubkey,
        treasury_fee: u16,
    ) -> Result<()> {
        // Verify the admin is the expected authority
        require!(
            self.admin.key() == authority_pubkey,
            ErrorCode::InvalidAuthority
        );

        // 1000 = 10%
        require!(treasury_fee <= 1000, ErrorCode::TreasuryFeeTooHigh);
        require!(
            !treasury_pubkey.eq(&Pubkey::default()),
            ErrorCode::TreasuryAddressBlank
        );
        require!(
            !authority_pubkey.eq(&Pubkey::default()),
            ErrorCode::AuthorityAddressBlank
        );
        self.config.set_inner(ProgramConfig {
            treasury_pubkey,
            authority_pubkey,
            treasury_fee,
        });
        Ok(())
    }
}
