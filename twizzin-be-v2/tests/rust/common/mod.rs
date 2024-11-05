use anchor_lang::{prelude::*, solana_program::system_program};
use solana_program_test::*;
use solana_sdk::{
    signature::Keypair,
    signer::Signer,
    instruction::{Instruction, AccountMeta},
    transaction::Transaction,
};
use twizzin_be_v2::{constants::*, state::config::ProgramConfig};

pub struct TestContext {
    pub banks_client: BanksClient,
    pub payer: Keypair,
    pub last_blockhash: Hash,
    pub program_id: Pubkey,
}

impl TestContext {
    pub async fn new() -> Self {
        let program_id = Pubkey::new_unique();
        let mut program_test = ProgramTest::new(
            "twizzin_be_v2",
            program_id,
            processor!(twizzin_be_v2::entry),
        );

        let (banks_client, payer, recent_blockhash) = program_test.start().await;

        Self {
            banks_client,
            payer,
            last_blockhash: recent_blockhash,
            program_id,
        }
    }

    pub async fn process_transaction(
        &mut self,
        instructions: Vec<Instruction>,
        signers: Vec<&Keypair>,
    ) -> Result<()> {
        let mut tx = Transaction::new_with_payer(
            &instructions,
            Some(&self.payer.pubkey()),
        );
        tx.sign(&signers, self.last_blockhash);
        self.banks_client.process_transaction(tx).await?;
        Ok(())
    }

    pub async fn get_account(&mut self, address: Pubkey) -> Result<Option<Account>> {
        self.banks_client.get_account(address).await
    }
}

pub mod assertions {
    use super::*;
    use solana_sdk::transaction::TransactionError;
    use solana_program::instruction::InstructionError;

    pub fn assert_custom_error<T>(
        result: Result<T, TransactionError>,
        expected_error: u32
    ) {
        match result {
            Err(TransactionError::InstructionError(_, InstructionError::Custom(error))) => {
                assert_eq!(error, expected_error);
            }
            _ => panic!("Expected custom error {}", expected_error),
        }
    }
}

pub mod instructions {
    use super::*;

    pub fn init_config(
        program_id: &Pubkey,
        authority: &Pubkey,
        treasury: &Pubkey,
        treasury_fee: u16,
    ) -> Instruction {
        let (config_pda, _) = get_config_pda(program_id);

        Instruction::new_with_borsh(
            *program_id,
            &twizzin_be_v2::instruction::InitConfig {
                treasury: *treasury,
                treasury_fee,
            },
            vec![
                AccountMeta::new(*authority, true),
                AccountMeta::new(config_pda, false),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
        )
    }
}

pub mod pdas {
    use super::*;

    pub fn get_config_pda(program_id: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(&[CONFIG_SEED], program_id)
    }
}