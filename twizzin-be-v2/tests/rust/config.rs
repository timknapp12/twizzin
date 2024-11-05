use anchor_lang::{prelude::*, solana_program::system_program};
use solana_program_test::*;
use solana_sdk::{signature::Keypair, signer::Signer, transaction::Transaction};
use twizzin_be_v2::{constants::*, state::config::ProgramConfig};

mod common;
use common::*;

#[tokio::test]
async fn test_init_config_success() -> Result<()> {
    let mut context = setup_program().await;
    let treasury = Keypair::new();
    let treasury_fee = 100; // 1%

    // Initialize config
    let (config_pda, _) = get_config_pda(&context.program_id);
    
    let tx = Transaction::new_signed_with_payer(
        &[init_config_ix(
            &context.program_id,
            &context.payer.pubkey(),
            &treasury.pubkey(),
            treasury_fee,
        )],
        Some(&context.payer.pubkey()),
        &[&context.payer],
        context.last_blockhash,
    );

    context.banks_client.process_transaction(tx).await?;

    // Verify config account
    let config = get_config_account(&mut context.banks_client, &config_pda).await?;
    assert_eq!(config.authority, context.payer.pubkey());
    assert_eq!(config.treasury, treasury.pubkey());
    assert_eq!(config.treasury_fee, treasury_fee);
    assert!(!config.paused);

    Ok(())
}

#[tokio::test]
async fn test_init_config_invalid_fee() -> Result<()> {
    let mut context = setup_program().await;
    let treasury = Keypair::new();
    let invalid_fee = MAX_TREASURY_FEE_BPS + 1;

    let tx = Transaction::new_signed_with_payer(
        &[init_config_ix(
            &context.program_id,
            &context.payer.pubkey(),
            &treasury.pubkey(),
            invalid_fee,
        )],
        Some(&context.payer.pubkey()),
        &[&context.payer],
        context.last_blockhash,
    );

    let err = context.banks_client.process_transaction(tx).await.unwrap_err();
    assert_custom_error!(err, ErrorCode::InvalidFee);

    Ok(())
}

#[tokio::test]
async fn test_init_config_already_initialized() -> Result<()> {
    let mut context = setup_program().await;
    let treasury = Keypair::new();
    let treasury_fee = 100;

    // First initialization
    let tx = Transaction::new_signed_with_payer(
        &[init_config_ix(
            &context.program_id,
            &context.payer.pubkey(),
            &treasury.pubkey(),
            treasury_fee,
        )],
        Some(&context.payer.pubkey()),
        &[&context.payer],
        context.last_blockhash,
    );

    context.banks_client.process_transaction(tx).await?;

    // Try to initialize again
    let tx = Transaction::new_signed_with_payer(
        &[init_config_ix(
            &context.program_id,
            &context.payer.pubkey(),
            &treasury.pubkey(),
            treasury_fee,
        )],
        Some(&context.payer.pubkey()),
        &[&context.payer],
        context.last_blockhash,
    );

    let err = context.banks_client.process_transaction(tx).await.unwrap_err();
    assert_custom_error!(err, ErrorCode::ConfigAlreadyInitialized);

    Ok(())
}

// anchor test --skip-lint