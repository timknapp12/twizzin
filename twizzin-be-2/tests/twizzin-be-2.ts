import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { TwizzinBe2 } from '../target/types/twizzin_be_2';
import { initializeProgramConfig } from './initConfig';
import { updateProgramConfig } from './updateConfig';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

let configPubkey: PublicKey;
let treasuryPubkey: PublicKey;
let authorityPubkey: PublicKey;
let treasuryFee: number;

describe('twizzin-be-2', () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const program = anchor.workspace.TwizzinBe2 as Program<TwizzinBe2>;

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

  const confirm = async (signature: string): Promise<string> => {
    const block = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature,
      ...block,
    });
    return signature;
  };

  before(async () => {
    await airdropSol(provider.wallet.publicKey, 2);
  });

  it('Initializes the program config', async () => {
    const result = await initializeProgramConfig(program, provider, confirm);
    configPubkey = result.configPubkey;
    treasuryPubkey = result.treasuryPubkey;
    authorityPubkey = result.authorityPubkey;
    treasuryFee = result.treasuryFee;
  });

  it('Updates the program config', async () => {
    await updateProgramConfig(
      program,
      provider,
      confirm,
      configPubkey,
      treasuryPubkey
    );
  });
});
