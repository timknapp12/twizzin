use anchor_lang::prelude::*;

declare_id!("93NgBAT85EuPQgg1RFC4zFTgE5tNLGyX41excF9XhdDT");

#[program]
pub mod twizzin_be_v2 {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
