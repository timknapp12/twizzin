import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { TwizzinBe2 } from '../target/types/twizzin_be_2';
import { expect } from 'chai';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  createMint,
  getOrCreateAssociatedTokenAccount,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  mintTo,
} from '@solana/spl-token';

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
      donationAmount?: anchor.BN;
      admin?: anchor.web3.Keypair;
      vault?: PublicKey;
      tokenMint?: PublicKey;
      adminTokenAccount?: PublicKey;
    }
  ) => {
    const adminPubkey = params.admin
      ? params.admin.publicKey
      : provider.wallet.publicKey;
    const adminSigner = params.admin ? [params.admin] : [];

    // Get the game state to use the correct admin for the vault PDA
    const gameState = await program.account.game.fetch(game);

    // Use the game's admin (not the signer) for vault PDA
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'),
        gameState.admin.toBuffer(),
        Buffer.from(gameState.gameCode),
      ],
      program.programId
    );

    // Create or get dummy token account for non-donation operations
    const tokenMint = params.tokenMint || NATIVE_MINT;
    const adminTokenAccount =
      params.adminTokenAccount ||
      (
        await getOrCreateAssociatedTokenAccount(
          provider.connection,
          (provider.wallet as anchor.Wallet).payer,
          tokenMint,
          adminPubkey
        )
      ).address;

    const accounts = {
      admin: adminPubkey,
      game,
      vault: params.vault || vaultPda,
      tokenMint: tokenMint,
      adminTokenAccount: adminTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
    };

    return program.methods
      .updateGame(
        params.name === undefined ? null : params.name,
        params.entryFee === undefined ? null : params.entryFee,
        params.commission === undefined ? null : params.commission,
        params.startTime === undefined ? null : params.startTime,
        params.endTime === undefined ? null : params.endTime,
        params.maxWinners === undefined ? null : params.maxWinners,
        params.answerHash === undefined ? null : params.answerHash,
        params.donationAmount === undefined ? null : params.donationAmount
      )
      .accounts(accounts)
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

  // Test 7: Native SOL donation update
  console.log('Testing native SOL donation update...');
  try {
    const newDonation = new anchor.BN(0.3 * LAMPORTS_PER_SOL);

    // Get initial balance to account for rent
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from('GAME1'),
      ],
      program.programId
    );
    const initialBalance = await provider.connection.getBalance(vaultPda);

    const tx = await executeUpdateGame(gamePda, {
      donationAmount: newDonation,
    });
    await confirm(tx);

    const updatedState = await program.account.game.fetch(gamePda);
    expect(updatedState.donationAmount.eq(newDonation)).to.be.true;

    // Check vault balance, accounting for initial balance (rent)
    const finalBalance = await provider.connection.getBalance(vaultPda);
    expect(finalBalance - initialBalance).to.equal(newDonation.toNumber());

    console.log('Native SOL donation update test passed');
  } catch (error) {
    console.error('Native SOL donation update failed:', error);
    throw error;
  }

  // Test 8: SPL token donation update
  console.log('Testing SPL token donation update...');
  try {
    // Create a new SPL token mint
    const mint = await createMint(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      provider.wallet.publicKey,
      provider.wallet.publicKey,
      9
    );

    // Create admin's token account
    const adminTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      mint,
      provider.wallet.publicKey
    );

    const newGameCode = 'GAME5';
    // Move vaultPda declaration before its usage
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from(newGameCode),
      ],
      program.programId
    );

    const [newGamePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('game'),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from(newGameCode),
      ],
      program.programId
    );

    // Initialize the game with the new token mint
    await program.methods
      .initGame(
        'SPL Game',
        newGameCode,
        new anchor.BN(0.1 * LAMPORTS_PER_SOL),
        5,
        new anchor.BN(now + 3600),
        new anchor.BN(now + 7200),
        5,
        Array(32).fill(1),
        new anchor.BN(0)
      )
      .accounts({
        admin: provider.wallet.publicKey,
        game: newGamePda,
        tokenMint: mint,
        vault: vaultPda,
        adminTokenAccount: adminTokenAccount.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Mint tokens to admin's account
    const donationAmount = new anchor.BN(1000000000);
    await mintTo(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      mint,
      adminTokenAccount.address,
      provider.wallet.publicKey,
      donationAmount.toNumber()
    );

    // Now update this new game with a donation
    const updateTx = await executeUpdateGame(newGamePda, {
      donationAmount: donationAmount,
      tokenMint: mint,
      adminTokenAccount: adminTokenAccount.address,
    });
    await confirm(updateTx);

    const updatedState = await program.account.game.fetch(newGamePda);
    expect(updatedState.donationAmount.eq(donationAmount)).to.be.true;

    // Verify vault token balance
    const vaultBalance = await provider.connection.getTokenAccountBalance(
      vaultPda
    );
    expect(vaultBalance.value.amount).to.equal(donationAmount.toString());

    console.log('SPL token donation update test passed');
  } catch (error) {
    console.error('SPL token donation update failed:', error);
    throw error;
  }
  console.log('All game update tests completed successfully');
}
