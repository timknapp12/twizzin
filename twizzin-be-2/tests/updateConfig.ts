import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { TwizzinBe2 } from '../target/types/twizzin_be_2';
import { expect } from 'chai';
import { PublicKey } from '@solana/web3.js';

export async function updateProgramConfig(
  program: Program<TwizzinBe2>,
  provider: anchor.AnchorProvider,
  confirm: (signature: string) => Promise<string>,
  configPubkey: PublicKey,
  currentTreasuryPubkey: PublicKey
) {
  console.log('Starting program config update tests');

  // Helper function for error checking
  const expectError = (error: any, errorTypes: string[]) => {
    const errorString = error.toString();
    const hasExpectedError = errorTypes.some(
      (type) =>
        errorString.includes(
          type.includes('Error Code:') ? type : `Error Code: ${type}`
        ) || errorString.includes(type)
    );
    expect(
      hasExpectedError,
      `Expected one of [${errorTypes}] but got: ${errorString}`
    ).to.be.true;
  };

  // Helper function to execute update config
  const executeUpdateConfig = async (
    treasury: PublicKey | null,
    fee: number | null,
    authority: PublicKey,
    additionalSigners: anchor.web3.Keypair[] = []
  ) => {
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      program.programId
    );

    return program.methods
      .updateConfig(treasury, fee)
      .accounts({
        authority,
        config: configPda,
      })
      .signers(additionalSigners)
      .rpc();
  };

  // Helper function to fetch and verify config state
  const verifyConfigState = async (
    expectedTreasury?: PublicKey,
    expectedFee?: number
  ) => {
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      program.programId
    );
    const configState = await program.account.programConfig.fetch(configPda);

    if (expectedTreasury) {
      expect(
        configState.treasuryPubkey.equals(expectedTreasury),
        'Treasury pubkey mismatch'
      ).to.be.true;
    }
    if (expectedFee !== undefined) {
      expect(configState.treasuryFee, 'Treasury fee mismatch').to.equal(
        expectedFee
      );
    }
  };

  // Test single field updates
  console.log('Testing individual field updates...');
  try {
    // Update fee only
    const newFee = 800;
    await executeUpdateConfig(null, newFee, provider.wallet.publicKey);
    await verifyConfigState(undefined, newFee);
    console.log('Treasury fee update test passed');

    // Update treasury only
    const newTreasuryPubkey = anchor.web3.Keypair.generate().publicKey;
    await executeUpdateConfig(
      newTreasuryPubkey,
      null,
      provider.wallet.publicKey
    );
    await verifyConfigState(newTreasuryPubkey, undefined);
    console.log('Treasury address update test passed');

    // Update both fields
    const newerTreasuryPubkey = anchor.web3.Keypair.generate().publicKey;
    const newerFee = 600;
    await executeUpdateConfig(
      newerTreasuryPubkey,
      newerFee,
      provider.wallet.publicKey
    );
    await verifyConfigState(newerTreasuryPubkey, newerFee);
    console.log('Both fields update test passed');
  } catch (error) {
    console.error('Update tests failed:', error);
    throw error;
  }

  // Test error conditions
  const testErrorCondition = async (
    testName: string,
    treasury: PublicKey | null,
    fee: number | null,
    authority: PublicKey,
    signers: anchor.web3.Keypair[],
    expectedErrors: string[]
  ) => {
    console.log(`Testing ${testName}...`);
    try {
      await executeUpdateConfig(treasury, fee, authority, signers);
      throw new Error(`Should have failed with ${testName}`);
    } catch (error) {
      console.log(`${testName} error received:`, error.message);
      expectError(error, expectedErrors);
      console.log(`${testName} test passed`);
    }
  };

  // Test invalid treasury fee
  await testErrorCondition(
    'invalid treasury fee',
    null,
    1001,
    provider.wallet.publicKey,
    [],
    ['TreasuryFeeTooHigh', '6002', 'Treasury fee too high']
  );

  // Test zero treasury address
  await testErrorCondition(
    'zero treasury address',
    PublicKey.default,
    null,
    provider.wallet.publicKey,
    [],
    ['TreasuryAddressBlank', '6003', 'Treasury address is blank']
  );

  // Test unauthorized update
  const unauthorizedKeypair = anchor.web3.Keypair.generate();
  // Airdrop SOL to unauthorized account
  const airdropSig = await provider.connection.requestAirdrop(
    unauthorizedKeypair.publicKey,
    1_000_000_000
  );
  await provider.connection.confirmTransaction(airdropSig);

  await testErrorCondition(
    'unauthorized update',
    null,
    500,
    unauthorizedKeypair.publicKey,
    [unauthorizedKeypair],
    ['InvalidAuthority', '6000', 'Invalid authority']
  );

  console.log('All program config update tests completed successfully');
}
