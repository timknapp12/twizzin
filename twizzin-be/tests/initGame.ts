import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { TwizzinBe } from '../target/types/twizzin_be';
import { expect } from 'chai';
import { BN } from '@coral-xyz/anchor';
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from '@solana/web3.js';

export async function initializeGame(
  program: Program<TwizzinBe>,
  provider: anchor.AnchorProvider,
  gameCode: string,
  confirm: (signature: string) => Promise<string>
) {
  console.log('Starting game initialization test');
  const gameName = 'Test Game';
  const entryFee = new BN(LAMPORTS_PER_SOL / 100); // 0.01 SOL
  const commission = 5; // 5%
  const startTime = new BN(Date.now());
  const endTime = startTime.add(new BN(1800000)); // 30 minutes after start
  const maxWinners = 3;
  const answers = [
    { displayOrder: 0, answer: 'A', salt: 'salt0' },
    { displayOrder: 1, answer: 'B', salt: 'salt1' },
    { displayOrder: 2, answer: 'C', salt: 'salt2' },
    { displayOrder: 3, answer: 'D', salt: 'salt3' },
  ];

  const [gameAccount] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('game'),
      provider.wallet.publicKey.toBuffer(),
      Buffer.from(gameCode),
    ],
    program.programId
  );

  const [vaultAccount] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('vault'),
      provider.wallet.publicKey.toBuffer(),
      Buffer.from(gameCode),
    ],
    program.programId
  );

  console.log('Sending initGame transaction');
  const tx = await program.methods
    .initGame(
      gameName,
      entryFee,
      commission,
      gameCode,
      startTime,
      endTime,
      maxWinners,
      answers
    )
    .accounts({
      admin: provider.wallet.publicKey,
      game: gameAccount,
      vault: vaultAccount,
      systemProgram: SystemProgram.programId,
    } as any)
    .rpc();

  await confirm(tx);

  console.log('Game initialized, fetching game state');
  const gameState = await program.account.game.fetch(gameAccount);

  expect(gameState.name).to.equal(gameName);
  expect(gameState.entryFee.eq(entryFee)).to.be.true;
  expect(gameState.commission).to.equal(commission);
  expect(gameState.gameCode).to.equal(gameCode);
  expect(gameState.startTime.eq(startTime)).to.be.true;
  expect(gameState.endTime.eq(endTime)).to.be.true;
  expect(gameState.answers.length).to.equal(answers.length);
  console.log('Game initialization test completed successfully');

  return { gameAccount, vaultAccount, gameState };
}
