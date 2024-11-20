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
  createAssociatedTokenAccountInstruction,
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
  const validCommission = 500;
  const now = Math.floor(Date.now() / 1000);
  const validStartTime = new anchor.BN(now + 3600);
  const validEndTime = new anchor.BN(now + 7200);
  const validMaxWinners = 5;
  const validAnswerHash = Array(32).fill(1);
  const validDonationAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL);
  const allAreWinners = false;
  const evenSplit = false;

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
    allAreWinners?: boolean;
    evenSplit?: boolean;
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
        params.donationAmount || new anchor.BN(0),
        params.allAreWinners || false,
        params.evenSplit || false
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

    // Derive PDAs
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

    // Get the associated token account for the vault
    const associatedTokenAddress = await anchor.utils.token.associatedAddress({
      mint: mint,
      owner: vaultPda,
    });

    // Create the token account for the vault if it doesn't exist
    const vaultTokenAccountIx = await createAssociatedTokenAccountInstruction(
      provider.wallet.publicKey, // payer
      associatedTokenAddress, // associated token account address
      vaultPda, // owner
      mint // mint
    );

    console.log('Game PDA:', gamePda.toBase58());
    console.log('Vault PDA:', vaultPda.toBase58());
    console.log('Vault Token Account:', associatedTokenAddress.toBase58());

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
        new anchor.BN(0),
        allAreWinners,
        evenSplit
      )
      .accounts({
        admin: provider.wallet.publicKey,
        game: gamePda,
        tokenMint: mint,
        vault: vaultPda,
        vaultTokenAccount: associatedTokenAddress,
        adminTokenAccount: adminTokenAccount.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([vaultTokenAccountIx])
      .rpc();

    await confirm(tx);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify game state
    const gameState = await program.account.game.fetch(gamePda);
    expect(gameState.tokenMint.equals(mint)).to.be.true;
    expect(gameState.isNative).to.be.false;
    expect(gameState.name).to.equal(validName);
    expect(gameState.gameCode).to.equal(newGameCode);

    // For SPL token games, verify the vault's token account
    if (!gameState.isNative) {
      const vaultAccount = await getAccount(
        provider.connection,
        associatedTokenAddress
      );
      expect(vaultAccount.mint.equals(mint)).to.be.true;
      expect(vaultAccount.owner.equals(vaultPda)).to.be.true;
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

    // Get rent exemption
    const rentExemption =
      await provider.connection.getMinimumBalanceForRentExemption(0);
    console.log('Rent exemption:', rentExemption);

    // Create instruction to fund rent exemption
    const rentTransferIx = SystemProgram.transfer({
      fromPubkey: provider.wallet.publicKey,
      toPubkey: vaultPda,
      lamports: rentExemption,
    });

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
        validDonationAmount,
        allAreWinners,
        evenSplit
      )
      .accounts({
        admin: provider.wallet.publicKey,
        game: gamePda,
        tokenMint: NATIVE_MINT,
        vault: vaultPda,
        vaultTokenAccount: null,
        adminTokenAccount: null,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([rentTransferIx])
      .rpc();

    await confirm(tx);

    const gameState = await program.account.game.fetch(gamePda);
    expect(gameState.donationAmount.eq(validDonationAmount)).to.be.true;
    expect(gameState.isNative).to.be.true;

    // Verify vault balance includes both donation amount and rent exemption
    const vaultBalance = await provider.connection.getBalance(vaultPda);
    const expectedBalance = validDonationAmount.toNumber() + rentExemption;

    console.log('Vault balance:', vaultBalance);
    console.log('Expected balance:', expectedBalance);
    console.log('Donation amount:', validDonationAmount.toNumber());

    expect(vaultBalance).to.equal(expectedBalance);

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

    // Mint tokens to admin for donation
    await mintTo(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      mint,
      adminTokenAccount.address,
      provider.wallet.publicKey,
      validDonationAmount.toNumber()
    );

    const newGameCode = 'GAME4';

    // Derive PDAs
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

    // Get the associated token account for the vault
    const associatedTokenAddress = await anchor.utils.token.associatedAddress({
      mint: mint,
      owner: vaultPda,
    });

    // Create the token account for the vault
    const vaultTokenAccountIx = await createAssociatedTokenAccountInstruction(
      provider.wallet.publicKey, // payer
      associatedTokenAddress, // associated token account address
      vaultPda, // owner
      mint // mint
    );

    console.log('Donation Test - Game PDA:', gamePda.toBase58());
    console.log('Donation Test - Vault PDA:', vaultPda.toBase58());
    console.log(
      'Donation Test - Vault Token Account:',
      associatedTokenAddress.toBase58()
    );
    console.log(
      'Donation Test - Admin Token Account:',
      adminTokenAccount.address.toBase58()
    );
    console.log(
      'Donation Test - Donation Amount:',
      validDonationAmount.toNumber()
    );

    // Check admin's initial balance
    const adminInitialBalance = Number(
      (await getAccount(provider.connection, adminTokenAccount.address)).amount
    );
    console.log('Admin initial token balance:', adminInitialBalance);

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
        validDonationAmount,
        allAreWinners,
        evenSplit
      )
      .accounts({
        admin: provider.wallet.publicKey,
        game: gamePda,
        tokenMint: mint,
        vault: vaultPda,
        vaultTokenAccount: associatedTokenAddress,
        adminTokenAccount: adminTokenAccount.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([vaultTokenAccountIx])
      .rpc();

    await confirm(tx);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify game state
    const gameState = await program.account.game.fetch(gamePda);
    console.log('Game state after init:', {
      isNative: gameState.isNative,
      donationAmount: gameState.donationAmount.toString(),
      tokenMint: gameState.tokenMint.toBase58(),
    });

    expect(gameState.donationAmount.eq(validDonationAmount)).to.be.true;
    expect(gameState.isNative).to.be.false;

    // Verify admin's balance decreased by donation amount
    const adminFinalBalance = Number(
      (await getAccount(provider.connection, adminTokenAccount.address)).amount
    );
    console.log('Admin final token balance:', adminFinalBalance);
    expect(adminInitialBalance - adminFinalBalance).to.equal(
      validDonationAmount.toNumber()
    );

    // Verify vault token balance
    const vaultAccount = await getAccount(
      provider.connection,
      associatedTokenAddress
    );
    console.log('Vault token balance:', Number(vaultAccount.amount));
    expect(Number(vaultAccount.amount)).to.equal(
      validDonationAmount.toNumber()
    );

    console.log('SPL token game creation with donation test passed');
  } catch (error) {
    console.error('SPL token game creation with donation failed:', error);
    if (error.logs) {
      console.error('Error logs:', error.logs);
    }
    throw error;
  }

  console.log('All game initialization tests completed successfully');
}
