import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { TwizzinBe } from '../target/types/twizzin_be';
import { expect } from 'chai';
import { BN } from '@coral-xyz/anchor';
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from '@solana/web3.js';

export async function updateGame(
  program: Program<TwizzinBe>,
  provider: anchor.AnchorProvider,
  gameAccount: PublicKey,
  confirm: (signature: string) => Promise<string>
) {
  console.log('Starting game update test');

  const newGameName = 'Updated Test Game';
  const newAnswers = [
    { displayOrder: 0, answer: 'D', salt: 'salt0' },
    { displayOrder: 1, answer: 'C', salt: 'salt1' },
    { displayOrder: 2, answer: 'B', salt: 'salt2' },
    { displayOrder: 3, answer: 'A', salt: 'salt3' },
    { displayOrder: 4, answer: 'A', salt: 'salt4' },
  ];

  console.log('Sending updateGame transaction');
  const tx = await program.methods
    .updateGame(
      newGameName,
      null, // entryFee
      null, // commission
      null, // startTime
      null, // endTime
      null, // maxWinners
      newAnswers
    )
    .accounts({
      admin: provider.wallet.publicKey,
      game: gameAccount,
      systemProgram: SystemProgram.programId,
    } as any)
    .rpc();

  await confirm(tx);

  console.log('Game updated, fetching updated game state');
  const updatedGameState = await program.account.game.fetch(gameAccount);

  expect(updatedGameState.name).to.equal(newGameName);
  expect(updatedGameState.answers.length).to.equal(newAnswers.length);

  // Check that other fields remain unchanged
  expect(updatedGameState.entryFee.eq(new BN(LAMPORTS_PER_SOL / 100))).to.be
    .true;
  expect(updatedGameState.commission).to.equal(5);

  console.log('Game update test completed successfully');

  return { updatedGameState };
}
