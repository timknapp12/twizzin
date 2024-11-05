import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { TwizzinBe2 } from '../target/types/twizzin_be_2';
import { initializeProgramConfig } from './initConfig';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

let configPubkey: PublicKey;
let treasuryPubkey: PublicKey;

describe('twizzin-be-2', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const program = anchor.workspace.TwizzinBe2 as Program<TwizzinBe2>;

  // New function for airdropping SOL
  const airdropSol = async (
    publicKey: PublicKey,
    amount: number = 1
  ): Promise<void> => {
    const signature = await provider.connection.requestAirdrop(
      publicKey,
      amount * LAMPORTS_PER_SOL
    );
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature,
      ...latestBlockhash,
    });
    console.log(`Airdropped ${amount} SOL to ${publicKey.toBase58()}`);
  };

  // New function to confirm transactions
  const confirm = async (signature: string): Promise<string> => {
    const block = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature,
      ...block,
    });
    return signature;
  };

  // Before running tests, airdrop SOL to necessary accounts
  before(async () => {
    // Airdrop to the payer account
    await airdropSol(provider.wallet.publicKey, 10);
  });

  it('Initializes the program config', async () => {
    const result = await initializeProgramConfig(program, provider, confirm);
    configPubkey = result.configPubkey;
    treasuryPubkey = result.treasuryPubkey;
  });
});
