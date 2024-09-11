import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { TwizzinBe } from '../target/types/twizzin_be';
import { expect } from 'chai';
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Keypair,
} from '@solana/web3.js';

export async function addPlayer(
  program: Program<TwizzinBe>,
  provider: anchor.AnchorProvider,
  gameAccount: PublicKey,
  vaultAccount: PublicKey,
  gameCode: string,
  airdropSol: (publicKey: PublicKey, amount: number) => Promise<void>,
  confirm: (signature: string) => Promise<string>
) {
  console.log('Starting add player test');
  const playerKeypair = Keypair.generate();

  // Airdrop SOL to the player before adding them to the game
  await airdropSol(playerKeypair.publicKey, 2);

  console.log(
    `Player balance after airdrop: ${
      (await provider.connection.getBalance(playerKeypair.publicKey)) /
      LAMPORTS_PER_SOL
    } SOL`
  );

  console.log('Sending addPlayer transaction');
  const tx = await program.methods
    .addPlayer(gameCode)
    .accounts({
      player: playerKeypair.publicKey,
      game: gameAccount,
      vault: vaultAccount,
      systemProgram: SystemProgram.programId,
    } as any)
    .signers([playerKeypair])
    .rpc();

  await confirm(tx);

  console.log('Player added, fetching updated game state');
  const gameState = await program.account.game.fetch(gameAccount);

  expect(gameState.players.length).to.equal(1);
  expect(gameState.players[0].player.equals(playerKeypair.publicKey)).to.be
    .true;
  console.log('Add player test completed successfully');

  return { playerKeypair, gameState };
}
