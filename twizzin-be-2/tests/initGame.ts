import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { TwizzinBe2 } from '../target/types/twizzin_be_2';
import { expect } from 'chai';
import { SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, NATIVE_MINT, createMint } from '@solana/spl-token';

export async function initializeGame(
  program: Program<TwizzinBe2>,
  provider: anchor.AnchorProvider,
  confirm: (signature: string) => Promise<string>
) {
  console.log('Starting game initialization tests');

  // Test parameters
  const validName = 'Test Game';
  const validGameCode = 'GAME1';
  const validEntryFee = new anchor.BN(0.1 * LAMPORTS_PER_SOL); // 0.1 SOL
  const validCommission = 5; // 5%
  const now = Math.floor(Date.now() / 1000);
  const validStartTime = new anchor.BN(now + 3600); // 1 hour from now
  const validEndTime = new anchor.BN(now + 7200); // 2 hours from now
  const validMaxWinners = 5;
  const validAnswerHash = Array(32).fill(1); // Example hash

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
    admin?: anchor.web3.Keypair;
  }) => {
    // Get the public key whether it's from a keypair or the wallet
    const adminPubkey = params.admin
      ? params.admin.publicKey
      : provider.wallet.publicKey;
    const adminSigner = params.admin ? [params.admin] : [];

    // Derive PDAs
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

    return program.methods
      .initGame(
        params.name,
        params.gameCode,
        params.entryFee,
        params.commission,
        params.startTime,
        params.endTime,
        params.maxWinners,
        params.answerHash
      )
      .accounts({
        admin: adminPubkey,
        game: gamePda,
        tokenMint: params.tokenMint,
        vault: vaultPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
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
    });
    throw new Error('Should have failed with invalid time range');
  } catch (error) {
    expectError(error, ['InvalidTimeRange']);
  }

  // Test 3: Invalid max winners
  console.log('Testing invalid max winners...');
  try {
    await executeInitGame({
      name: validName,
      gameCode: validGameCode,
      entryFee: validEntryFee,
      commission: validCommission,
      startTime: validStartTime,
      endTime: validEndTime,
      maxWinners: 11,
      answerHash: validAnswerHash,
      tokenMint: NATIVE_MINT,
    });
    throw new Error('Should have failed with invalid max winners');
  } catch (error) {
    expectError(error, ['MaxWinnersTooHigh']);
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
    });
    await confirm(tx);

    // Verify game account data
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

    const newGameCode = 'GAME2';
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
    });
    await confirm(tx);

    // Derive PDAs for verification
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

    // Verify game account data
    const gameState = await program.account.game.fetch(gamePda);
    expect(gameState.tokenMint.equals(mint)).to.be.true;

    // Verify vault account
    const vaultAccount = await provider.connection.getAccountInfo(vaultPda);
    expect(vaultAccount).to.not.be.null;
    expect(vaultAccount!.owner.equals(TOKEN_PROGRAM_ID)).to.be.true;

    console.log('SPL token game creation test passed');
  } catch (error) {
    console.error('SPL token game creation failed:', error);
    throw error;
  }

  // Test 6: Double initialization with same game code
  console.log('Testing double initialization...');
  try {
    await executeInitGame({
      name: validName,
      gameCode: validGameCode, // Use same game code as first successful test
      entryFee: validEntryFee,
      commission: validCommission,
      startTime: validStartTime,
      endTime: validEndTime,
      maxWinners: validMaxWinners,
      answerHash: validAnswerHash,
      tokenMint: NATIVE_MINT,
    });
    throw new Error('Should have failed with double initialization');
  } catch (error) {
    expectError(error, ['already in use', 'Error processing Instruction']);
  }

  console.log('All game initialization tests completed successfully');
}
