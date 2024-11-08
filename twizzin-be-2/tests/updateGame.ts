import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { TwizzinBe2 } from '../target/types/twizzin_be_2';
import { expect } from 'chai';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

export async function updateGame(
  program: Program<TwizzinBe2>,
  provider: anchor.AnchorProvider,
  confirm: (signature: string) => Promise<string>
) {
  console.log('Starting game update tests');

  // Test parameters
  const newName = 'Updated Game';
  const newEntryFee = new anchor.BN(0.2 * LAMPORTS_PER_SOL); // 0.2 SOL
  const newCommission = 7; // 7%
  const now = Math.floor(Date.now() / 1000);
  const newStartTime = new anchor.BN(now + 4800); // 1.33 hours from now
  const newEndTime = new anchor.BN(now + 9600); // 2.66 hours from now
  const validMaxWinners = 3;
  const newAnswerHash = Array(32).fill(2); // New example hash

  // Helper function for program method calls
  const executeUpdateGame = async (
    game: PublicKey,
    params: {
      name?: string;
      entryFee?: anchor.BN;
      commission?: number;
      startTime?: anchor.BN;
      endTime?: anchor.BN;
      maxWinners?: number;
      answerHash?: number[];
      admin?: anchor.web3.Keypair;
    }
  ) => {
    const adminPubkey = params.admin
      ? params.admin.publicKey
      : provider.wallet.publicKey;
    const adminSigner = params.admin ? [params.admin] : [];

    return program.methods
      .updateGame(
        params.name === undefined ? null : params.name,
        params.entryFee === undefined ? null : params.entryFee,
        params.commission === undefined ? null : params.commission,
        params.startTime === undefined ? null : params.startTime,
        params.endTime === undefined ? null : params.endTime,
        params.maxWinners === undefined ? null : params.maxWinners,
        params.answerHash === undefined ? null : params.answerHash
      )
      .accounts({
        admin: adminPubkey,
        game,
      })
      .signers(adminSigner)
      .rpc();
  };

  // Helper function for error checking
  const expectError = (error: any, errorTypes: string[]) => {
    const errorString = error.toString();
    console.log('Received error:', errorString); // Debug log
    const hasExpectedError = errorTypes.some((type) => {
      const matches = errorString.includes(type);
      console.log(`Checking for ${type}: ${matches}`); // Debug log
      return matches;
    });
    expect(
      hasExpectedError,
      `Expected one of [${errorTypes}] but got: ${errorString}`
    ).to.be.true;
  };

  // First, we need a game to update
  // ... Get the existing game PDA from your successful init_game test

  const [gamePda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('game'),
      provider.wallet.publicKey.toBuffer(),
      Buffer.from('GAME1'),
    ],
    program.programId
  );

  // Test 1: Name too long
  console.log('Testing name too long update...');
  try {
    await executeUpdateGame(gamePda, {
      name: 'x'.repeat(33),
    });
    throw new Error('Should have failed with name too long');
  } catch (error) {
    expectError(error, ['NameTooLong']);
  }

  // Test 2: Invalid time range
  console.log('Testing invalid time range update...');
  try {
    await executeUpdateGame(gamePda, {
      startTime: newEndTime,
      endTime: newStartTime,
    });
    throw new Error('Should have failed with invalid time range');
  } catch (error) {
    expectError(error, ['InvalidTimeRange']);
  }

  // Test 3: Max winners too low
  console.log('Testing max winners too low update...');
  try {
    console.log('Attempting to update game with maxWinners: 0');
    const tx = await executeUpdateGame(gamePda, {
      maxWinners: 0,
    });
    console.log('Transaction succeeded when it should have failed:', tx);
    await confirm(tx);
    throw new Error('Should have failed with max winners too low');
  } catch (error) {
    console.log('Caught error:', error);
    if (error.message === 'Should have failed with max winners too low') {
      throw error;
    }
    expectError(error, ['MaxWinnersTooLow', '6007']);
  }

  // Test 4: Unauthorized update attempt
  console.log('Testing unauthorized update...');
  const unauthorizedUser = anchor.web3.Keypair.generate();
  try {
    await executeUpdateGame(gamePda, {
      name: newName,
      admin: unauthorizedUser,
    });
    throw new Error('Should have failed with unauthorized update');
  } catch (error) {
    expectError(error, ['InvalidAuthority']);
  }

  // Test 5: Successful complete update
  console.log('Testing successful complete update...');
  try {
    const tx = await executeUpdateGame(gamePda, {
      name: newName,
      entryFee: newEntryFee,
      commission: newCommission,
      startTime: newStartTime,
      endTime: newEndTime,
      maxWinners: validMaxWinners,
      answerHash: newAnswerHash,
    });
    await confirm(tx);

    // Verify updated game account data
    const gameState = await program.account.game.fetch(gamePda);
    expect(gameState.name).to.equal(newName);
    expect(gameState.entryFee.eq(newEntryFee)).to.be.true;
    expect(gameState.commission).to.equal(newCommission);
    expect(gameState.startTime.eq(newStartTime)).to.be.true;
    expect(gameState.endTime.eq(newEndTime)).to.be.true;
    expect(gameState.maxWinners).to.equal(validMaxWinners);
    expect(gameState.answerHash).to.deep.equal(newAnswerHash);

    console.log('Complete update test passed');
  } catch (error) {
    console.error('Complete update failed:', error);
    throw error;
  }

  // Test 6: Successful partial update
  console.log('Testing successful partial update...');
  try {
    const partialName = 'Partially Updated Game';
    const tx = await executeUpdateGame(gamePda, {
      name: partialName,
      maxWinners: 5,
    });
    await confirm(tx);

    // Verify only specified fields were updated
    const gameState = await program.account.game.fetch(gamePda);
    expect(gameState.name).to.equal(partialName);
    expect(gameState.maxWinners).to.equal(5);
    expect(gameState.entryFee.eq(newEntryFee)).to.be.true; // Should remain unchanged
    expect(gameState.commission).to.equal(newCommission); // Should remain unchanged

    console.log('Partial update test passed');
  } catch (error) {
    console.error('Partial update failed:', error);
    throw error;
  }

  console.log('All game update tests completed successfully');
}
