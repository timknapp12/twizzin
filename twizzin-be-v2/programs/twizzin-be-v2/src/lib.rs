use anchor_lang::prelude::*;

declare_id!("6tssgoTwAU88td3wXkj2xFj8Q2QpfsBsBGK4HJxrwhYs");

pub mod contexts;
pub use contexts::*;

pub mod state;
pub use state::*;

#[program]
pub mod twizzin_be_v2 {
    use super::*;

    pub fn init_config(ctx: Context<InitConfig>, treasury_pubkey: Pubkey) -> Result<()> {
        ctx.accounts.init_config(treasury_pubkey)
    }
}
