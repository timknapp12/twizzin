import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { TwizzinBe2 } from '../target/types/twizzin_be_2';
import { expect } from 'chai';
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js';
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
  const newCommission = 700;
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
      tokenMint?: PublicKey;
      adminTokenAccount?: PublicKey | null;
      vaultTokenAccount?: PublicKey | null;
      allAreWinners?: boolean;
      evenSplit?: boolean;
    }
  ) => {
    const gameState = await program.account.game.fetch(game);
    const adminPubkey = params.admin
      ? params.admin.publicKey
      : provider.wallet.publicKey;
    const adminSigner = params.admin ? [params.admin] : [];

    // Always derive vault PDA from game state
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

    // Get or create vault token account for SPL tokens
    let vaultTokenAccount = params.vaultTokenAccount;
    if (!isNative && !vaultTokenAccount) {
      const vaultAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        (provider.wallet as anchor.Wallet).payer,
        tokenMint,
        vaultPda,
        true
      );
      vaultTokenAccount = vaultAta.address;
    }

    // Build accounts object
    const accounts = {
      admin: adminPubkey,
      game,
      vault: vaultPda,
      vaultTokenAccount: isNative ? null : vaultTokenAccount,
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
      systemProgram: SystemProgram.programId,
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
        params.donationAmount === undefined ? null : params.donationAmount,
        params.allAreWinners === undefined ? null : params.allAreWinners,
        params.evenSplit === undefined ? null : params.evenSplit
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

  // Get rent exemption for vault
  const rentExemption =
    await provider.connection.getMinimumBalanceForRentExemption(0);
  const rentTransferIx = SystemProgram.transfer({
    fromPubkey: provider.wallet.publicKey,
    toPubkey: vaultPda,
    lamports: rentExemption,
  });

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
      new anchor.BN(0),
      false, // allAreWinners
      false // evenSplit
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

  await confirm(initTx);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Test 1: Name too long
  console.log('Testing name too long...');
  try {
    await executeUpdateGame(gamePda, {
      name: 'x'.repeat(33),
      tokenMint: NATIVE_MINT,
      adminTokenAccount: null,
      vaultTokenAccount: null,
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
      vaultTokenAccount: null,
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
      vaultTokenAccount: null,
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
      vaultTokenAccount: null,
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
      vaultTokenAccount: null,
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

    const rentExemption =
      await provider.connection.getMinimumBalanceForRentExemption(0);
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
      vaultTokenAccount: null,
    });
    await confirm(tx);

    const gameState = await program.account.game.fetch(gamePda);
    expect(gameState.donationAmount.eq(newDonation)).to.be.true;

    const rentExemption =
      await provider.connection.getMinimumBalanceForRentExemption(0);
    const vaultBalance = await provider.connection.getBalance(vaultPda);
    expect(vaultBalance).to.equal(newDonation.toNumber() + rentExemption);

    console.log('Native SOL donation update test passed');
  } catch (error) {
    console.error('Native SOL donation update failed:', error);
    throw error;
  }

  // Test 7: Decrease native SOL donation amount
  console.log('Testing native SOL donation decrease...');
  try {
    const currentGameState = await program.account.game.fetch(gamePda);
    const decreasedDonation = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
    const initialVaultBalance = await provider.connection.getBalance(vaultPda);

    const tx = await executeUpdateGame(gamePda, {
      donationAmount: decreasedDonation,
      tokenMint: NATIVE_MINT,
      adminTokenAccount: null,
      vaultTokenAccount: null,
    });
    await confirm(tx);

    const gameState = await program.account.game.fetch(gamePda);
    expect(gameState.donationAmount.eq(decreasedDonation)).to.be.true;

    const rentExemption =
      await provider.connection.getMinimumBalanceForRentExemption(0);
    const finalVaultBalance = await provider.connection.getBalance(vaultPda);
    expect(finalVaultBalance).to.equal(
      decreasedDonation.toNumber() + rentExemption
    );
    expect(initialVaultBalance - finalVaultBalance).to.equal(
      currentGameState.donationAmount.sub(decreasedDonation).toNumber()
    );

    console.log('Native SOL donation decrease test passed');
  } catch (error) {
    console.error('Native SOL donation decrease failed:', error);
    throw error;
  }

  let mint: PublicKey;
  let adminTokenAccount: { address: PublicKey };

  // Test 8: SPL token game update
  console.log('Testing SPL token game update...');
  try {
    // Create new SPL token mint and accounts
    mint = await createMint(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      provider.wallet.publicKey,
      provider.wallet.publicKey,
      9
    );

    adminTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      mint,
      provider.wallet.publicKey
    );

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

    // Create the vault's ATA
    const vaultAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      mint,
      splVaultPda,
      true
    );

    // Mint tokens for testing
    await mintTo(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      mint,
      adminTokenAccount.address,
      provider.wallet.publicKey,
      2000000
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
        new anchor.BN(0),
        false, // allAreWinners
        false // evenSplit
      )
      .accounts({
        admin: provider.wallet.publicKey,
        game: splGamePda,
        tokenMint: mint,
        vault: splVaultPda,
        vaultTokenAccount: vaultAta.address,
        adminTokenAccount: adminTokenAccount.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Update SPL token game
    const splDonation = new anchor.BN(1000000);
    const tx = await executeUpdateGame(splGamePda, {
      name: 'Updated SPL Game',
      donationAmount: splDonation,
      tokenMint: mint,
      adminTokenAccount: adminTokenAccount.address,
      vaultTokenAccount: vaultAta.address,
    });
    await confirm(tx);

    const gameState = await program.account.game.fetch(splGamePda);
    expect(gameState.name).to.equal('Updated SPL Game');
    expect(gameState.donationAmount.eq(splDonation)).to.be.true;
    expect(gameState.isNative).to.be.false;

    const vaultAccount = await getAccount(
      provider.connection,
      vaultAta.address
    );
    expect(Number(vaultAccount.amount)).to.equal(splDonation.toNumber());

    console.log('SPL token game update test passed');
  } catch (error) {
    console.error('SPL token game update failed:', error);
    throw error;
  }

  // Test 9: Increase SPL token donation amount
  console.log('Testing SPL token donation increase...');
  try {
    const [splGamePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('game'),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from('SPLGAME1'),
      ],
      program.programId
    );

    const [splVaultPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from('SPLGAME1'),
      ],
      program.programId
    );

    // Get the vault's ATA
    const vaultAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      mint,
      splVaultPda,
      true
    );

    const increasedSplDonation = new anchor.BN(1500000);
    const initialVaultBalance = Number(
      (await getAccount(provider.connection, vaultAta.address)).amount
    );

    const tx = await executeUpdateGame(splGamePda, {
      donationAmount: increasedSplDonation,
      tokenMint: mint,
      adminTokenAccount: adminTokenAccount.address,
      vaultTokenAccount: vaultAta.address,
    });
    await confirm(tx);

    // Wait a bit for the transaction to be confirmed
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const gameState = await program.account.game.fetch(splGamePda);
    expect(gameState.donationAmount.eq(increasedSplDonation)).to.be.true;

    const vaultAccount = await getAccount(
      provider.connection,
      vaultAta.address
    );
    console.log('New vault balance:', Number(vaultAccount.amount));
    expect(Number(vaultAccount.amount)).to.equal(
      increasedSplDonation.toNumber()
    );
    expect(Number(vaultAccount.amount) - initialVaultBalance).to.equal(500000);

    console.log('SPL token donation increase test passed');
  } catch (error) {
    console.error('SPL token donation increase failed:', error);
    throw error;
  }

  // Test 10: Decrease SPL token donation amount
  console.log('Testing SPL token donation decrease...');
  try {
    const [splGamePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('game'),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from('SPLGAME1'),
      ],
      program.programId
    );

    const [splVaultPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from('SPLGAME1'),
      ],
      program.programId
    );

    // Get the vault's ATA
    const vaultAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      mint,
      splVaultPda,
      true
    );

    const decreasedSplDonation = new anchor.BN(750000);
    const initialVaultBalance = Number(
      (await getAccount(provider.connection, vaultAta.address)).amount
    );

    const tx = await executeUpdateGame(splGamePda, {
      donationAmount: decreasedSplDonation,
      tokenMint: mint,
      adminTokenAccount: adminTokenAccount.address,
      vaultTokenAccount: vaultAta.address,
    });
    await confirm(tx);

    // Wait a bit for the transaction to be confirmed
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const gameState = await program.account.game.fetch(splGamePda);
    expect(gameState.donationAmount.eq(decreasedSplDonation)).to.be.true;

    const vaultAccount = await getAccount(
      provider.connection,
      vaultAta.address
    );
    console.log('Final vault balance:', Number(vaultAccount.amount));
    expect(Number(vaultAccount.amount)).to.equal(
      decreasedSplDonation.toNumber()
    );
    expect(initialVaultBalance - Number(vaultAccount.amount)).to.equal(750000);

    console.log('SPL token donation decrease test passed');
  } catch (error) {
    console.error('SPL token donation decrease failed:', error);
    throw error;
  }

  console.log('All game update tests completed successfully');
}
