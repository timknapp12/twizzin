import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { TwizzinBe2 } from '../target/types/twizzin_be_2';
import { expect } from 'chai';
import {
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL,
  Keypair,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  createMint,
  getOrCreateAssociatedTokenAccount,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  mintTo,
  getAccount,
} from '@solana/spl-token';

export async function endGame(
  program: Program<TwizzinBe2>,
  provider: anchor.AnchorProvider,
  confirm: (signature: string) => Promise<string>
) {
  console.log('Starting end game tests');

  // At the start of the end game tests, add a unique identifier
  const uniqueId = Math.floor(Math.random() * 1000000);
  const getUniqueGameCode = (base: string) => `${base}${uniqueId}`;

  // Test 1: Native SOL with max_winners < total_players
  console.log('\nTest 1: SOL - Max Winners < Total Players');
  const gameCode1 = getUniqueGameCode('END1');
  const entryFee = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
  const commission = 500;
  const now = Math.floor(Date.now() / 1000);
  const startTime = new anchor.BN(now);
  const endTime = new anchor.BN(now + 3600);
  const maxWinners = 3;
  const totalPlayers = 4;
  const answerHash = Array(32).fill(1);
  const donationAmount = new anchor.BN(1 * LAMPORTS_PER_SOL);
  const allAreWinners = false;
  const evenSplit = false;

  // Get rent exemption for calculations
  const connection = provider.connection;
  const rentExemption = await connection.getMinimumBalanceForRentExemption(
    program.account.game.size
  );

  // Expected amounts for Test 1
  const MARGIN = 100_000_000; // 0.1 SOL margin
  const totalPot =
    donationAmount.toNumber() + entryFee.toNumber() * totalPlayers;
  const distributablePot = totalPot - rentExemption;
  const expectedTreasuryFee = Math.floor(distributablePot * (600 / 10000));
  const expectedCommission = Math.floor(
    distributablePot * (commission / 10000)
  );

  // Create and fund players
  const players1 = Array(totalPlayers)
    .fill(0)
    .map(() => Keypair.generate());
  for (const player of players1) {
    const tx = await provider.connection.requestAirdrop(
      player.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await confirm(tx);
  }

  // Helper function to find PDAs
  const findPDAs = (gameCode: string, admin: PublicKey) => {
    const [gamePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('game'), admin.toBuffer(), Buffer.from(gameCode)],
      program.programId
    );

    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), admin.toBuffer(), Buffer.from(gameCode)],
      program.programId
    );

    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      program.programId
    );

    return { gamePda, vaultPda, configPda };
  };

  // Helper to find player PDA
  const findPlayerPDA = (game: PublicKey, player: PublicKey) => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('player'), game.toBuffer(), player.toBuffer()],
      program.programId
    )[0];
  };

  // Initialize game
  const { gamePda, vaultPda, configPda } = findPDAs(
    gameCode1,
    provider.wallet.publicKey
  );

  const initTx = await program.methods
    .initGame(
      'Test Game 1',
      gameCode1,
      entryFee,
      commission,
      startTime,
      endTime,
      maxWinners,
      answerHash,
      donationAmount,
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
    .rpc();

  await confirm(initTx);

  // Helper to join game
  async function joinGame(
    player: Keypair,
    gamePda: PublicKey,
    vaultPda: PublicKey,
    isNative: boolean,
    tokenMint?: PublicKey,
    vaultTokenAccount?: PublicKey
  ) {
    const playerPda = findPlayerPDA(gamePda, player.publicKey);

    let playerTokenAccount;
    if (!isNative && tokenMint) {
      playerTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.payer,
        tokenMint,
        player.publicKey
      );
    }

    try {
      const accounts = {
        player: player.publicKey,
        game: gamePda,
        playerAccount: playerPda,
        vault: vaultPda,
        vaultTokenAccount: isNative ? null : vaultTokenAccount,
        playerTokenAccount: isNative ? null : playerTokenAccount?.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      };

      const tx = await program.methods
        .joinGame()
        .accounts(accounts)
        .signers([player])
        .rpc();

      await confirm(tx);
    } catch (error) {
      console.log(
        'Join game failed (player might already exist):',
        error.message
      );
    }
    return playerPda;
  }

  // Helper to submit answers
  async function submitAnswers(
    player: Keypair,
    gamePda: PublicKey,
    playerPda: PublicKey,
    numCorrect: number,
    finishTime: number
  ) {
    const answers = Array(numCorrect).fill({
      displayOrder: 1,
      answer: 'test',
      questionId: 'test',
      proof: [],
    });

    const tx = await program.methods
      .submitAnswers(answers, new anchor.BN(finishTime))
      .accounts({
        player: player.publicKey,
        game: gamePda,
        playerAccount: playerPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([player])
      .rpc();

    await confirm(tx);
  }

  // Players join and submit answers
  const playerPDAs1 = [];
  for (const player of players1) {
    const playerPda = await joinGame(player, gamePda, vaultPda, true);
    playerPDAs1.push(playerPda);
  }

  // Submit answers with different scores
  await submitAnswers(players1[0], gamePda, playerPDAs1[0], 10, now + 1000);
  await submitAnswers(players1[1], gamePda, playerPDAs1[1], 9, now + 1500);
  await submitAnswers(players1[2], gamePda, playerPDAs1[2], 8, now + 2000);
  await submitAnswers(players1[3], gamePda, playerPDAs1[3], 7, now + 2500);

  // Helper to end game
  async function executeEndGame(gameCode: string, tokenMint: PublicKey) {
    const { gamePda, vaultPda, configPda } = findPDAs(
      gameCode,
      provider.wallet.publicKey
    );

    const config = await program.account.programConfig.fetch(configPda);

    const tx = await program.methods
      .endGame()
      .accounts({
        admin: provider.wallet.publicKey,
        game: gamePda,
        vault: vaultPda,
        config: configPda,
        treasury: config.treasuryPubkey,
        vaultTokenAccount: null,
        adminTokenAccount: null,
        treasuryTokenAccount: null,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await confirm(tx);
    return tx;
  }

  // Get initial balances
  const initialAdminBalance = await provider.connection.getBalance(
    provider.wallet.publicKey
  );

  // Test 1 verification
  const initialVaultBalance = await provider.connection.getBalance(vaultPda);

  // End game
  await executeEndGame(gameCode1, NATIVE_MINT);

  // Verify final balances
  const finalVaultBalance = await provider.connection.getBalance(vaultPda);
  const finalAdminBalance = await provider.connection.getBalance(
    provider.wallet.publicKey
  );

  // Verify vault balance change
  expect(initialVaultBalance - finalVaultBalance).to.be.approximately(
    expectedTreasuryFee + expectedCommission,
    MARGIN,
    'Vault balance reduction should match treasury fee + commission'
  );

  // Verify remaining amounts
  const expectedRemainingBalance =
    totalPot - expectedTreasuryFee - expectedCommission;
  expect(finalVaultBalance).to.be.approximately(
    expectedRemainingBalance,
    MARGIN,
    'Final vault balance should match expected remaining balance'
  );
  expect(finalAdminBalance - initialAdminBalance).to.be.approximately(
    expectedCommission,
    MARGIN,
    'Admin balance increase should match commission'
  );

  // Test 2: Native SOL with max_winners > total_players
  console.log('\nTest 2: SOL - Max Winners > Total Players');
  const gameCode2 = getUniqueGameCode('END2');
  const players2 = Array(3)
    .fill(0)
    .map(() => Keypair.generate());
  const maxWinners2 = 5;

  // Get rent exemption for calculations
  const rentExemption2 = await connection.getMinimumBalanceForRentExemption(
    program.account.game.size
  );

  // Expected amounts for Test 2
  const totalPot2 =
    donationAmount.toNumber() + entryFee.toNumber() * players2.length;
  const distributablePot2 = totalPot2 - rentExemption2;
  const expectedTreasuryFee2 = Math.floor(distributablePot2 * (600 / 10000));
  const expectedCommission2 = Math.floor(
    distributablePot2 * (commission / 10000)
  );

  // Fund players
  for (const player of players2) {
    const tx = await provider.connection.requestAirdrop(
      player.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await confirm(tx);
  }

  // Initialize second game
  const { gamePda: gamePda2, vaultPda: vaultPda2 } = findPDAs(
    gameCode2,
    provider.wallet.publicKey
  );

  const initTx2 = await program.methods
    .initGame(
      'Test Game 2',
      gameCode2,
      entryFee,
      commission,
      startTime,
      endTime,
      maxWinners2,
      answerHash,
      donationAmount,
      allAreWinners,
      evenSplit
    )
    .accounts({
      admin: provider.wallet.publicKey,
      game: gamePda2,
      tokenMint: NATIVE_MINT,
      vault: vaultPda2,
      vaultTokenAccount: null,
      adminTokenAccount: null,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  await confirm(initTx2);

  // Players join and submit
  const playerPDAs2 = [];
  for (const player of players2) {
    const playerPda = await joinGame(player, gamePda2, vaultPda2, true);
    playerPDAs2.push(playerPda);
  }

  await submitAnswers(players2[0], gamePda2, playerPDAs2[0], 10, now + 1000);
  await submitAnswers(players2[1], gamePda2, playerPDAs2[1], 9, now + 1500);
  await submitAnswers(players2[2], gamePda2, playerPDAs2[2], 8, now + 2000);

  // Get initial balances
  const initialVaultBalance2 = await provider.connection.getBalance(vaultPda2);
  const initialAdminBalance2 = await provider.connection.getBalance(
    provider.wallet.publicKey
  );

  // End game
  await executeEndGame(gameCode2, NATIVE_MINT);

  // Verify final balances
  const finalVaultBalance2 = await provider.connection.getBalance(vaultPda2);
  const finalAdminBalance2 = await provider.connection.getBalance(
    provider.wallet.publicKey
  );

  // Verify vault balance change
  expect(initialVaultBalance2 - finalVaultBalance2).to.be.approximately(
    expectedTreasuryFee2 + expectedCommission2,
    MARGIN,
    'Vault balance reduction should match treasury fee + commission'
  );

  // Verify remaining amounts
  const expectedRemainingBalance2 =
    totalPot2 - expectedTreasuryFee2 - expectedCommission2;

  expect(finalVaultBalance2).to.be.approximately(
    expectedRemainingBalance2,
    MARGIN,
    'Final vault balance should match expected remaining balance'
  );
  expect(finalAdminBalance2 - initialAdminBalance2).to.be.approximately(
    expectedCommission2,
    MARGIN,
    'Admin balance increase should match commission'
  );

  // Test 3: Early ending of SOL game
  console.log('\nTest 3: SOL - Early Game End');
  const gameCode3 = getUniqueGameCode('END3');
  const players3 = Array(2)
    .fill(0)
    .map(() => Keypair.generate());
  const futureEndTime = new anchor.BN(now + 7200); // 2 hours in the future

  // Get rent exemption for calculations
  const rentExemption3 = await connection.getMinimumBalanceForRentExemption(
    program.account.game.size
  );

  // Expected amounts for Test 3
  const totalPot3 =
    donationAmount.toNumber() + entryFee.toNumber() * players3.length;
  const distributablePot3 = totalPot3 - rentExemption3;
  const expectedTreasuryFee3 = Math.floor(distributablePot3 * (600 / 10000)); // 6% instead of 10%
  const expectedCommission3 = Math.floor(
    distributablePot3 * (commission / 10000)
  );

  // Fund players
  for (const player of players3) {
    const tx = await provider.connection.requestAirdrop(
      player.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await confirm(tx);
  }

  // Initialize third game with future end time
  const { gamePda: gamePda3, vaultPda: vaultPda3 } = findPDAs(
    gameCode3,
    provider.wallet.publicKey
  );

  const initTx3 = await program.methods
    .initGame(
      'Test Game 3',
      gameCode3,
      entryFee,
      commission,
      startTime,
      futureEndTime, // Using future end time
      players3.length,
      answerHash,
      donationAmount,
      allAreWinners,
      evenSplit
    )
    .accounts({
      admin: provider.wallet.publicKey,
      game: gamePda3,
      tokenMint: NATIVE_MINT,
      vault: vaultPda3,
      vaultTokenAccount: null,
      adminTokenAccount: null,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  await confirm(initTx3);

  // Players join and submit
  const playerPDAs3 = [];
  for (const player of players3) {
    const playerPda = await joinGame(player, gamePda3, vaultPda3, true);
    playerPDAs3.push(playerPda);
  }

  await submitAnswers(players3[0], gamePda3, playerPDAs3[0], 10, now + 1000);
  await submitAnswers(players3[1], gamePda3, playerPDAs3[1], 9, now + 1500);

  // Get initial balances
  const initialVaultBalance3 = await provider.connection.getBalance(vaultPda3);
  const initialAdminBalance3 = await provider.connection.getBalance(
    provider.wallet.publicKey
  );

  // Fetch game account before ending
  const gameAccountBefore = await program.account.game.fetch(gamePda3);
  console.log('\nGame end time before:', gameAccountBefore.endTime.toString());

  // End game early
  await executeEndGame(gameCode3, NATIVE_MINT);

  // Fetch game account after ending
  const gameAccountAfter = await program.account.game.fetch(gamePda3);
  console.log('Game end time after:', gameAccountAfter.endTime.toString());

  // Verify final balances
  const finalVaultBalance3 = await provider.connection.getBalance(vaultPda3);
  const finalAdminBalance3 = await provider.connection.getBalance(
    provider.wallet.publicKey
  );

  // Verify amounts
  const expectedRemainingBalance3 =
    totalPot3 - expectedTreasuryFee3 - expectedCommission3;
  expect(finalVaultBalance3).to.be.approximately(
    expectedRemainingBalance3,
    MARGIN
  );
  expect(finalAdminBalance3 - initialAdminBalance3).to.be.approximately(
    expectedCommission3,
    MARGIN
  );
  // Verify that end time was updated to current time
  expect(gameAccountAfter.endTime.toNumber()).to.be.lessThan(
    gameAccountBefore.endTime.toNumber()
  );

  // Test 4: SPL Token game
  console.log('\nTest 4: SPL Token Game');
  const configState = await program.account.programConfig.fetch(configPda);
  const gameCode4 = getUniqueGameCode('END4');
  const players4 = Array(3)
    .fill(0)
    .map(() => Keypair.generate());
  const tokenMint = await createMint(
    provider.connection,
    provider.wallet.payer,
    provider.wallet.publicKey,
    null,
    6 // 6 decimals
  );

  // Create token accounts for admin and treasury
  const adminTokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    provider.wallet.payer,
    tokenMint,
    provider.wallet.publicKey
  );

  // Mint initial tokens to admin account for donation
  await mintTo(
    provider.connection,
    provider.wallet.payer,
    tokenMint,
    adminTokenAccount.address,
    provider.wallet.payer,
    donationAmount.toNumber() // Mint the donation amount to admin
  );

  const config = await program.account.programConfig.fetch(configPda);
  const treasuryTokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    provider.wallet.payer,
    tokenMint,
    config.treasuryPubkey
  );

  // Initialize fourth game
  const { gamePda: gamePda4, vaultPda: vaultPda4 } = findPDAs(
    gameCode4,
    provider.wallet.publicKey
  );

  // Create vault token account
  const vaultTokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    provider.wallet.payer,
    tokenMint,
    vaultPda4,
    true
  );

  const tokenEntryFee = new anchor.BN(1_000_000); // 1 token
  const tokenDonationAmount = new anchor.BN(5_000_000); // 5 tokens

  const initTx4 = await program.methods
    .initGame(
      'Test Game 4',
      gameCode4,
      tokenEntryFee,
      commission,
      startTime,
      endTime,
      players4.length,
      answerHash,
      tokenDonationAmount,
      allAreWinners,
      evenSplit
    )
    .accounts({
      admin: provider.wallet.publicKey,
      game: gamePda4,
      tokenMint: tokenMint,
      vault: vaultPda4,
      vaultTokenAccount: vaultTokenAccount.address,
      adminTokenAccount: adminTokenAccount.address,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  await confirm(initTx4);

  // Create and fund player token accounts
  for (const player of players4) {
    // First airdrop SOL for rent and fees
    const tx = await provider.connection.requestAirdrop(
      player.publicKey,
      0.1 * LAMPORTS_PER_SOL
    );
    await confirm(tx);

    // Then create and fund token account
    const playerTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      tokenMint,
      player.publicKey
    );

    // Mint tokens to player
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      tokenMint,
      playerTokenAccount.address,
      provider.wallet.payer,
      tokenEntryFee.toNumber() * 2
    );

    // Join game with proper vault token account
    const playerPda = await joinGame(
      player,
      gamePda4,
      vaultPda4,
      false,
      tokenMint,
      vaultTokenAccount.address
    );

    // Submit answers
    await submitAnswers(
      player,
      gamePda4,
      playerPda,
      10 - players4.indexOf(player),
      now + 1000 * (players4.indexOf(player) + 1)
    );
  }

  // Expected amounts for Test 4
  const totalPot4 =
    tokenDonationAmount.toNumber() + tokenEntryFee.toNumber() * players4.length;
  const distributablePot4 = totalPot4; // No rent exemption for tokens
  const expectedTreasuryFee4 = Math.floor(distributablePot4 * (600 / 10000)); // 6% fee (600 basis points)
  const expectedCommission4 = Math.floor(
    distributablePot4 * (commission / 10000)
  );

  // Get initial balances
  const initialVaultBalance4 = (
    await getAccount(provider.connection, vaultTokenAccount.address)
  ).amount;
  const initialAdminBalance4 = (
    await getAccount(provider.connection, adminTokenAccount.address)
  ).amount;
  const initialTreasuryBalance4 = (
    await getAccount(provider.connection, treasuryTokenAccount.address)
  ).amount;

  // End game
  await program.methods
    .endGame()
    .accounts({
      admin: provider.wallet.publicKey,
      game: gamePda4,
      vault: vaultPda4,
      config: configPda,
      treasury: config.treasuryPubkey,
      vaultTokenAccount: vaultTokenAccount.address,
      adminTokenAccount: adminTokenAccount.address,
      treasuryTokenAccount: treasuryTokenAccount.address,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  // Verify final balances
  const finalVaultBalance4 = (
    await getAccount(provider.connection, vaultTokenAccount.address)
  ).amount;
  const finalAdminBalance4 = (
    await getAccount(provider.connection, adminTokenAccount.address)
  ).amount;
  const finalTreasuryBalance4 = (
    await getAccount(provider.connection, treasuryTokenAccount.address)
  ).amount;

  // Verify amounts
  const TOKEN_MARGIN = 1000;
  expect(Number(initialVaultBalance4 - finalVaultBalance4)).to.be.approximately(
    expectedTreasuryFee4 + expectedCommission4,
    TOKEN_MARGIN,
    'Vault balance reduction should match treasury fee + commission'
  );
  expect(Number(finalAdminBalance4 - initialAdminBalance4)).to.be.approximately(
    expectedCommission4,
    TOKEN_MARGIN,
    'Admin balance increase should match commission'
  );
  expect(
    Number(finalTreasuryBalance4 - initialTreasuryBalance4)
  ).to.be.approximately(
    expectedTreasuryFee4,
    TOKEN_MARGIN,
    'Treasury balance increase should match expected fee'
  );

  console.log('\nAll end game tests completed successfully');
}
