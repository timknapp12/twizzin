import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { TwizzinBe2 } from '../target/types/twizzin_be_2';
import { expect } from 'chai';
import { SystemProgram, PublicKey } from '@solana/web3.js';

export async function initializeProgramConfig(
  program: Program<TwizzinBe2>,
  provider: anchor.AnchorProvider,
  confirm: (signature: string) => Promise<string>
) {
  console.log('Starting program config initialization test');

  const configKeypair = anchor.web3.Keypair.generate();
  const configPubkey = configKeypair.publicKey;
  const treasuryKeypair = anchor.web3.Keypair.generate();
  const treasuryPubkey = treasuryKeypair.publicKey;
  const authorityPubkey = provider.wallet.publicKey;
  const treasuryFee = 500; // 5.00%

  // Test valid initialization
  console.log('Testing valid initialization...');
  const tx = await program.methods
    .initConfig(treasuryPubkey, authorityPubkey, treasuryFee)
    .accounts({
      admin: provider.wallet.publicKey,
      config: configPubkey,
      systemProgram: SystemProgram.programId,
    })
    .signers([configKeypair])
    .rpc();

  await confirm(tx);

  const configState = await program.account.programConfig.fetch(configPubkey);

  // Basic initialization assertions
  try {
    expect(
      configState.treasuryPubkey.equals(treasuryPubkey),
      'Treasury pubkey should match'
    ).to.be.true;
    expect(
      configState.authorityPubkey.equals(authorityPubkey),
      'Authority pubkey should match'
    ).to.be.true;
    expect(configState.treasuryFee).to.equal(
      treasuryFee,
      'Treasury fee should match'
    );

    console.log('Basic initialization assertions passed');
  } catch (error) {
    console.error('Basic initialization assertions failed:', error);
    throw error;
  }

  // Test invalid treasury fee (> 1000)
  console.log('Testing invalid treasury fee...');
  const invalidFeeKeypair = anchor.web3.Keypair.generate();
  try {
    await program.methods
      .initConfig(
        treasuryPubkey,
        provider.wallet.publicKey,
        1001 // > 10%
      )
      .accounts({
        admin: provider.wallet.publicKey,
        config: invalidFeeKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([invalidFeeKeypair])
      .rpc();
    throw new Error('Should have failed with invalid treasury fee');
  } catch (error) {
    console.log('Invalid fee error received:', error.message);
    expect(error.toString()).to.include('Treasury fee too high');
    console.log('Invalid treasury fee test passed');
  }

  // Test initialization with zero addresses
  console.log('Testing zero address validation...');
  const zeroAddressKeypair = anchor.web3.Keypair.generate();
  try {
    await program.methods
      .initConfig(PublicKey.default, provider.wallet.publicKey, treasuryFee)
      .accounts({
        admin: provider.wallet.publicKey,
        config: zeroAddressKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([zeroAddressKeypair])
      .rpc();
    throw new Error('Should have failed with zero treasury address');
  } catch (error) {
    console.log('Zero address error received:', error.message);
    expect(error.toString()).to.include('Treasury address is blank');
    console.log('Zero address validation test passed');
  }

  // Test double initialization
  console.log('Testing double initialization...');
  try {
    await program.methods
      .initConfig(treasuryPubkey, provider.wallet.publicKey, treasuryFee)
      .accounts({
        admin: provider.wallet.publicKey,
        config: configPubkey,
        systemProgram: SystemProgram.programId,
      })
      .signers([configKeypair])
      .rpc();
    throw new Error('Should have failed with double initialization');
  } catch (error) {
    console.log('Double init error received:', error.message);
    expect(error.toString()).to.include('already in use');
    console.log('Double initialization test passed');
  }

  // Test initialization with non-admin signer
  console.log('Testing non-admin initialization...');
  const nonAdminKeypair = anchor.web3.Keypair.generate();
  const nonAdminConfigKeypair = anchor.web3.Keypair.generate();

  // Airdrop some SOL to the non-admin account
  const airdropSig = await provider.connection.requestAirdrop(
    nonAdminKeypair.publicKey,
    1000000000
  );
  await provider.connection.confirmTransaction({
    signature: airdropSig,
    blockhash: (await provider.connection.getLatestBlockhash()).blockhash,
    lastValidBlockHeight: (
      await provider.connection.getLatestBlockhash()
    ).lastValidBlockHeight,
  });

  let nonAdminError = false;
  try {
    await program.methods
      .initConfig(
        treasuryPubkey,
        provider.wallet.publicKey, // Try to use the wallet's pubkey as authority while signing with non-admin
        treasuryFee
      )
      .accounts({
        admin: nonAdminKeypair.publicKey,
        config: nonAdminConfigKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([nonAdminKeypair, nonAdminConfigKeypair])
      .rpc();
  } catch (error) {
    console.log('Non-admin error received:', error.message);
    nonAdminError = true;
    // The error should occur because admin signer doesn't match the authority_pubkey
    expect(error.toString()).to.include('InvalidAuthority');
  }

  expect(nonAdminError).to.be.true;
  console.log('Non-admin initialization test passed');

  console.log('All program config initialization tests completed successfully');

  return {
    configPubkey,
    treasuryPubkey,
    authorityPubkey,
    treasuryFee,
  };
}
