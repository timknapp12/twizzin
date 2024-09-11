import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { TwizzinBe } from '../target/types/twizzin_be';
import { assert } from 'chai';
import { BN } from '@coral-xyz/anchor';
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Keypair,
} from '@solana/web3.js';

export async function testUpdatePlayerBeforeGameStart(
  program: Program<TwizzinBe>,
  provider: anchor.AnchorProvider,
  configPubkey: PublicKey,
  airdropSol: (publicKey: PublicKey, amount: number) => Promise<void>
) {
  console.log('Starting test for update_player failure when game not started');

  const slot = await provider.connection.getSlot();
  const timestamp = await provider.connection.getBlockTime(slot);
  if (!timestamp) throw new Error("Couldn't fetch on-chain time");

  const currentTime = new BN(timestamp * 1000);
  const futureStartTime = currentTime.add(new BN(60000));
  const futureEndTime = futureStartTime.add(new BN(1800000));

  console.log('Current on-chain time:', currentTime.toString());
  console.log('Future game start time:', futureStartTime.toString());
  console.log('Future game end time:', futureEndTime.toString());

  const gameCode = 'FUTURE' + Math.floor(Math.random() * 10000);
  const [newGameAccount] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('game'),
      provider.wallet.publicKey.toBuffer(),
      Buffer.from(gameCode),
    ],
    program.programId
  );

  const [newVaultAccount] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('vault'),
      provider.wallet.publicKey.toBuffer(),
      Buffer.from(gameCode),
    ],
    program.programId
  );

  await program.methods
    .initGame(
      'Future Game',
      new BN(LAMPORTS_PER_SOL / 100),
      5,
      gameCode,
      futureStartTime,
      futureEndTime,
      3,
      [{ displayOrder: 0, answer: 'A', salt: 'salt0' }]
    )
    .accounts({
      admin: provider.wallet.publicKey,
      game: newGameAccount,
      vault: newVaultAccount,
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
      game: newGameAccount,
      vault: newVaultAccount,
      systemProgram: SystemProgram.programId,
    } as any)
    .signers([playerKeypair])
    .rpc();

  const guesses = [{ displayOrder: 0, answer: 'A', salt: 'salt0' }];

  const updateSlot = await provider.connection.getSlot();
  const updateTimestamp = await provider.connection.getBlockTime(updateSlot);
  if (!updateTimestamp)
    throw new Error("Couldn't fetch on-chain time for update");

  const updateTime = new BN(updateTimestamp * 1000);
  console.log('Update attempt time:', updateTime.toString());

  try {
    await program.methods
      .updatePlayer(guesses, updateTime)
      .accounts({
        player: playerKeypair.publicKey,
        game: newGameAccount,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([playerKeypair])
      .rpc();

    assert.fail('Expected an error, but none was thrown');
  } catch (error) {
    console.log('Error caught:', error);
    assert.include(
      error.message,
      'GameNotStarted',
      'Expected GameNotStarted error'
    );
  }

  console.log(
    'Test for update_player failure when game not started completed successfully'
  );
}

export async function testUpdatePlayerAfterGameExpires(
  program: Program<TwizzinBe>,
  provider: anchor.AnchorProvider,
  configPubkey: PublicKey,
  airdropSol: (publicKey: PublicKey, amount: number) => Promise<void>
) {
  console.log('Starting test for update_player failure scenarios');

  const slot = await provider.connection.getSlot();
  const timestamp = await provider.connection.getBlockTime(slot);
  if (!timestamp) throw new Error("Couldn't fetch on-chain time");

  const currentTime = new BN(timestamp * 1000);
  const startTime = currentTime.add(new BN(5000));
  const endTime = startTime.add(new BN(20000));

  console.log('Current on-chain time:', currentTime.toString());
  console.log('Game start time:', startTime.toString());
  console.log('Game end time:', endTime.toString());

  const gameCode = 'EXPIRE' + Math.floor(Math.random() * 10000);
  const [newGameAccount] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('game'),
      provider.wallet.publicKey.toBuffer(),
      Buffer.from(gameCode),
    ],
    program.programId
  );

  const [newVaultAccount] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('vault'),
      provider.wallet.publicKey.toBuffer(),
      Buffer.from(gameCode),
    ],
    program.programId
  );

  await program.methods
    .initGame(
      'Expiring Game',
      new BN(LAMPORTS_PER_SOL / 100),
      5,
      gameCode,
      startTime,
      endTime,
      3,
      [{ displayOrder: 0, answer: 'A', salt: 'salt0' }]
    )
    .accounts({
      admin: provider.wallet.publicKey,
      game: newGameAccount,
      vault: newVaultAccount,
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
      game: newGameAccount,
      vault: newVaultAccount,
      systemProgram: SystemProgram.programId,
    } as any)
    .signers([playerKeypair])
    .rpc();

  const guesses = [{ displayOrder: 0, answer: 'A', salt: 'salt0' }];

  const timeToStart = startTime.sub(currentTime).toNumber();
  console.log(`Waiting ${timeToStart}ms for the game to start`);
  await new Promise((resolve) => setTimeout(resolve, timeToStart));

  const validUpdateSlot = await provider.connection.getSlot();
  const validUpdateTimestamp = await provider.connection.getBlockTime(
    validUpdateSlot
  );
  if (!validUpdateTimestamp)
    throw new Error("Couldn't fetch on-chain time for valid update");

  const validPlayerEndTime = new BN(validUpdateTimestamp * 1000);
  console.log('Valid update time:', validPlayerEndTime.toString());

  await program.methods
    .updatePlayer(guesses, validPlayerEndTime)
    .accounts({
      player: playerKeypair.publicKey,
      game: newGameAccount,
      systemProgram: SystemProgram.programId,
    } as any)
    .signers([playerKeypair])
    .rpc();

  console.log('Valid update succeeded');

  const timeToExpire = endTime.sub(validPlayerEndTime).toNumber() + 2000;
  console.log(`Waiting ${timeToExpire}ms for the game to expire`);
  await new Promise((resolve) => setTimeout(resolve, timeToExpire));

  const expiredUpdateSlot = await provider.connection.getSlot();
  const expiredUpdateTimestamp = await provider.connection.getBlockTime(
    expiredUpdateSlot
  );
  if (!expiredUpdateTimestamp)
    throw new Error("Couldn't fetch on-chain time for expired update");

  const expiredPlayerEndTime = new BN(expiredUpdateTimestamp * 1000);
  console.log('Expired update attempt time:', expiredPlayerEndTime.toString());

  try {
    await program.methods
      .updatePlayer(guesses, expiredPlayerEndTime)
      .accounts({
        player: playerKeypair.publicKey,
        game: newGameAccount,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([playerKeypair])
      .rpc();

    assert.fail('Expected an error for expired game, but none was thrown');
  } catch (error) {
    console.log('Error caught for expired game:', error);
    assert.include(error.message, 'GameEnded', 'Expected GameEnded error');
  }

  console.log(
    'Test for update_player failure scenarios completed successfully'
  );
}
