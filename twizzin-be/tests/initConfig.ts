import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { TwizzinBe } from '../target/types/twizzin_be';
import { expect } from 'chai';
import { SystemProgram } from '@solana/web3.js';

export async function initializeProgramConfig(
  program: Program<TwizzinBe>,
  provider: anchor.AnchorProvider,
  confirm: (signature: string) => Promise<string>
) {
  console.log('Starting program config initialization test');

  const configKeypair = anchor.web3.Keypair.generate();
  const configPubkey = configKeypair.publicKey;

  // Generate a new public key for the treasury
  const treasuryKeypair = anchor.web3.Keypair.generate();
  const treasuryPubkey = treasuryKeypair.publicKey;

  console.log('Sending initConfig transaction');
  const tx = await program.methods
    .initConfig(treasuryPubkey)
    .accounts({
      admin: provider.wallet.publicKey,
      config: configPubkey,
      systemProgram: SystemProgram.programId,
    } as any)
    .signers([configKeypair])
    .rpc();

  await confirm(tx);

  console.log('Config initialized, fetching config state');
  const configState = await program.account.programConfig.fetch(configPubkey);

  expect(configState.treasuryPubkey.equals(treasuryPubkey)).to.be.true;
  console.log('Program config initialization test completed successfully');

  return { configPubkey, treasuryPubkey };
}
