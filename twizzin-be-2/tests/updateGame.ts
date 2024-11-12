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
  getAccount,
} from '@solana/spl-token';

export async function updateGame(
  program: Program<TwizzinBe2>,
  provider: anchor.AnchorProvider,
  confirm: (signature: string) => Promise<string>
) {
  console.log('Starting game update tests');

  // Test parameters
  const newName = 'Updated Game';
  const newEntryFee = new anchor.BN(0.2 * LAMPORTS_PER_SOL);
  const newCommission = 7;
  const now = Math.floor(Date.now() / 1000);
  const newStartTime = new anchor.BN(now + 4800);
  const newEndTime = new anchor.BN(now + 9600);
  const validMaxWinners = 3;
  const newAnswerHash = Array(32).fill(2);
  const gameCode = 'UPDATEGAME1';

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
      adminTokenAccount?: PublicKey | null;
    }
  ) => {
    const gameState = await program.account.game.fetch(game);
    const adminPubkey = params.admin
      ? params.admin.publicKey
      : provider.wallet.publicKey;
    const adminSigner = params.admin ? [params.admin] : [];

    const [vaultPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'),
        gameState.admin.toBuffer(),
        Buffer.from(gameState.gameCode),
      ],
      program.programId
    );

    const tokenMint = params.tokenMint || gameState.tokenMint;
    const isNative = tokenMint.equals(NATIVE_MINT);

    const accounts = {
      admin: adminPubkey,
      game,
      vault: params.vault || vaultPda,
      tokenMint,
      adminTokenAccount: isNative
        ? null
        : params.adminTokenAccount ||
          (
            await getOrCreateAssociatedTokenAccount(
              provider.connection,
              (provider.wallet as anchor.Wallet).payer,
              tokenMint,
              adminPubkey
            )
          ).address,
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
    const hasExpectedError = errorTypes.some((type) =>
      errorString.includes(type)
    );
    expect(
      hasExpectedError,
      `Expected one of [${errorTypes}] but got: ${errorString}`
    ).to.be.true;
  };

  // First create a game for native SOL testing
  console.log('Creating test game for native SOL...');
  const [gamePda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('game'),
      provider.wallet.publicKey.toBuffer(),
      Buffer.from(gameCode),
    ],
    program.programId
  );

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('vault'),
      provider.wallet.publicKey.toBuffer(),
      Buffer.from(gameCode),
    ],
    program.programId
  );

  // Initialize native SOL game
  const initTx = await program.methods
    .initGame(
      'Test Game',
      gameCode,
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
      game: gamePda,
      tokenMint: NATIVE_MINT,
      vault: vaultPda,
      adminTokenAccount: null,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  await confirm(initTx);

  // Wait a bit to ensure the account is initialized
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Test 1: Name too long
  console.log('Testing name too long...');
  try {
    await executeUpdateGame(gamePda, {
      name: 'x'.repeat(33),
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
    await executeUpdateGame(gamePda, {
      startTime: newEndTime,
      endTime: newStartTime,
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
    await executeUpdateGame(gamePda, {
      maxWinners: 0,
      tokenMint: NATIVE_MINT,
      adminTokenAccount: null,
    });
    throw new Error('Should have failed with max winners too low');
  } catch (error) {
    expectError(error, ['MaxWinnersTooLow']);
  }

  // Test 4: Unauthorized update
  console.log('Testing unauthorized update...');
  try {
    const unauthorizedUser = anchor.web3.Keypair.generate();
    await executeUpdateGame(gamePda, {
      name: newName,
      admin: unauthorizedUser,
      tokenMint: NATIVE_MINT,
      adminTokenAccount: null,
    });
    throw new Error('Should have failed with unauthorized update');
  } catch (error) {
    expectError(error, ['InvalidAuthority']);
  }

  // Test 5: Successful native SOL update
  console.log('Testing successful native SOL update...');
  try {
    const initialDonation = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
    const tx = await executeUpdateGame(gamePda, {
      name: newName,
      entryFee: newEntryFee,
      commission: newCommission,
      startTime: newStartTime,
      endTime: newEndTime,
      maxWinners: validMaxWinners,
      answerHash: newAnswerHash,
      donationAmount: initialDonation,
      tokenMint: NATIVE_MINT,
      adminTokenAccount: null,
    });
    await confirm(tx);

    const gameState = await program.account.game.fetch(gamePda);
    expect(gameState.name).to.equal(newName);
    expect(gameState.entryFee.eq(newEntryFee)).to.be.true;
    expect(gameState.commission).to.equal(newCommission);
    expect(gameState.startTime.eq(newStartTime)).to.be.true;
    expect(gameState.endTime.eq(newEndTime)).to.be.true;
    expect(gameState.maxWinners).to.equal(validMaxWinners);
    expect(gameState.answerHash).to.deep.equal(newAnswerHash);
    expect(gameState.donationAmount.eq(initialDonation)).to.be.true;

    // Get minimum rent exemption for the vault account
    const rentExemption =
      await provider.connection.getMinimumBalanceForRentExemption(0);

    // Verify vault balance includes both donation amount and rent exemption
    const vaultBalance = await provider.connection.getBalance(vaultPda);
    expect(vaultBalance).to.equal(initialDonation.toNumber() + rentExemption);

    console.log('Native SOL update test passed');
  } catch (error) {
    console.error('Native SOL update failed:', error);
    throw error;
  }

  // Test 6: Update native SOL donation amount
  console.log('Testing native SOL donation update...');
  try {
    const newDonation = new anchor.BN(0.2 * LAMPORTS_PER_SOL);
    const tx = await executeUpdateGame(gamePda, {
      donationAmount: newDonation,
      tokenMint: NATIVE_MINT,
      adminTokenAccount: null,
    });
    await confirm(tx);

    const gameState = await program.account.game.fetch(gamePda);
    expect(gameState.donationAmount.eq(newDonation)).to.be.true;

    // Get minimum rent exemption for the vault account
    const rentExemption =
      await provider.connection.getMinimumBalanceForRentExemption(0);

    // Verify vault balance includes both donation amount and rent exemption
    const vaultBalance = await provider.connection.getBalance(vaultPda);
    expect(vaultBalance).to.equal(newDonation.toNumber() + rentExemption);

    console.log('Native SOL donation update test passed');
  } catch (error) {
    console.error('Native SOL donation update failed:', error);
    throw error;
  }

  // Test 7: SPL token game update
  console.log('Testing SPL token game update...');
  try {
    // Create new SPL token mint and accounts
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

    // Create an SPL token game
    const splGameCode = 'SPLGAME1';
    const [splGamePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('game'),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from(splGameCode),
      ],
      program.programId
    );

    const [splVaultPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from(splGameCode),
      ],
      program.programId
    );

    // Initialize SPL token game
    await program.methods
      .initGame(
        'SPL Test Game',
        splGameCode,
        new anchor.BN(1000000),
        5,
        new anchor.BN(now + 3600),
        new anchor.BN(now + 7200),
        5,
        Array(32).fill(1),
        new anchor.BN(0)
      )
      .accounts({
        admin: provider.wallet.publicKey,
        game: splGamePda,
        tokenMint: mint,
        vault: splVaultPda,
        adminTokenAccount: adminTokenAccount.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Mint tokens for testing
    await mintTo(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      mint,
      adminTokenAccount.address,
      provider.wallet.publicKey,
      2000000
    );

    // Update SPL token game
    const splDonation = new anchor.BN(1000000);
    const tx = await executeUpdateGame(splGamePda, {
      name: 'Updated SPL Game',
      donationAmount: splDonation,
      tokenMint: mint,
      adminTokenAccount: adminTokenAccount.address,
    });
    await confirm(tx);

    // Verify game state
    const gameState = await program.account.game.fetch(splGamePda);
    expect(gameState.name).to.equal('Updated SPL Game');
    expect(gameState.donationAmount.eq(splDonation)).to.be.true;
    expect(gameState.isNative).to.be.false;

    // Verify vault token balance
    const vaultAccount = await getAccount(provider.connection, splVaultPda);
    expect(Number(vaultAccount.amount)).to.equal(splDonation.toNumber());

    console.log('SPL token game update test passed');
  } catch (error) {
    console.error('SPL token game update failed:', error);
    throw error;
  }

  console.log('All game update tests completed successfully');
}
