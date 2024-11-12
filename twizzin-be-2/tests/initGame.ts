import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { TwizzinBe2 } from '../target/types/twizzin_be_2';
import { expect } from 'chai';
import { SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  createMint,
  getOrCreateAssociatedTokenAccount,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  mintTo,
  getAccount,
} from '@solana/spl-token';

export async function initializeGame(
  program: Program<TwizzinBe2>,
  provider: anchor.AnchorProvider,
  confirm: (signature: string) => Promise<string>
) {
  console.log('Starting game initialization tests');

  // Test parameters
  const validName = 'Test Game';
  const validGameCode = 'GAME1';
  const validEntryFee = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
  const validCommission = 5;
  const now = Math.floor(Date.now() / 1000);
  const validStartTime = new anchor.BN(now + 3600);
  const validEndTime = new anchor.BN(now + 7200);
  const validMaxWinners = 5;
  const validAnswerHash = Array(32).fill(1);
  const validDonationAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL);

  // Helper function for program method calls
  const executeInitGame = async (params: {
    name: string;
    gameCode: string;
    entryFee: anchor.BN;
    commission: number;
    startTime: anchor.BN;
    endTime: anchor.BN;
    maxWinners: number;
    answerHash: number[];
    tokenMint: PublicKey;
    donationAmount?: anchor.BN;
    admin?: anchor.web3.Keypair;
    adminTokenAccount?: PublicKey | null; // Made optional to handle native SOL case
  }) => {
    const adminPubkey = params.admin
      ? params.admin.publicKey
      : provider.wallet.publicKey;
    const adminSigner = params.admin ? [params.admin] : [];

    const [gamePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('game'),
        adminPubkey.toBuffer(),
        Buffer.from(params.gameCode),
      ],
      program.programId
    );

    const [vaultPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'),
        adminPubkey.toBuffer(),
        Buffer.from(params.gameCode),
      ],
      program.programId
    );

    const isNative = params.tokenMint.equals(NATIVE_MINT);

    const accounts = {
      admin: adminPubkey,
      game: gamePda,
      tokenMint: params.tokenMint,
      vault: vaultPda,
      adminTokenAccount: isNative ? null : params.adminTokenAccount || null,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    };

    return program.methods
      .initGame(
        params.name,
        params.gameCode,
        params.entryFee,
        params.commission,
        params.startTime,
        params.endTime,
        params.maxWinners,
        params.answerHash,
        params.donationAmount || new anchor.BN(0)
      )
      .accounts(accounts)
      .signers(adminSigner)
      .rpc();
  };

  // Helper function for error checking
  const expectError = (error: any, errorTypes: string[]) => {
    const errorString = error.toString();
    const hasExpectedError = errorTypes.some((type) =>
      errorString.includes(type)
    );
    expect(
      hasExpectedError,
      `Expected one of [${errorTypes}] but got: ${errorString}`
    ).to.be.true;
  };

  // Test 1: Name too long
  console.log('Testing name too long...');
  try {
    await executeInitGame({
      name: 'x'.repeat(33),
      gameCode: validGameCode,
      entryFee: validEntryFee,
      commission: validCommission,
      startTime: validStartTime,
      endTime: validEndTime,
      maxWinners: validMaxWinners,
      answerHash: validAnswerHash,
      tokenMint: NATIVE_MINT,
      adminTokenAccount: null,
    });
    throw new Error('Should have failed with name too long');
  } catch (error) {
    expectError(error, ['NameTooLong']);
  }

  // Test 2: Invalid time range
  console.log('Testing invalid time range...');
  try {
    await executeInitGame({
      name: validName,
      gameCode: validGameCode,
      entryFee: validEntryFee,
      commission: validCommission,
      startTime: validEndTime,
      endTime: validStartTime,
      maxWinners: validMaxWinners,
      answerHash: validAnswerHash,
      tokenMint: NATIVE_MINT,
      adminTokenAccount: null,
    });
    throw new Error('Should have failed with invalid time range');
  } catch (error) {
    expectError(error, ['InvalidTimeRange']);
  }

  // Test 3: Max winners too low
  console.log('Testing max winners too low...');
  try {
    await executeInitGame({
      name: validName,
      gameCode: validGameCode,
      entryFee: validEntryFee,
      commission: validCommission,
      startTime: validStartTime,
      endTime: validEndTime,
      maxWinners: 0,
      answerHash: validAnswerHash,
      tokenMint: NATIVE_MINT,
      adminTokenAccount: null,
    });
    throw new Error('Should have failed with max winners too low');
  } catch (error) {
    expectError(error, ['MaxWinnersTooLow']);
  }

  // Test 4: Successful native SOL game creation
  console.log('Testing successful native SOL game creation...');
  try {
    const tx = await executeInitGame({
      name: validName,
      gameCode: validGameCode,
      entryFee: validEntryFee,
      commission: validCommission,
      startTime: validStartTime,
      endTime: validEndTime,
      maxWinners: validMaxWinners,
      answerHash: validAnswerHash,
      tokenMint: NATIVE_MINT,
      adminTokenAccount: null,
    });
    await confirm(tx);

    const [gamePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('game'),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from(validGameCode),
      ],
      program.programId
    );

    const gameState = await program.account.game.fetch(gamePda);
    expect(gameState.name).to.equal(validName);
    expect(gameState.gameCode).to.equal(validGameCode);
    expect(gameState.admin.equals(provider.wallet.publicKey)).to.be.true;
    expect(gameState.tokenMint.equals(NATIVE_MINT)).to.be.true;
    expect(gameState.entryFee.eq(validEntryFee)).to.be.true;
    expect(gameState.isNative).to.be.true;

    console.log('Native SOL game creation test passed');
  } catch (error) {
    console.error('Native SOL game creation failed:', error);
    throw error;
  }

  // Test 5: Test SPL token game creation
  console.log('Testing SPL token game creation...');
  try {
    // Create a new SPL token mint
    const mint = await createMint(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      provider.wallet.publicKey,
      null,
      9
    );

    // Create admin's token account
    const adminTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      mint,
      provider.wallet.publicKey
    );

    const newGameCode = 'GAME2';

    // Derive game PDA
    const [gamePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('game'),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from(newGameCode),
      ],
      program.programId
    );

    // Derive vault PDA - using exact same seeds as Rust program
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from(newGameCode),
      ],
      program.programId
    );

    // Calculate minimum rent for token account
    const rentExempt =
      await provider.connection.getMinimumBalanceForRentExemption(165);

    // Initialize the game
    const tx = await program.methods
      .initGame(
        validName,
        newGameCode,
        validEntryFee,
        validCommission,
        validStartTime,
        validEndTime,
        validMaxWinners,
        validAnswerHash,
        new anchor.BN(0)
      )
      .accounts({
        admin: provider.wallet.publicKey,
        game: gamePda,
        tokenMint: mint,
        vault: vaultPda,
        adminTokenAccount: adminTokenAccount.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([
        // Optional: Add a pre-instruction to fund the vault with enough lamports
        SystemProgram.transfer({
          fromPubkey: provider.wallet.publicKey,
          toPubkey: vaultPda,
          lamports: rentExempt,
        }),
      ])
      .rpc();

    await confirm(tx);

    // Verify game state
    const gameState = await program.account.game.fetch(gamePda);
    expect(gameState.tokenMint.equals(mint)).to.be.true;
    expect(gameState.isNative).to.be.false;
    expect(gameState.name).to.equal(validName);
    expect(gameState.gameCode).to.equal(newGameCode);

    // For SPL token games, verify the vault token account
    if (!gameState.isNative) {
      const vaultAccount = await getAccount(provider.connection, vaultPda);
      expect(vaultAccount.mint.equals(mint)).to.be.true;
      expect(vaultAccount.owner.equals(gamePda)).to.be.true;
    }

    console.log('SPL token game creation test passed');
  } catch (error) {
    console.error('SPL token game creation failed:', error);
    throw error;
  }

  // Test 6: Native SOL game creation with donation
  console.log('Testing native SOL game creation with donation...');
  try {
    const newGameCode = 'GAME3';
    const tx = await executeInitGame({
      name: validName,
      gameCode: newGameCode,
      entryFee: validEntryFee,
      commission: validCommission,
      startTime: validStartTime,
      endTime: validEndTime,
      maxWinners: validMaxWinners,
      answerHash: validAnswerHash,
      tokenMint: NATIVE_MINT,
      donationAmount: validDonationAmount,
      adminTokenAccount: null,
    });
    await confirm(tx);

    const [gamePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('game'),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from(newGameCode),
      ],
      program.programId
    );

    const [vaultPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from(newGameCode),
      ],
      program.programId
    );

    const gameState = await program.account.game.fetch(gamePda);
    expect(gameState.donationAmount.eq(validDonationAmount)).to.be.true;
    expect(gameState.isNative).to.be.true;

    // Get minimum rent exemption for the vault account
    const rentExemption =
      await provider.connection.getMinimumBalanceForRentExemption(0);

    // Verify vault balance includes both donation amount and rent exemption
    const vaultBalance = await provider.connection.getBalance(vaultPda);
    expect(vaultBalance).to.equal(
      validDonationAmount.toNumber() + rentExemption
    );

    console.log('Native SOL game creation with donation test passed');
  } catch (error) {
    console.error('Native SOL game creation with donation failed:', error);
    throw error;
  }

  // Test 7: SPL token game creation with donation
  console.log('Testing SPL token game creation with donation...');
  try {
    const mint = await createMint(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      provider.wallet.publicKey,
      provider.wallet.publicKey,
      9
    );

    const adminTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      mint,
      provider.wallet.publicKey
    );

    await mintTo(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      mint,
      adminTokenAccount.address,
      provider.wallet.publicKey,
      validDonationAmount.toNumber()
    );

    const newGameCode = 'GAME4';
    const tx = await executeInitGame({
      name: validName,
      gameCode: newGameCode,
      entryFee: validEntryFee,
      commission: validCommission,
      startTime: validStartTime,
      endTime: validEndTime,
      maxWinners: validMaxWinners,
      answerHash: validAnswerHash,
      tokenMint: mint,
      donationAmount: validDonationAmount,
      adminTokenAccount: adminTokenAccount.address,
    });
    await confirm(tx);

    const [gamePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('game'),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from(newGameCode),
      ],
      program.programId
    );

    const [vaultPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from(newGameCode),
      ],
      program.programId
    );

    const gameState = await program.account.game.fetch(gamePda);
    expect(gameState.donationAmount.eq(validDonationAmount)).to.be.true;
    expect(gameState.isNative).to.be.false;

    // Verify vault token balance
    const vaultToken = await getAccount(provider.connection, vaultPda);
    expect(Number(vaultToken.amount)).to.equal(validDonationAmount.toNumber());

    console.log('SPL token game creation with donation test passed');
  } catch (error) {
    console.error('SPL token game creation with donation failed:', error);
    throw error;
  }

  console.log('All game initialization tests completed successfully');
}
