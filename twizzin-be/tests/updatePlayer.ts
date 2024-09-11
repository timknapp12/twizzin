import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { TwizzinBe } from '../target/types/twizzin_be';
import { expect } from 'chai';
import { BN } from '@coral-xyz/anchor';
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Keypair,
} from '@solana/web3.js';

export async function updatePlayerGuesses(
  program: Program<TwizzinBe>,
  provider: anchor.AnchorProvider,
  configPubkey: PublicKey,
  airdropSol: (publicKey: PublicKey, amount: number) => Promise<void>,
  confirm: (signature: string) => Promise<string>
) {
  console.log('Starting update player test');

  const slot = await provider.connection.getSlot();
  const timestamp = await provider.connection.getBlockTime(slot);
  if (!timestamp) throw new Error("Couldn't fetch on-chain time");

  const currentTime = new BN(timestamp * 1000);
  const startTime = currentTime.add(new BN(10000));
  const endTime = startTime.add(new BN(60000));

  console.log('Current on-chain time:', currentTime.toString());
  console.log('Game start time:', startTime.toString());
  console.log('Game end time:', endTime.toString());

  const gameCode = 'TEST' + Math.floor(Math.random() * 10000);
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

  await program.methods
    .initGame(
      'Test Game',
      new BN(LAMPORTS_PER_SOL / 100),
      5,
      gameCode,
      startTime,
      endTime,
      3,
      [
        { displayOrder: 0, answer: 'A', salt: 'salt0' },
        { displayOrder: 1, answer: 'B', salt: 'salt1' },
        { displayOrder: 2, answer: 'C', salt: 'salt2' },
      ]
    )
    .accounts({
      admin: provider.wallet.publicKey,
      game: gameAccount,
      vault: vaultAccount,
      config: configPubkey,
      systemProgram: SystemProgram.programId,
    } as any)
    .rpc();

  const playerKeypair = Keypair.generate();
  await airdropSol(playerKeypair.publicKey, 2);

  await program.methods
    .addPlayer(gameCode)
    .accounts({
      player: playerKeypair.publicKey,
      game: gameAccount,
      vault: vaultAccount,
      systemProgram: SystemProgram.programId,
    } as any)
    .signers([playerKeypair])
    .rpc();

  const guesses = [
    { displayOrder: 0, answer: 'A', salt: 'salt0' },
    { displayOrder: 1, answer: 'B', salt: 'salt1' },
    { displayOrder: 2, answer: 'C', salt: 'salt2' },
  ];

  const timeToWait = startTime.sub(currentTime).toNumber() + 2000;
  console.log('Waiting for', timeToWait, 'ms');
  await new Promise((resolve) => setTimeout(resolve, timeToWait));

  const newSlot = await provider.connection.getSlot();
  const newTimestamp = await provider.connection.getBlockTime(newSlot);
  if (!newTimestamp) throw new Error("Couldn't fetch on-chain time");

  const playerEndTime = new BN(newTimestamp * 1000);
  console.log('Player end time:', playerEndTime.toString());

  console.log('Sending updatePlayer transaction');
  const tx = await program.methods
    .updatePlayer(guesses, playerEndTime)
    .accounts({
      player: playerKeypair.publicKey,
      game: gameAccount,
      systemProgram: SystemProgram.programId,
    } as any)
    .signers([playerKeypair])
    .rpc();

  await confirm(tx);

  console.log('Player updated, fetching updated game state');
  const gameState = await program.account.game.fetch(gameAccount);

  const updatedPlayer = gameState.players.find((p) =>
    p.player.equals(playerKeypair.publicKey)
  );

  console.log('Updated player:', JSON.stringify(updatedPlayer, null, 2));

  expect(updatedPlayer).to.not.be.undefined;
  expect(updatedPlayer!.numCorrect).to.equal(3);
  expect(updatedPlayer!.playerEndTime.eq(playerEndTime)).to.be.true;

  console.log('Update player test completed');
}

export async function addThreePlayersWithDifferentScores(
  program: Program<TwizzinBe>,
  provider: anchor.AnchorProvider,
  configPubkey: PublicKey,
  airdropSol: (publicKey: PublicKey, amount: number) => Promise<void>
) {
  console.log('Starting test for multiple players with different scores');

  const slot = await provider.connection.getSlot();
  const timestamp = await provider.connection.getBlockTime(slot);
  if (!timestamp) throw new Error("Couldn't fetch on-chain time");

  const currentTime = new BN(timestamp * 1000);
  const startTime = currentTime.add(new BN(10000));
  const endTime = startTime.add(new BN(60000));

  console.log('Current on-chain time:', currentTime.toString());
  console.log('Game start time:', startTime.toString());
  console.log('Game end time:', endTime.toString());

  const gameCode = 'TEST' + Math.floor(Math.random() * 10000);
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

  await program.methods
    .initGame(
      'Test Game',
      new BN(LAMPORTS_PER_SOL / 100),
      5,
      gameCode,
      startTime,
      endTime,
      3,
      [
        { displayOrder: 0, answer: 'D', salt: 'salt0' },
        { displayOrder: 1, answer: 'C', salt: 'salt1' },
        { displayOrder: 2, answer: 'B', salt: 'salt2' },
        { displayOrder: 3, answer: 'A', salt: 'salt3' },
        { displayOrder: 4, answer: 'A', salt: 'salt4' },
      ]
    )
    .accounts({
      admin: provider.wallet.publicKey,
      game: gameAccount,
      vault: vaultAccount,
      config: configPubkey,
      systemProgram: SystemProgram.programId,
    } as any)
    .rpc();

  const players = [
    { keypair: Keypair.generate(), correctAnswers: 2 },
    { keypair: Keypair.generate(), correctAnswers: 3 },
    { keypair: Keypair.generate(), correctAnswers: 4 },
  ];

  for (const player of players) {
    await airdropSol(player.keypair.publicKey, 2);

    await program.methods
      .addPlayer(gameCode)
      .accounts({
        player: player.keypair.publicKey,
        game: gameAccount,
        vault: vaultAccount,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([player.keypair])
      .rpc();
  }

  const timeToWait = startTime.sub(currentTime).toNumber() + 2000;
  console.log('Waiting for', timeToWait, 'ms for the game to start');
  await new Promise((resolve) => setTimeout(resolve, timeToWait));

  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const guesses = [
      { displayOrder: 0, answer: 'D', salt: 'salt0' },
      { displayOrder: 1, answer: 'C', salt: 'salt1' },
      { displayOrder: 2, answer: 'B', salt: 'salt2' },
      { displayOrder: 3, answer: 'A', salt: 'salt3' },
      { displayOrder: 4, answer: 'A', salt: 'salt4' },
    ];

    guesses.forEach((guess, index) => {
      if (index >= player.correctAnswers) {
        guess.answer = 'X';
      }
    });

    const playerSlot = await provider.connection.getSlot();
    const playerTimestamp = await provider.connection.getBlockTime(playerSlot);
    if (!playerTimestamp)
      throw new Error("Couldn't fetch on-chain time for player");

    const playerEndTime = new BN(playerTimestamp * 1000);
    console.log(`Player ${i + 1} end time:`, playerEndTime.toString());

    await program.methods
      .updatePlayer(guesses, playerEndTime)
      .accounts({
        player: player.keypair.publicKey,
        game: gameAccount,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([player.keypair])
      .rpc();
  }

  const updatedGameState = await program.account.game.fetch(gameAccount);

  for (const player of players) {
    const updatedPlayer = updatedGameState.players.find((p) =>
      p.player.equals(player.keypair.publicKey)
    );
    expect(updatedPlayer).to.not.be.undefined;
    expect(updatedPlayer!.numCorrect).to.equal(player.correctAnswers);
    console.log(
      `Player ${player.keypair.publicKey.toBase58()} has ${
        updatedPlayer!.numCorrect
      } correct answers`
    );
  }

  console.log('Game state players:');
  console.log(
    JSON.stringify(
      updatedGameState.players.map((p) => ({
        player: p.player.toBase58(),
        numCorrect: p.numCorrect,
        playerEndTime: p.playerEndTime.toString(),
      })),
      null,
      2
    )
  );

  console.log(
    'Multiple players with different scores test completed successfully'
  );
}
