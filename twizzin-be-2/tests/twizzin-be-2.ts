import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { TwizzinBe2 } from '../target/types/twizzin_be_2';
import devWalletJson from '../../twizzin-wallet.json';
import { initializeProgramConfig } from './initConfig';
import { updateProgramConfig } from './updateConfig';
import { initializeGame } from './initGame';
import { updateGame } from './updateGame';
import { joinGame } from './joinGame';
import { startGame } from './startGame';
import { submitAnswers } from './submitAnswers';
import { endGame } from './endGame';
import { declareWinners } from './declareWinners';
import { claim } from './claim';
import { closeGame } from './closeGame';
import { closePlayerAccount } from './closePlayerAccount';
import { LAMPORTS_PER_SOL, PublicKey, Keypair } from '@solana/web3.js';

let configPubkey: PublicKey;
let treasuryPubkey: PublicKey;
let authorityPubkey: PublicKey;
let treasuryFee: number;

const devWalletSecretKey = Uint8Array.from(devWalletJson);
authorityPubkey = Keypair.fromSecretKey(devWalletSecretKey).publicKey;

// Create authority keypair from wallet JSON
const authorityKeypair = Keypair.fromSecretKey(Uint8Array.from(devWalletJson));

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
    const result = await initializeProgramConfig(
      program,
      provider,
      confirm,
      authorityKeypair
    );
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
      authorityKeypair
    );
  });
  it('Initializes a game', async () => {
    await initializeGame(program, provider, confirm);
  });

  it('Updates a game', async () => {
    await updateGame(program, provider, confirm);
  });

  it('Joins a game', async () => {
    await joinGame(program, provider, confirm);
  });

  it('Starts a game', async () => {
    await startGame(program, provider, confirm);
  });

  it('Submits answers', async () => {
    await submitAnswers(program, provider, confirm);
  });

  it('Ends a game', async () => {
    await endGame(program, provider, confirm);
  });

  it('Declares winners', async () => {
    await declareWinners(program, provider, confirm);
  });

  it('Claims a prize', async () => {
    await claim(program, provider, confirm);
  });

  it('Closes a game', async () => {
    await closeGame(program, provider, confirm);
  });

  it('Closes a player account', async () => {
    await closePlayerAccount(program, provider, confirm);
  });
});
