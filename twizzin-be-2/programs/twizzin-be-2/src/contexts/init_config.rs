use crate::constants::PROGRAM_AUTHORITY;
use crate::errors::ErrorCode;
use crate::state::config::ProgramConfig;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitConfig<'info> {
    #[account(
        mut,
        constraint = admin.key() == PROGRAM_AUTHORITY @ ErrorCode::UnauthorizedProgramAuthority
    )]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = ProgramConfig::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, ProgramConfig>,

    pub system_program: Program<'info, System>,
}

impl<'info> InitConfig<'info> {
    pub fn init_config(&mut self, treasury_pubkey: Pubkey, treasury_fee: u16) -> Result<()> {
        // 1000 = 10%
        require!(treasury_fee <= 1000, ErrorCode::TreasuryFeeTooHigh);
        require!(
            !treasury_pubkey.eq(&Pubkey::default()),
            ErrorCode::TreasuryAddressBlank
        );

        self.config.set_inner(ProgramConfig {
            treasury_pubkey,
            authority_pubkey: PROGRAM_AUTHORITY,
            treasury_fee,
        });
        Ok(())
    }
}
