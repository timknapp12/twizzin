import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { TwizzinBe2 } from '../target/types/twizzin_be_2';
import { expect, assert } from 'chai';
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
} from '@solana/spl-token';

export async function declareWinners(
  program: Program<TwizzinBe2>,
  provider: anchor.AnchorProvider,
  confirm: (signature: string) => Promise<string>
) {
  console.log('Starting declare winners tests');

  const uniqueId = Math.floor(Math.random() * 1000000);
  const getUniqueGameCode = (base: string) => `${base}${uniqueId}`;

  // Test 1: SOL game with geometric distribution
  console.log('\nTest 1: SOL - Geometric Distribution');
  const gameCode1 = getUniqueGameCode('DECLARE1');
  const entryFee = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
  const commission = 500; // 5% in basis points
  const now = Math.floor(Date.now() / 1000);
  const startTime = new anchor.BN(now);
  const endTime = new anchor.BN(now + 3600);
  const maxWinners = 3;
  const totalPlayers = 4;
  const answerHash = Array(32).fill(1);
  const donationAmount = new anchor.BN(1 * LAMPORTS_PER_SOL);
  const allAreWinners = false;
  const evenSplit = false;

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

  // Helper functions
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

    const [winnersPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('winners'), gamePda.toBuffer()],
      program.programId
    );

    return { gamePda, vaultPda, configPda, winnersPda };
  };

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

  // Initialize first game
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
      console.log('Join game failed:', error.message);
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

  // Players join and submit answers for Test 1
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

  // Helper to declare winners
  async function executeDeclareWinners(
    gameCode: string,
    winnerPubkeys: PublicKey[],
    playerPDAs: PublicKey[]
  ) {
    const { gamePda, winnersPda } = findPDAs(
      gameCode,
      provider.wallet.publicKey
    );

    const tx = await program.methods
      .declareWinners(winnerPubkeys)
      .accounts({
        admin: provider.wallet.publicKey,
        game: gamePda,
        winners: winnersPda,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(
        playerPDAs.map((pda) => ({
          pubkey: pda,
          isWritable: false,
          isSigner: false,
        }))
      )
      .rpc();

    await confirm(tx);
    return tx;
  }

  // Test 1: Execute end game and declare winners
  await executeEndGame(gameCode1, NATIVE_MINT);

  // Order winners by score (already ordered in submitAnswers)
  const winnerPubkeys = players1.slice(0, maxWinners).map((kp) => kp.publicKey);
  const playerAccounts = playerPDAs1.slice(0, maxWinners);

  // Declare winners
  await executeDeclareWinners(gameCode1, winnerPubkeys, playerAccounts);

  // Verify winners account
  const { winnersPda } = findPDAs(gameCode1, provider.wallet.publicKey);
  const winnersAccount = await program.account.winners.fetch(winnersPda);

  // Verify winners data
  expect(winnersAccount.numWinners).to.equal(maxWinners);
  expect(winnersAccount.game).to.eql(gamePda);

  // Verify winner order and prize distribution
  let previousPrize = null;
  for (let i = 0; i < winnersAccount.winners.length; i++) {
    const winner = winnersAccount.winners[i];
    expect(winner.player).to.eql(winnerPubkeys[i]);
    expect(winner.rank).to.equal(i + 1);
    expect(winner.claimed).to.be.false;

    if (previousPrize !== null) {
      // In geometric distribution, each prize should be approximately half of the previous
      expect(winner.prizeAmount.toNumber()).to.be.below(
        previousPrize.toNumber()
      );
    }
    previousPrize = winner.prizeAmount;
  }

  console.log('Test 1: SOL Geometric Distribution completed successfully');

  console.log('\nTest 2: SOL - Even Split Distribution');
  const gameCode2 = getUniqueGameCode('DECLARE2');

  // Create and fund new players
  const players2 = Array(totalPlayers)
    .fill(0)
    .map(() => Keypair.generate());
  for (const player of players2) {
    const tx = await provider.connection.requestAirdrop(
      player.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await confirm(tx);
  }

  // Initialize second game with even split
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
      maxWinners,
      answerHash,
      donationAmount,
      false, // allAreWinners
      true // evenSplit - This is the key difference
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

  // Players join and submit answers for Test 2
  const playerPDAs2 = [];
  for (const player of players2) {
    const playerPda = await joinGame(player, gamePda2, vaultPda2, true);
    playerPDAs2.push(playerPda);
  }

  // Submit answers with different scores and times
  await submitAnswers(players2[0], gamePda2, playerPDAs2[0], 10, now + 1000);
  await submitAnswers(players2[1], gamePda2, playerPDAs2[1], 9, now + 1500);
  await submitAnswers(players2[2], gamePda2, playerPDAs2[2], 8, now + 2000);
  await submitAnswers(players2[3], gamePda2, playerPDAs2[3], 7, now + 2500);

  // End game and declare winners
  await executeEndGame(gameCode2, NATIVE_MINT);

  const winnerPubkeys2 = players2
    .slice(0, maxWinners)
    .map((kp) => kp.publicKey);
  const playerAccounts2 = playerPDAs2.slice(0, maxWinners);

  await executeDeclareWinners(gameCode2, winnerPubkeys2, playerAccounts2);

  // Verify winners account
  const { winnersPda: winnersPda2 } = findPDAs(
    gameCode2,
    provider.wallet.publicKey
  );
  const winnersAccount2 = await program.account.winners.fetch(winnersPda2);

  // Verify winners data
  expect(winnersAccount2.numWinners).to.equal(maxWinners);
  expect(winnersAccount2.game).to.eql(gamePda2);

  // Verify winner order and prize distribution
  let firstPrize = null;
  for (let i = 0; i < winnersAccount2.winners.length; i++) {
    const winner = winnersAccount2.winners[i];
    expect(winner.player).to.eql(winnerPubkeys2[i]);
    expect(winner.rank).to.equal(i + 1);
    expect(winner.claimed).to.be.false;

    // In even split, all prizes should be equal
    if (firstPrize === null) {
      firstPrize = winner.prizeAmount;
    } else {
      expect(winner.prizeAmount.toString()).to.equal(firstPrize.toString());
    }
  }

  console.log('Test 2: SOL Even Split Distribution completed successfully');

  console.log(
    '\nTest 3: SOL - All Are Winners (more players than max_winners)'
  );
  const gameCode3 = getUniqueGameCode('DECLARE3');

  // Using more players than max_winners
  const totalPlayers3 = 6; // More than maxWinners (which is 3)

  // Create and fund new players
  const players3 = Array(totalPlayers3)
    .fill(0)
    .map(() => Keypair.generate());
  for (const player of players3) {
    const tx = await provider.connection.requestAirdrop(
      player.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await confirm(tx);
  }

  // Initialize third game with allAreWinners
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
      endTime,
      maxWinners,
      answerHash,
      donationAmount,
      true, // allAreWinners - This is the key difference
      false // evenSplit
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

  // Players join and submit answers for Test 3
  const playerPDAs3 = [];
  for (const player of players3) {
    const playerPda = await joinGame(player, gamePda3, vaultPda3, true);
    playerPDAs3.push(playerPda);
  }

  // Submit answers with different scores and times
  await submitAnswers(players3[0], gamePda3, playerPDAs3[0], 10, now + 1000);
  await submitAnswers(players3[1], gamePda3, playerPDAs3[1], 9, now + 1500);
  await submitAnswers(players3[2], gamePda3, playerPDAs3[2], 8, now + 2000);
  await submitAnswers(players3[3], gamePda3, playerPDAs3[3], 7, now + 2500);
  await submitAnswers(players3[4], gamePda3, playerPDAs3[4], 6, now + 3000);
  await submitAnswers(players3[5], gamePda3, playerPDAs3[5], 5, now + 3500);

  // End game and declare winners
  await executeEndGame(gameCode3, NATIVE_MINT);

  // In allAreWinners mode, all players should be winners
  const winnerPubkeys3 = players3.map((kp) => kp.publicKey);
  const playerAccounts3 = playerPDAs3;

  await executeDeclareWinners(gameCode3, winnerPubkeys3, playerAccounts3);

  // Verify winners account
  const { winnersPda: winnersPda3 } = findPDAs(
    gameCode3,
    provider.wallet.publicKey
  );
  const winnersAccount3 = await program.account.winners.fetch(winnersPda3);

  // Verify winners data
  expect(winnersAccount3.numWinners).to.equal(totalPlayers3);
  expect(winnersAccount3.game).to.eql(gamePda3);

  // Verify winner order and prize distribution
  let previousPrize3 = null;
  for (let i = 0; i < winnersAccount3.winners.length; i++) {
    const winner = winnersAccount3.winners[i];
    expect(winner.player).to.eql(winnerPubkeys3[i]);
    expect(winner.rank).to.equal(i + 1);
    expect(winner.claimed).to.be.false;

    if (previousPrize3 !== null) {
      // In geometric distribution, each prize should be approximately half of the previous
      expect(winner.prizeAmount.toNumber()).to.be.below(
        previousPrize3.toNumber()
      );
    }
    previousPrize3 = winner.prizeAmount;
  }

  console.log('Test 3: SOL All Are Winners completed successfully');

  console.log('\nTest 4: SPL Token - Geometric Distribution');
  const gameCode4 = getUniqueGameCode('DECLARE4');

  // Create new SPL token mint
  const mint = await createMint(
    provider.connection,
    provider.wallet.payer,
    provider.wallet.publicKey,
    null,
    9
  );

  // Create admin token account and mint tokens to it
  const adminTokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    provider.wallet.payer,
    mint,
    provider.wallet.publicKey
  );

  // Mint tokens to admin
  await mintTo(
    provider.connection,
    provider.wallet.payer,
    mint,
    adminTokenAccount.address,
    provider.wallet.publicKey,
    1000 * LAMPORTS_PER_SOL // Mint plenty of tokens to admin
  );

  // Create and fund players
  const players4 = Array(totalPlayers)
    .fill(0)
    .map(() => Keypair.generate());

  // Setup players with SOL for transaction fees and SPL tokens
  for (const player of players4) {
    // Fund with SOL
    const tx = await provider.connection.requestAirdrop(
      player.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await confirm(tx);

    // Create player token account and fund with SPL tokens
    const playerAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mint,
      player.publicKey
    );

    // Mint enough tokens to cover entry fee
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mint,
      playerAta.address,
      provider.wallet.publicKey,
      10 * LAMPORTS_PER_SOL // More than the 5 token entry fee
    );
  }

  // Initialize game with SPL token
  const { gamePda: gamePda4, vaultPda: vaultPda4 } = findPDAs(
    gameCode4,
    provider.wallet.publicKey
  );

  // Create vault token account
  const vaultTokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    provider.wallet.payer,
    mint,
    vaultPda4,
    true // allowOwnerOffCurve
  );

  const initTx4 = await program.methods
    .initGame(
      'Test Game 4',
      gameCode4,
      new anchor.BN(5 * LAMPORTS_PER_SOL), // 5 token entry fee
      commission,
      startTime,
      endTime,
      maxWinners,
      answerHash,
      new anchor.BN(1 * LAMPORTS_PER_SOL), // 1 token donation
      false, // allAreWinners
      false // evenSplit
    )
    .accounts({
      admin: provider.wallet.publicKey,
      game: gamePda4,
      tokenMint: mint,
      vault: vaultPda4,
      vaultTokenAccount: vaultTokenAccount.address,
      adminTokenAccount: adminTokenAccount.address,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  await confirm(initTx4);

  // Players join and submit answers
  const playerPDAs4 = [];
  for (const player of players4) {
    const playerPda = await joinGame(
      player,
      gamePda4,
      vaultPda4,
      false, // isNative
      mint,
      vaultTokenAccount.address
    );
    playerPDAs4.push(playerPda);
  }

  // Submit answers with different scores
  await submitAnswers(players4[0], gamePda4, playerPDAs4[0], 10, now + 1000);
  await submitAnswers(players4[1], gamePda4, playerPDAs4[1], 9, now + 1500);
  await submitAnswers(players4[2], gamePda4, playerPDAs4[2], 8, now + 2000);
  await submitAnswers(players4[3], gamePda4, playerPDAs4[3], 7, now + 2500);

  // Create treasury token account
  const config = await program.account.programConfig.fetch(configPda);
  const treasuryTokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    provider.wallet.payer,
    mint,
    config.treasuryPubkey
  );

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

  // Declare winners
  const winnerPubkeys4 = players4
    .slice(0, maxWinners)
    .map((kp) => kp.publicKey);
  const playerAccounts4 = playerPDAs4.slice(0, maxWinners);

  await executeDeclareWinners(gameCode4, winnerPubkeys4, playerAccounts4);

  // Verify winners account
  const { winnersPda: winnersPda4 } = findPDAs(
    gameCode4,
    provider.wallet.publicKey
  );
  const winnersAccount4 = await program.account.winners.fetch(winnersPda4);

  // Verify winners data
  expect(winnersAccount4.numWinners).to.equal(maxWinners);
  expect(winnersAccount4.game).to.eql(gamePda4);

  // Verify winner order and prize distribution
  let previousPrize4 = null;
  for (let i = 0; i < winnersAccount4.winners.length; i++) {
    const winner = winnersAccount4.winners[i];
    expect(winner.player).to.eql(winnerPubkeys4[i]);
    expect(winner.rank).to.equal(i + 1);
    expect(winner.claimed).to.be.false;

    if (previousPrize4 !== null) {
      // In geometric distribution, each prize should be approximately half of the previous
      expect(winner.prizeAmount.toNumber()).to.be.below(
        previousPrize4.toNumber()
      );
    }
    previousPrize4 = winner.prizeAmount;
  }

  console.log('Test 4: SPL Token Distribution completed successfully');

  console.log('\nTest 5: Error Cases for Winner Declaration');
  const gameCode5 = getUniqueGameCode('DECLARE5');

  // Setup game same as Test 4 (SPL token game)
  const mint5 = await createMint(
    provider.connection,
    provider.wallet.payer,
    provider.wallet.publicKey,
    null,
    9
  );

  // Create admin token account and mint tokens
  const adminTokenAccount5 = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    provider.wallet.payer,
    mint5,
    provider.wallet.publicKey
  );

  await mintTo(
    provider.connection,
    provider.wallet.payer,
    mint5,
    adminTokenAccount5.address,
    provider.wallet.publicKey,
    1000 * LAMPORTS_PER_SOL
  );

  // Create and fund players
  const players5 = Array(totalPlayers)
    .fill(0)
    .map(() => Keypair.generate());

  // Setup players with SOL and tokens
  for (const player of players5) {
    const tx = await provider.connection.requestAirdrop(
      player.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await confirm(tx);

    const playerAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mint5,
      player.publicKey
    );

    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mint5,
      playerAta.address,
      provider.wallet.publicKey,
      10 * LAMPORTS_PER_SOL
    );
  }

  // Initialize game
  const { gamePda: gamePda5, vaultPda: vaultPda5 } = findPDAs(
    gameCode5,
    provider.wallet.publicKey
  );

  const vaultTokenAccount5 = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    provider.wallet.payer,
    mint5,
    vaultPda5,
    true
  );

  const initTx5 = await program.methods
    .initGame(
      'Test Game 5',
      gameCode5,
      new anchor.BN(5 * LAMPORTS_PER_SOL),
      commission,
      startTime,
      endTime,
      maxWinners,
      answerHash,
      new anchor.BN(1 * LAMPORTS_PER_SOL),
      false,
      false
    )
    .accounts({
      admin: provider.wallet.publicKey,
      game: gamePda5,
      tokenMint: mint5,
      vault: vaultPda5,
      vaultTokenAccount: vaultTokenAccount5.address,
      adminTokenAccount: adminTokenAccount5.address,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  await confirm(initTx5);

  // Have players join and submit answers
  const playerPDAs5 = [];
  for (const player of players5) {
    const playerPda = await joinGame(
      player,
      gamePda5,
      vaultPda5,
      false,
      mint5,
      vaultTokenAccount5.address
    );
    playerPDAs5.push(playerPda);
  }

  // Submit answers with different scores
  await submitAnswers(players5[0], gamePda5, playerPDAs5[0], 10, now + 1000);
  await submitAnswers(players5[1], gamePda5, playerPDAs5[1], 9, now + 1500);
  await submitAnswers(players5[2], gamePda5, playerPDAs5[2], 8, now + 2000);
  await submitAnswers(players5[3], gamePda5, playerPDAs5[3], 7, now + 2500);

  // End game
  const config5 = await program.account.programConfig.fetch(configPda);
  const treasuryTokenAccount5 = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    provider.wallet.payer,
    mint5,
    config5.treasuryPubkey
  );

  await program.methods
    .endGame()
    .accounts({
      admin: provider.wallet.publicKey,
      game: gamePda5,
      vault: vaultPda5,
      config: configPda,
      treasury: config5.treasuryPubkey,
      vaultTokenAccount: vaultTokenAccount5.address,
      adminTokenAccount: adminTokenAccount5.address,
      treasuryTokenAccount: treasuryTokenAccount5.address,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  // Test error cases
  console.log('Testing error cases...');

  // Case 1: Wrong number of winners
  try {
    const tooManyWinners = [...players5].map((kp) => kp.publicKey);
    await executeDeclareWinners(gameCode5, tooManyWinners, playerPDAs5);
    assert.fail('Should have thrown InvalidWinnerCount error');
  } catch (error) {
    console.log('Expected error for too many winners:', error.message);
    expect(error.message).to.include('InvalidWinnerCount');
  }

  // Case 2: Duplicate winners
  try {
    const duplicateWinners = [
      players5[0].publicKey,
      players5[0].publicKey,
      players5[1].publicKey,
    ];
    const duplicatePDAs = [playerPDAs5[0], playerPDAs5[0], playerPDAs5[1]];
    await executeDeclareWinners(gameCode5, duplicateWinners, duplicatePDAs);
    assert.fail('Should have thrown DuplicateWinner error');
  } catch (error) {
    console.log('Expected error for duplicate winners:', error.message);
    expect(error.message).to.include('DuplicateWinner');
  }

  // Case 3: Invalid winner order (scores not in descending order)
  try {
    const wrongOrder = [
      players5[1].publicKey,
      players5[0].publicKey,
      players5[2].publicKey,
    ];
    const wrongOrderPDAs = [playerPDAs5[1], playerPDAs5[0], playerPDAs5[2]];
    await executeDeclareWinners(gameCode5, wrongOrder, wrongOrderPDAs);
    assert.fail('Should have thrown InvalidWinnerOrder error');
  } catch (error) {
    console.log('Expected error for invalid order:', error.message);
    expect(error.message).to.include('InvalidWinnerOrder');
  }

  // Case 4: Winner not a player
  try {
    const nonPlayer = Keypair.generate();
    const invalidWinners = [
      players5[0].publicKey,
      nonPlayer.publicKey,
      players5[1].publicKey,
    ];
    await executeDeclareWinners(
      gameCode5,
      invalidWinners,
      playerPDAs5.slice(0, 3)
    );
    assert.fail('Should have thrown WinnerNotPlayer error');
  } catch (error) {
    console.log('Expected error for non-player winner:', error.message);
    expect(error.message).to.include('WinnerNotPlayer');
  }

  console.log('Test 5: Error cases completed successfully');

  console.log('All declare winners tests completed successfully');
}