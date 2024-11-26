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
  authorityKeypair: anchor.web3.Keypair
) {
  console.log('Starting program config update tests');

  console.log('\nDEBUG: Authority Information');
  console.log(
    'Authority Keypair Public Key:',
    authorityKeypair.publicKey.toBase58()
  );
  console.log(
    'Provider Wallet Public Key:',
    provider.wallet.publicKey.toBase58()
  );

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
    console.log('\nDEBUG: Update Transaction Parameters');
    console.log('Treasury:', treasury?.toBase58() ?? 'null');
    console.log('Fee:', fee);
    console.log('Authority:', authority.toBase58());

    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      program.programId
    );

    return program.methods
      .updateConfig(treasury, fee)
      .accounts({
        authority: authorityKeypair.publicKey,
        config: configPda,
      })
      .signers([authorityKeypair, ...additionalSigners])
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
    const feeUpdateTx = await executeUpdateConfig(
      null,
      newFee,
      authorityKeypair.publicKey
    );
    await confirm(feeUpdateTx);
    await verifyConfigState(undefined, newFee);
    console.log('Treasury fee update test passed');

    // Update treasury only
    const newTreasuryPubkey = anchor.web3.Keypair.generate().publicKey;
    const treasuryUpdateTx = await executeUpdateConfig(
      newTreasuryPubkey,
      null,
      authorityKeypair.publicKey
    );
    await confirm(treasuryUpdateTx);
    await verifyConfigState(newTreasuryPubkey, undefined);
    console.log('Treasury address update test passed');

    // Update both fields
    const newerTreasuryPubkey = anchor.web3.Keypair.generate().publicKey;
    const newerFee = 600;
    const bothUpdateTx = await executeUpdateConfig(
      newerTreasuryPubkey,
      newerFee,
      authorityKeypair.publicKey
    );
    await confirm(bothUpdateTx);
    await verifyConfigState(newerTreasuryPubkey, newerFee);
    console.log('Both fields update test passed');
  } catch (error) {
    console.error('Update tests failed:', error);
    throw error;
  }

  // Test invalid treasury fee
  console.log('Testing invalid treasury fee...');
  try {
    await executeUpdateConfig(null, 1001, authorityKeypair.publicKey);
    throw new Error('Should have failed with invalid treasury fee');
  } catch (error) {
    console.log('Invalid fee error received:', error.message);
    expectError(error, ['TreasuryFeeTooHigh', '6002', 'Treasury fee too high']);
    console.log('Invalid treasury fee test passed');
  }

  // Test zero treasury address
  console.log('Testing zero treasury address...');
  try {
    await executeUpdateConfig(
      PublicKey.default,
      null,
      authorityKeypair.publicKey
    );
    throw new Error('Should have failed with zero treasury address');
  } catch (error) {
    console.log('Zero address error received:', error.message);
    expectError(error, [
      'TreasuryAddressBlank',
      '6003',
      'Treasury address is blank',
    ]);
    console.log('Zero treasury address test passed');
  }

  // Test unauthorized update
  console.log('Testing unauthorized update...');
  const unauthorizedKeypair = anchor.web3.Keypair.generate();

  // Airdrop SOL to unauthorized account
  const signature = await provider.connection.requestAirdrop(
    unauthorizedKeypair.publicKey,
    1_000_000_000
  );
  const latestBlockhash = await provider.connection.getLatestBlockhash();
  await provider.connection.confirmTransaction({
    signature,
    ...latestBlockhash,
  });

  try {
    await program.methods
      .updateConfig(null, 500)
      .accounts({
        authority: unauthorizedKeypair.publicKey,
        config: configPubkey,
      })
      .signers([unauthorizedKeypair])
      .rpc();
    throw new Error('Should have failed with unauthorized update');
  } catch (error) {
    console.log('Unauthorized error received:', error.message);
    expectError(error, ['InvalidAuthority', '6000', 'Invalid authority']);
    console.log('Unauthorized update test passed');
  }

  console.log('All program config update tests completed successfully');
}
