import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { TwizzinBe } from '../target/types/twizzin_be';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { initializeProgramConfig } from './initConfig';
import { initializeGame } from './initGame';
import { updateGame } from './updateGame';
import { addPlayer } from './addPlayer';
import {
  updatePlayerGuesses,
  addThreePlayersWithDifferentScores,
} from './updatePlayer';
import {
  testUpdatePlayerBeforeGameStart,
  testUpdatePlayerAfterGameExpires,
} from './errors';
import {
  endGameWithMultipleWinners,
  endGameWithAllPlayersPoorlyPerforming,
  endGameWithSingleClearWinner,
} from './endGame';

let configPubkey: PublicKey;
let treasuryPubkey: PublicKey;

describe('twizzin-be', () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const program = anchor.workspace.TwizzinBe as Program<TwizzinBe>;

  const gameCode = 'TEST12';
  let gameAccount: PublicKey;
  let vaultAccount: PublicKey;

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

  it('Initializes a game', async () => {
    const result = await initializeGame(program, provider, gameCode, confirm);
    gameAccount = result.gameAccount;
    vaultAccount = result.vaultAccount;
  });

  it('Updates a game with partial parameters', async () => {
    await updateGame(program, provider, gameAccount, confirm);
  });

  it('Adds a player to the game', async () => {
    await addPlayer(
      program,
      provider,
      gameAccount,
      vaultAccount,
      gameCode,
      airdropSol,
      confirm
    );
  });

  it("Updates a player's guesses", async () => {
    await updatePlayerGuesses(
      program,
      provider,
      configPubkey,
      airdropSol,
      confirm
    );
  });

  it('Adds three players with different correct answer counts', async () => {
    await addThreePlayersWithDifferentScores(
      program,
      provider,
      configPubkey,
      airdropSol
    );
  });

  it('Fails to update player when game has not started', async () => {
    await testUpdatePlayerBeforeGameStart(
      program,
      provider,
      configPubkey,
      airdropSol
    );
  });

  it('Fails to update player when game expires or player end time is invalid', async () => {
    await testUpdatePlayerAfterGameExpires(
      program,
      provider,
      configPubkey,
      airdropSol
    );
  });

  it('Ends a game with multiple winners and verifies payouts', async () => {
    await endGameWithMultipleWinners(
      program,
      provider,
      configPubkey,
      treasuryPubkey,
      airdropSol,
      confirm
    );
  });

  it('Ends a game with all players performing poorly', async () => {
    await endGameWithAllPlayersPoorlyPerforming(
      program,
      provider,
      configPubkey,
      treasuryPubkey,
      airdropSol,
      confirm
    );
  });

  it('Ends a game with a single clear winner', async () => {
    await endGameWithSingleClearWinner(
      program,
      provider,
      configPubkey,
      treasuryPubkey,
      airdropSol,
      confirm
    );
  });
});
