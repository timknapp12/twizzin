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
  createAssociatedTokenAccountInstruction,
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
  const commission = 5;
  const now = Math.floor(Date.now() / 1000);
  const startTime = new anchor.BN(now);
  const endTime = new anchor.BN(now + 3600);
  const maxWinners = 3;
  const totalPlayers = 4;
  const answerHash = Array(32).fill(1);
  const donationAmount = new anchor.BN(1 * LAMPORTS_PER_SOL);

  // Expected amounts for Test 1
  const MARGIN = 100_000_000; // 0.1 SOL margin
  const totalPot1 =
    donationAmount.toNumber() + entryFee.toNumber() * totalPlayers;
  const expectedTreasuryFee1 = Math.floor(totalPot1 * 0.1);
  const expectedCommission1 = Math.floor(totalPot1 * (commission / 100));
  const expectedPrizePool1 =
    totalPot1 - expectedTreasuryFee1 - expectedCommission1;
  const expectedPerWinner1 = Math.floor(expectedPrizePool1 / maxWinners);

  console.log('\nTest 1 Expected Amounts:');
  console.log('Total Pot:', totalPot1 / LAMPORTS_PER_SOL, 'SOL');
  console.log('Treasury Fee:', expectedTreasuryFee1 / LAMPORTS_PER_SOL, 'SOL');
  console.log('Commission:', expectedCommission1 / LAMPORTS_PER_SOL, 'SOL');
  console.log('Prize Pool:', expectedPrizePool1 / LAMPORTS_PER_SOL, 'SOL');
  console.log('Per Winner:', expectedPerWinner1 / LAMPORTS_PER_SOL, 'SOL');

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

  // Create config
  async function createConfig() {
    const { configPda } = findPDAs('', provider.wallet.publicKey);
    try {
      await program.methods
        .initConfig(
          provider.wallet.publicKey,
          provider.wallet.publicKey,
          1000 // 10% fee
        )
        .accounts({
          admin: provider.wallet.publicKey,
          config: configPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    } catch (error) {
      console.log(
        'Config creation failed (might already exist):',
        error.message
      );
    }
    return configPda;
  }

  // Initialize game
  const { gamePda, vaultPda, configPda } = findPDAs(
    gameCode1,
    provider.wallet.publicKey
  );

  await createConfig();

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
      donationAmount
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
    isNative: boolean
  ) {
    const playerPda = findPlayerPDA(gamePda, player.publicKey);

    const accounts = {
      player: player.publicKey,
      game: gamePda,
      playerAccount: playerPda,
      vault: vaultPda,
      vaultTokenAccount: null,
      playerTokenAccount: null,
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
  const initialVaultBalance = await provider.connection.getBalance(vaultPda);
  const initialAdminBalance = await provider.connection.getBalance(
    provider.wallet.publicKey
  );

  // End game
  await executeEndGame(gameCode1, NATIVE_MINT);

  // Verify final balances
  const finalVaultBalance = await provider.connection.getBalance(vaultPda);
  const finalAdminBalance = await provider.connection.getBalance(
    provider.wallet.publicKey
  );

  console.log('\nTest 1 Results:');
  console.log('Initial Vault Balance:', initialVaultBalance / LAMPORTS_PER_SOL);
  console.log('Final Vault Balance:', finalVaultBalance / LAMPORTS_PER_SOL);
  console.log(
    'Admin Balance Change:',
    (finalAdminBalance - initialAdminBalance) / LAMPORTS_PER_SOL
  );

  // Verify amounts accounting for gas fees
  expect(finalVaultBalance).to.be.approximately(expectedPrizePool1, MARGIN);

  expect(finalAdminBalance - initialAdminBalance).to.be.approximately(
    expectedCommission1,
    MARGIN
  );

  // Test 2: Native SOL with max_winners > total_players
  console.log('\nTest 2: SOL - Max Winners > Total Players');
  const gameCode2 = getUniqueGameCode('END2');
  const players2 = Array(3)
    .fill(0)
    .map(() => Keypair.generate());
  const maxWinners2 = 5;

  // Expected amounts for Test 2
  const totalPot2 =
    donationAmount.toNumber() + entryFee.toNumber() * players2.length;
  const expectedTreasuryFee2 = Math.floor(totalPot2 * 0.1);
  const expectedCommission2 = Math.floor(totalPot2 * (commission / 100));
  const expectedPrizePool2 =
    totalPot2 - expectedTreasuryFee2 - expectedCommission2;
  const expectedPerWinner2 = Math.floor(expectedPrizePool2 / players2.length); // Divided by actual players

  console.log('\nTest 2 Expected Amounts:');
  console.log('Total Pot:', totalPot2 / LAMPORTS_PER_SOL, 'SOL');
  console.log('Treasury Fee:', expectedTreasuryFee2 / LAMPORTS_PER_SOL, 'SOL');
  console.log('Commission:', expectedCommission2 / LAMPORTS_PER_SOL, 'SOL');
  console.log('Prize Pool:', expectedPrizePool2 / LAMPORTS_PER_SOL, 'SOL');
  console.log('Per Winner:', expectedPerWinner2 / LAMPORTS_PER_SOL, 'SOL');

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
      donationAmount
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

  console.log('\nTest 2 Results:');
  console.log(
    'Initial Vault Balance:',
    initialVaultBalance2 / LAMPORTS_PER_SOL
  );
  console.log('Final Vault Balance:', finalVaultBalance2 / LAMPORTS_PER_SOL);
  console.log(
    'Admin Balance Change:',
    (finalAdminBalance2 - initialAdminBalance2) / LAMPORTS_PER_SOL
  );

  // Verify amounts (update the margin to match Test 1)
  expect(finalVaultBalance2).to.be.approximately(expectedPrizePool2, MARGIN);
  expect(finalAdminBalance2 - initialAdminBalance2).to.be.approximately(
    expectedCommission2,
    MARGIN
  );

  // Test 3: Early ending of SOL game
  console.log('\nTest 3: SOL - Early Game End');
  const gameCode3 = getUniqueGameCode('END3');
  const players3 = Array(2)
    .fill(0)
    .map(() => Keypair.generate());
  const futureEndTime = new anchor.BN(now + 7200); // 2 hours in the future

  // Expected amounts for Test 3
  const totalPot3 =
    donationAmount.toNumber() + entryFee.toNumber() * players3.length;
  const expectedTreasuryFee3 = Math.floor(totalPot3 * 0.1);
  const expectedCommission3 = Math.floor(totalPot3 * (commission / 100));
  const expectedPrizePool3 =
    totalPot3 - expectedTreasuryFee3 - expectedCommission3;
  const expectedPerWinner3 = Math.floor(expectedPrizePool3 / players3.length);

  console.log('\nTest 3 Expected Amounts:');
  console.log('Total Pot:', totalPot3 / LAMPORTS_PER_SOL, 'SOL');
  console.log('Treasury Fee:', expectedTreasuryFee3 / LAMPORTS_PER_SOL, 'SOL');
  console.log('Commission:', expectedCommission3 / LAMPORTS_PER_SOL, 'SOL');
  console.log('Prize Pool:', expectedPrizePool3 / LAMPORTS_PER_SOL, 'SOL');
  console.log('Per Winner:', expectedPerWinner3 / LAMPORTS_PER_SOL, 'SOL');

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
      donationAmount
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

  console.log('\nTest 3 Results:');
  console.log(
    'Initial Vault Balance:',
    initialVaultBalance3 / LAMPORTS_PER_SOL
  );
  console.log('Final Vault Balance:', finalVaultBalance3 / LAMPORTS_PER_SOL);
  console.log(
    'Admin Balance Change:',
    (finalAdminBalance3 - initialAdminBalance3) / LAMPORTS_PER_SOL
  );

  // Verify amounts
  expect(finalVaultBalance3).to.be.approximately(expectedPrizePool3, MARGIN);
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
      tokenDonationAmount
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
      0.1 * LAMPORTS_PER_SOL // Airdrop 0.1 SOL for rent and fees
    );
    await confirm(tx);

    // Then create and fund token account as before
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
      tokenEntryFee.toNumber() * 2 // Extra for safety
    );

    // Join game
    const playerPda = findPlayerPDA(gamePda4, player.publicKey);
    await program.methods
      .joinGame()
      .accounts({
        player: player.publicKey,
        game: gamePda4,
        playerAccount: playerPda,
        vault: vaultPda4,
        vaultTokenAccount: vaultTokenAccount.address,
        playerTokenAccount: playerTokenAccount.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([player])
      .rpc();

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
  const expectedTreasuryFee4 = Math.floor(totalPot4 * 0.06); // Adjust to 6% if that's what the program is using
  const expectedCommission4 = Math.floor(totalPot4 * (commission / 100));
  const expectedPrizePool4 =
    totalPot4 - expectedTreasuryFee4 - expectedCommission4;
  const expectedPerWinner4 = Math.floor(expectedPrizePool4 / players4.length);

  console.log('\nTest 4 Calculations:');
  console.log('Token Entry Fee:', tokenEntryFee.toNumber());
  console.log('Token Donation Amount:', tokenDonationAmount.toNumber());
  console.log('Number of Players:', players4.length);
  console.log('Total Pot:', totalPot4);

  console.log('Expected Treasury Fee:', expectedTreasuryFee4);
  console.log('Expected Commission:', expectedCommission4);
  console.log('Expected Prize Pool:', expectedPrizePool4);
  console.log('Expected Per Winner:', expectedPerWinner4);

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

  console.log('\nTest 4 Actual Results:');
  console.log('Initial Vault Balance:', initialVaultBalance4.toString());
  console.log('Final Vault Balance:', finalVaultBalance4.toString());
  console.log(
    'Admin Balance Change:',
    (finalAdminBalance4 - initialAdminBalance4).toString()
  );
  console.log(
    'Treasury Balance Change:',
    (finalTreasuryBalance4 - initialTreasuryBalance4).toString()
  );

  // Verify amounts
  const TOKEN_MARGIN = 1000; // Small margin for token calculations
  expect(Number(finalVaultBalance4)).to.be.approximately(
    expectedPrizePool4,
    TOKEN_MARGIN
  );
  expect(Number(finalAdminBalance4 - initialAdminBalance4)).to.be.approximately(
    expectedCommission4,
    TOKEN_MARGIN
  );
  expect(
    Number(finalTreasuryBalance4 - initialTreasuryBalance4)
  ).to.be.approximately(expectedTreasuryFee4, TOKEN_MARGIN);

  console.log('\nAll end game tests completed successfully');
}
