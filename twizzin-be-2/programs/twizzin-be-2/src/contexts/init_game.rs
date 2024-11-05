use anchor_lang::prelude::*;

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
    pub fn init_config(&mut self, treasury_pubkey: Pubkey) -> Result<()> {
        self.config.treasury_pubkey = treasury_pubkey;
        Ok(())
    }
}
