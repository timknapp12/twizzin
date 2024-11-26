import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { TwizzinBe2 } from '../target/types/twizzin_be_2';
import { expect } from 'chai';
import { SystemProgram, PublicKey } from '@solana/web3.js';

export async function initializeProgramConfig(
  program: Program<TwizzinBe2>,
  provider: anchor.AnchorProvider,
  confirm: (signature: string) => Promise<string>,
  authorityKeypair: anchor.web3.Keypair
) {
  console.log('Starting program config initialization test');

  // Derive the config PDA
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    program.programId
  );

  const treasuryKeypair = anchor.web3.Keypair.generate();
  const treasuryPubkey = treasuryKeypair.publicKey;
  const authorityPubkey = provider.wallet.publicKey;
  const treasuryFee = 500; // 5.00%

  // Helper function for program method calls
  const executeInitConfig = async (
    treasury: PublicKey,
    authority: PublicKey,
    fee: number,
    admin: PublicKey,
    adminSigner?: anchor.web3.Keypair
  ) => {
    const signers = adminSigner ? [adminSigner] : [];
    return program.methods
      .initConfig(treasury, fee)
      .accounts({
        admin,
        config: configPda,
        systemProgram: SystemProgram.programId,
      })
      .signers(signers)
      .rpc();
  };

  // Helper function for error checking
  const expectError = (error: any, errorTypes: string[]) => {
    const errorString = error.toString();
    const hasExpectedError = errorTypes.some(
      (type) =>
        errorString.includes(
          type.includes('Error Code:') ? type : `Error Code: ${type}`
        ) ||
        errorString.includes(type.includes('0x') ? type : `0x${type}`) ||
        errorString.includes(type)
    );
    expect(
      hasExpectedError,
      `Expected one of [${errorTypes}] but got: ${errorString}`
    ).to.be.true;
  };

  // Test invalid treasury fee
  console.log('Testing invalid treasury fee...');
  try {
    await executeInitConfig(
      treasuryPubkey,
      provider.wallet.publicKey,
      1001, // > 10%
      provider.wallet.publicKey
    );
    throw new Error('Should have failed with invalid treasury fee');
  } catch (error) {
    console.log('Invalid fee error received:', error.message);
    console.log('Error details:', error.toString());
    expectError(error, ['TreasuryFeeTooHigh', '6002', 'Treasury fee too high']);
    console.log('Invalid treasury fee test passed');
  }

  // Test zero treasury address
  console.log('Testing zero address validation...');
  try {
    await executeInitConfig(
      PublicKey.default,
      provider.wallet.publicKey,
      treasuryFee,
      provider.wallet.publicKey
    );
    throw new Error('Should have failed with zero treasury address');
  } catch (error) {
    console.log('Zero address error received:', error.message);
    expectError(error, [
      'TreasuryAddressBlank',
      '6003',
      'Treasury address is blank',
    ]);
    console.log('Zero address validation test passed');
  }

  // Test unauthorized initialization
  console.log('Testing unauthorized initialization...');
  const nonAdminKeypair = anchor.web3.Keypair.generate();

  // Airdrop SOL to unauthorized account
  const airdropSig = await provider.connection.requestAirdrop(
    nonAdminKeypair.publicKey,
    1_000_000_000
  );
  await provider.connection.confirmTransaction({
    signature: airdropSig,
    blockhash: (await provider.connection.getLatestBlockhash()).blockhash,
    lastValidBlockHeight: (
      await provider.connection.getLatestBlockhash()
    ).lastValidBlockHeight,
  });

  try {
    await executeInitConfig(
      treasuryPubkey,
      provider.wallet.publicKey,
      treasuryFee,
      nonAdminKeypair.publicKey,
      nonAdminKeypair
    );
    throw new Error('Should have failed with unauthorized initialization');
  } catch (error) {
    console.log('Unauthorized error received:', error.message);
    expectError(error, ['InvalidAuthority', '6000', 'Invalid authority']);
    console.log('Unauthorized initialization test passed');
  }

  // Test valid initialization (do this last)
  console.log('Testing valid initialization...');
  try {
    const tx = await executeInitConfig(
      treasuryPubkey,
      authorityPubkey,
      treasuryFee,
      authorityKeypair.publicKey
    );
    await confirm(tx);

    const configState = await program.account.programConfig.fetch(configPda);
    expect(
      configState.treasuryPubkey.equals(treasuryPubkey),
      'Treasury pubkey mismatch'
    ).to.be.true;
    expect(
      configState.authorityPubkey.equals(authorityPubkey),
      'Authority pubkey mismatch'
    ).to.be.true;
    expect(configState.treasuryFee).to.equal(
      treasuryFee,
      'Treasury fee mismatch'
    );
    console.log('Basic initialization assertions passed');
  } catch (error) {
    console.error('Basic initialization failed:', error);
    throw error;
  }

  // Test double initialization
  console.log('Testing double initialization...');
  try {
    await executeInitConfig(
      treasuryPubkey,
      provider.wallet.publicKey,
      treasuryFee,
      provider.wallet.publicKey
    );
    throw new Error('Should have failed with double initialization');
  } catch (error) {
    console.log('Double init error received:', error.message);
    expectError(error, ['already in use', 'Error processing Instruction']);
    console.log('Double initialization test passed');
  }

  console.log('All program config initialization tests completed successfully');

  return {
    configPubkey: configPda,
    treasuryPubkey,
    authorityPubkey,
    treasuryFee,
  };
}
