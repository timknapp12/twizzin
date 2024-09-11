import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { TwizzinBe } from '../target/types/twizzin_be';
import { expect } from 'chai';
import { BN } from '@coral-xyz/anchor';
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Keypair,
} from '@solana/web3.js';

export async function endGameWithMultipleWinners(
  program: Program<TwizzinBe>,
  provider: AnchorProvider,
  configPubkey: PublicKey,
  treasuryPubkey: PublicKey,
  airdropSol: (publicKey: PublicKey, amount: number) => Promise<void>,
  confirm: (signature: string) => Promise<string>
) {
  console.log('Starting end game test with multiple winners');

  const slot = await provider.connection.getSlot();
  const timestamp = await provider.connection.getBlockTime(slot);
  if (!timestamp) throw new Error("Couldn't fetch on-chain time");

  const currentTime = new BN(timestamp * 1000);
  const startTime = currentTime.add(new BN(5000));
  const endTime = startTime.add(new BN(30000));

  console.log('Current on-chain time:', currentTime.toString());
  console.log('Game start time:', startTime.toString());
  console.log('Game end time:', endTime.toString());

  const initialAdminBalance = await provider.connection.getBalance(
    provider.wallet.publicKey
  );
  const initialTreasuryBalance = await provider.connection.getBalance(
    treasuryPubkey
  );

  const gameName = 'End Game Test';
  const entryFee = new BN(LAMPORTS_PER_SOL / 10);
  const commission = 10;
  const gameCode = 'END' + Math.floor(Math.random() * 10000);
  const maxWinners = 3;
  const answers = [
    { displayOrder: 0, answer: 'A', salt: 'salt0' },
    { displayOrder: 1, answer: 'B', salt: 'salt1' },
    { displayOrder: 2, answer: 'C', salt: 'salt2' },
  ];

  const [gameAccount] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('game'),
      provider.wallet.publicKey.toBuffer(),
      Buffer.from(gameCode),
    ],
    program.programId
  );

  const [vaultAccount] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('vault'),
      provider.wallet.publicKey.toBuffer(),
      Buffer.from(gameCode),
    ],
    program.programId
  );

  await program.methods
    .initGame(
      gameName,
      entryFee,
      commission,
      gameCode,
      startTime,
      endTime,
      maxWinners,
      answers
    )
    .accounts({
      admin: provider.wallet.publicKey,
      game: gameAccount,
      vault: vaultAccount,
      config: configPubkey,
      systemProgram: SystemProgram.programId,
    } as any)
    .rpc();

  const timeToStart = startTime.sub(currentTime).toNumber();
  console.log(`Waiting ${timeToStart}ms for the game to start`);
  await new Promise((resolve) => setTimeout(resolve, timeToStart));

  const players = [];
  const initialPlayerBalances = [];
  for (let i = 0; i < 5; i++) {
    const playerKeypair = Keypair.generate();
    await airdropSol(playerKeypair.publicKey, 1);
    players.push(playerKeypair);

    const initialBalance = await provider.connection.getBalance(
      playerKeypair.publicKey
    );
    initialPlayerBalances.push(initialBalance);

    await program.methods
      .addPlayer(gameCode)
      .accounts({
        player: playerKeypair.publicKey,
        game: gameAccount,
        vault: vaultAccount,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([playerKeypair])
      .rpc();

    const guesses = answers.map((answer, index) => ({
      displayOrder: index,
      answer: index < i ? answer.answer : 'X',
      salt: answer.salt,
    }));

    const playerUpdateSlot = await provider.connection.getSlot();
    const playerUpdateTimestamp = await provider.connection.getBlockTime(
      playerUpdateSlot
    );
    if (!playerUpdateTimestamp)
      throw new Error("Couldn't fetch on-chain time for player update");

    const playerEndTime = new BN(playerUpdateTimestamp * 1000);

    await program.methods
      .updatePlayer(guesses, playerEndTime)
      .accounts({
        player: playerKeypair.publicKey,
        game: gameAccount,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([playerKeypair])
      .rpc();
  }

  const timeToEnd = endTime.sub(new BN(Date.now())).toNumber() + 2000;
  console.log(`Waiting ${timeToEnd}ms for the game to end...`);
  await new Promise((resolve) => setTimeout(resolve, timeToEnd));

  const endGameTx = await program.methods
    .endGame()
    .accounts({
      admin: provider.wallet.publicKey,
      game: gameAccount,
      vault: vaultAccount,
      config: configPubkey,
      treasury: treasuryPubkey,
      systemProgram: SystemProgram.programId,
    } as any)
    .remainingAccounts(
      players.map((player) => ({
        pubkey: player.publicKey,
        isWritable: true,
        isSigner: false,
      }))
    )
    .rpc();

  await confirm(endGameTx);

  // Calculate expected payouts
  const totalPool = entryFee.mul(new BN(players.length));
  const treasuryFee = totalPool.mul(new BN(1)).div(new BN(100));
  const adminCommission = totalPool.mul(new BN(commission)).div(new BN(100));
  const remainingPool = totalPool.sub(treasuryFee).sub(adminCommission);
  const actualWinners = 2;
  const expectedWinnerPayout = remainingPool.div(new BN(actualWinners));

  const estimatedTxFee = 5000;

  const balanceChanges = await Promise.all(
    players.map(async (player, index) => {
      const finalBalance = await provider.connection.getBalance(
        player.publicKey
      );
      return finalBalance - initialPlayerBalances[index];
    })
  );

  for (let i = 0; i < players.length; i++) {
    const finalBalance = await provider.connection.getBalance(
      players[i].publicKey
    );
    const balanceChange = finalBalance - initialPlayerBalances[i];

    if (i >= players.length - actualWinners) {
      const expectedBalanceChange =
        expectedWinnerPayout.toNumber() - entryFee.toNumber() - estimatedTxFee;
      const percentageDifference =
        Math.abs(
          (balanceChange - expectedBalanceChange) / expectedBalanceChange
        ) * 100;
      expect(percentageDifference).to.be.lessThan(0.5);
    } else {
      const expectedBalanceChange = -entryFee.toNumber() - estimatedTxFee;
      const percentageDifference =
        Math.abs(
          (balanceChange - expectedBalanceChange) / expectedBalanceChange
        ) * 100;
      expect(percentageDifference).to.be.lessThan(0.5);
    }
  }

  const finalAdminBalance = await provider.connection.getBalance(
    provider.wallet.publicKey
  );
  const adminBalanceChange = finalAdminBalance - initialAdminBalance;
  const extraAdminBalance = adminBalanceChange - adminCommission.toNumber();
  const extraPercentage =
    (extraAdminBalance / adminCommission.toNumber()) * 100;

  expect(extraPercentage).to.be.gte(0).and.lt(5);
  expect(adminBalanceChange).to.be.gte(adminCommission.toNumber());

  const finalTreasuryBalance = await provider.connection.getBalance(
    treasuryPubkey
  );
  const treasuryBalanceChange = finalTreasuryBalance - initialTreasuryBalance;
  const treasuryExtraBalance = treasuryBalanceChange - treasuryFee.toNumber();
  const treasuryExtraPercentage =
    (treasuryExtraBalance / treasuryFee.toNumber()) * 100;

  expect(treasuryExtraPercentage).to.be.gte(0).and.lt(5);
  expect(treasuryBalanceChange).to.be.gte(treasuryFee.toNumber());

  const netPlayerChange = balanceChanges.reduce(
    (sum, change) => sum + change,
    0
  );
  const totalDistributed =
    netPlayerChange + adminBalanceChange + treasuryBalanceChange;
  const distributionDifference = Math.abs(totalDistributed);
  const distributionPercentageDifference =
    (distributionDifference / totalPool.toNumber()) * 100;

  expect(distributionPercentageDifference).to.be.lessThan(1);
  expect(totalDistributed).to.be.closeTo(0, totalPool.toNumber() * 0.01);

  console.log('End game test with multiple winners completed successfully');
}

export async function endGameWithAllPlayersPoorlyPerforming(
  program: Program<TwizzinBe>,
  provider: AnchorProvider,
  configPubkey: PublicKey,
  treasuryPubkey: PublicKey,
  airdropSol: (publicKey: PublicKey, amount: number) => Promise<void>,
  confirm: (signature: string) => Promise<string>
) {
  console.log('Starting end game test with all players performing poorly');

  // Fetch the current on-chain time
  const slot = await provider.connection.getSlot();
  const timestamp = await provider.connection.getBlockTime(slot);
  if (!timestamp) throw new Error("Couldn't fetch on-chain time");

  const currentTime = new BN(timestamp * 1000); // Convert to milliseconds
  const startTime = currentTime.add(new BN(5000)); // Start 5 seconds from now
  const endTime = startTime.add(new BN(30000)); // End 30 seconds after start

  const initialAdminBalance = await provider.connection.getBalance(
    provider.wallet.publicKey
  );
  const initialTreasuryBalance = await provider.connection.getBalance(
    treasuryPubkey
  );

  // Initialize a new game
  const gameCode = 'POOR' + Math.floor(Math.random() * 10000);
  const gameName = 'Poor Performance Game';
  const entryFee = new BN(LAMPORTS_PER_SOL / 10); // 0.1 SOL
  const commission = 10; // 10%
  const maxWinners = 3;
  const answers = [
    { displayOrder: 0, answer: 'A', salt: 'salt0' },
    { displayOrder: 1, answer: 'B', salt: 'salt1' },
    { displayOrder: 2, answer: 'C', salt: 'salt2' },
  ];

  const [gameAccount] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('game'),
      provider.wallet.publicKey.toBuffer(),
      Buffer.from(gameCode),
    ],
    program.programId
  );

  const [vaultAccount] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('vault'),
      provider.wallet.publicKey.toBuffer(),
      Buffer.from(gameCode),
    ],
    program.programId
  );

  await program.methods
    .initGame(
      gameName,
      entryFee,
      commission,
      gameCode,
      startTime,
      endTime,
      maxWinners,
      answers
    )
    .accounts({
      admin: provider.wallet.publicKey,
      game: gameAccount,
      vault: vaultAccount,
      config: configPubkey,
      systemProgram: SystemProgram.programId,
    } as any)
    .rpc();

  // Wait for the game to start
  const timeToStart = startTime.sub(currentTime).toNumber();
  console.log(`Waiting ${timeToStart}ms for the game to start`);
  await new Promise((resolve) => setTimeout(resolve, timeToStart));

  // Add players to the game and update their guesses
  const players = [];
  for (let i = 0; i < 5; i++) {
    const playerKeypair = Keypair.generate();
    await airdropSol(playerKeypair.publicKey, 1);
    players.push(playerKeypair);

    await program.methods
      .addPlayer(gameCode)
      .accounts({
        player: playerKeypair.publicKey,
        game: gameAccount,
        vault: vaultAccount,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([playerKeypair])
      .rpc();

    // Update player guesses
    const guesses = answers.map((answer, index) => ({
      displayOrder: index,
      answer: 'X', // All players give incorrect answers
      salt: answer.salt,
    }));

    // Simulate different submission times
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const playerUpdateSlot = await provider.connection.getSlot();
    const playerUpdateTimestamp = await provider.connection.getBlockTime(
      playerUpdateSlot
    );
    if (!playerUpdateTimestamp)
      throw new Error("Couldn't fetch on-chain time for player update");

    const playerEndTime = new BN(playerUpdateTimestamp * 1000);

    await program.methods
      .updatePlayer(guesses, playerEndTime)
      .accounts({
        player: playerKeypair.publicKey,
        game: gameAccount,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([playerKeypair])
      .rpc();
  }

  // Wait for the game to end
  const timeToEnd = endTime.sub(new BN(Date.now())).toNumber() + 2000; // Add 2 seconds buffer
  console.log(`Waiting ${timeToEnd}ms for the game to end...`);
  await new Promise((resolve) => setTimeout(resolve, timeToEnd));

  // End the game
  const endGameTx = await program.methods
    .endGame()
    .accounts({
      admin: provider.wallet.publicKey,
      game: gameAccount,
      vault: vaultAccount,
      config: configPubkey,
      treasury: treasuryPubkey,
      systemProgram: SystemProgram.programId,
    } as any)
    .remainingAccounts(
      players.map((player) => ({
        pubkey: player.publicKey,
        isWritable: true,
        isSigner: false,
      }))
    )
    .rpc();

  await confirm(endGameTx);

  // Verify the results
  const totalPool = entryFee.mul(new BN(players.length));
  const treasuryFee = totalPool.mul(new BN(1)).div(new BN(100)); // 1% treasury fee
  const adminCommission = totalPool.mul(new BN(commission)).div(new BN(100));
  const remainingPool = totalPool.sub(treasuryFee).sub(adminCommission);
  const expectedWinnerPayout = remainingPool.div(new BN(maxWinners));

  // Check winner balances (first 3 players)
  for (let i = 0; i < maxWinners; i++) {
    const winnerBalance = await provider.connection.getBalance(
      players[i].publicKey
    );
    const expectedWinnerBalance =
      LAMPORTS_PER_SOL + expectedWinnerPayout.toNumber() - entryFee.toNumber();

    const winnerDifference = expectedWinnerBalance - winnerBalance;
    const winnerPercentageDifference =
      (winnerDifference / expectedWinnerBalance) * 100;

    expect(winnerPercentageDifference).to.be.lessThan(0.2);
  }

  // Check that other players didn't receive payouts
  for (let i = maxWinners; i < players.length; i++) {
    const playerBalance = await provider.connection.getBalance(
      players[i].publicKey
    );
    const expectedPlayerBalance = LAMPORTS_PER_SOL - entryFee.toNumber();

    const playerDifference = expectedPlayerBalance - playerBalance;
    const playerPercentageDifference =
      (playerDifference / expectedPlayerBalance) * 100;

    expect(playerPercentageDifference).to.be.lessThan(0.2);
  }

  // Check admin balance change
  const finalAdminBalance = await provider.connection.getBalance(
    provider.wallet.publicKey
  );
  const adminBalanceChange = finalAdminBalance - initialAdminBalance;

  // Allow for a small difference due to rent returns
  const adminBalanceDifference =
    adminBalanceChange - adminCommission.toNumber();

  expect(adminBalanceDifference).to.be.gte(0).and.lt(2000000); // Less than 0.002 SOL difference

  // Check treasury balance change
  const finalTreasuryBalance = await provider.connection.getBalance(
    treasuryPubkey
  );
  const treasuryBalanceChange = finalTreasuryBalance - initialTreasuryBalance;

  // Allow for a small difference in treasury balance
  const treasuryBalanceDifference =
    treasuryBalanceChange - treasuryFee.toNumber();
  console.log(
    `Treasury balance difference from expected: ${treasuryBalanceDifference}`
  );
  expect(treasuryBalanceDifference).to.be.gte(0).and.lt(10000); // Less than 0.00001 SOL difference

  // Calculate and verify total distribution
  const totalDistributed = expectedWinnerPayout
    .mul(new BN(maxWinners))
    .add(adminCommission)
    .add(treasuryFee);

  const distributionDifference = totalPool.sub(totalDistributed);

  expect(distributionDifference.abs().toNumber()).to.be.lt(10000); // Less than 0.00001 SOL difference
  console.log(
    'End game test with all players performing poorly completed successfully'
  );
}

export async function endGameWithSingleClearWinner(
  program: Program<TwizzinBe>,
  provider: AnchorProvider,
  configPubkey: PublicKey,
  treasuryPubkey: PublicKey,
  airdropSol: (publicKey: PublicKey, amount: number) => Promise<void>,
  confirm: (signature: string) => Promise<string>
) {
  console.log('Starting end game test with a single clear winner');

  // Fetch the current on-chain time
  const slot = await provider.connection.getSlot();
  const timestamp = await provider.connection.getBlockTime(slot);
  if (!timestamp) throw new Error("Couldn't fetch on-chain time");

  const currentTime = new BN(timestamp * 1000); // Convert to milliseconds
  const startTime = currentTime.add(new BN(5000)); // Start 5 seconds from now
  const endTime = startTime.add(new BN(30000)); // End 30 seconds after start

  console.log('Current on-chain time:', currentTime.toString());
  console.log('Game start time:', startTime.toString());
  console.log('Game end time:', endTime.toString());

  const initialAdminBalance = await provider.connection.getBalance(
    provider.wallet.publicKey
  );
  const initialTreasuryBalance = await provider.connection.getBalance(
    treasuryPubkey
  );

  // Initialize a new game
  const gameCode = 'SINGLE' + Math.floor(Math.random() * 10000);
  const gameName = 'Single Winner Game';
  const entryFee = new BN(LAMPORTS_PER_SOL / 10); // 0.1 SOL
  const commission = 10; // 10%
  const maxWinners = 3;
  const answers = [
    { displayOrder: 0, answer: 'A', salt: 'salt0' },
    { displayOrder: 1, answer: 'B', salt: 'salt1' },
    { displayOrder: 2, answer: 'C', salt: 'salt2' },
  ];

  const [gameAccount] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('game'),
      provider.wallet.publicKey.toBuffer(),
      Buffer.from(gameCode),
    ],
    program.programId
  );

  const [vaultAccount] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('vault'),
      provider.wallet.publicKey.toBuffer(),
      Buffer.from(gameCode),
    ],
    program.programId
  );

  await program.methods
    .initGame(
      gameName,
      entryFee,
      commission,
      gameCode,
      startTime,
      endTime,
      maxWinners,
      answers
    )
    .accounts({
      admin: provider.wallet.publicKey,
      game: gameAccount,
      vault: vaultAccount,
      config: configPubkey,
      systemProgram: SystemProgram.programId,
    } as any)
    .rpc();

  // Wait for the game to start
  const timeToStart = startTime.sub(currentTime).toNumber();
  console.log(`Waiting ${timeToStart}ms for the game to start`);
  await new Promise((resolve) => setTimeout(resolve, timeToStart));

  // Add players to the game and update their guesses
  const players = [];
  for (let i = 0; i < 5; i++) {
    const playerKeypair = Keypair.generate();
    await airdropSol(playerKeypair.publicKey, 1);
    players.push(playerKeypair);

    await program.methods
      .addPlayer(gameCode)
      .accounts({
        player: playerKeypair.publicKey,
        game: gameAccount,
        vault: vaultAccount,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([playerKeypair])
      .rpc();

    // Update player guesses
    const guesses = answers.map((answer, index) => ({
      displayOrder: index,
      answer: i === 2 ? answer.answer : 'X', // Only Player 3 (i === 2) gets correct answers
      salt: answer.salt,
    }));

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const playerUpdateSlot = await provider.connection.getSlot();
    const playerUpdateTimestamp = await provider.connection.getBlockTime(
      playerUpdateSlot
    );
    if (!playerUpdateTimestamp)
      throw new Error("Couldn't fetch on-chain time for player update");

    const playerEndTime = new BN(playerUpdateTimestamp * 1000);

    await program.methods
      .updatePlayer(guesses, playerEndTime)
      .accounts({
        player: playerKeypair.publicKey,
        game: gameAccount,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([playerKeypair])
      .rpc();

    console.log(`Player ${i + 1} end time: ${playerEndTime.toString()}`);
  }

  // Wait for the game to end
  const timeToEnd = endTime.sub(new BN(Date.now())).toNumber() + 2000; // Add 2 seconds buffer
  console.log(`Waiting ${timeToEnd}ms for the game to end...`);
  await new Promise((resolve) => setTimeout(resolve, timeToEnd));

  // Log initial balances
  console.log('Initial balances:');
  const initialBalances = await Promise.all(
    players.map((player) => provider.connection.getBalance(player.publicKey))
  );
  initialBalances.forEach((balance, index) =>
    console.log(`Player ${index + 1} initial balance: ${balance}`)
  );
  console.log(`Admin initial balance: ${initialAdminBalance}`);
  console.log(`Treasury initial balance: ${initialTreasuryBalance}`);

  // Fetch the game state before ending the game
  const gameStateBefore = await program.account.game.fetch(gameAccount);
  console.log('Game state before ending:', gameStateBefore);

  console.log('Player correct answers:');
  gameStateBefore.players.forEach((player, index) => {
    console.log(`Player ${index + 1}: ${player.numCorrect} correct answers`);
  });

  // End the game
  console.log('Ending game...');
  const endGameTx = await program.methods
    .endGame()
    .accounts({
      admin: provider.wallet.publicKey,
      game: gameAccount,
      vault: vaultAccount,
      config: configPubkey,
      treasury: treasuryPubkey,
      systemProgram: SystemProgram.programId,
    } as any)
    .remainingAccounts(
      players.map((player) => ({
        pubkey: player.publicKey,
        isWritable: true,
        isSigner: false,
      }))
    )
    .rpc();

  await confirm(endGameTx);
  console.log('Game ended');

  // Log final balances
  console.log('Final balances:');
  const finalBalances = await Promise.all(
    players.map((player) => provider.connection.getBalance(player.publicKey))
  );
  finalBalances.forEach((balance, index) =>
    console.log(`Player ${index + 1} final balance: ${balance}`)
  );
  const finalAdminBalance = await provider.connection.getBalance(
    provider.wallet.publicKey
  );
  console.log(`Admin final balance: ${finalAdminBalance}`);
  const finalTreasuryBalance = await provider.connection.getBalance(
    treasuryPubkey
  );
  console.log(`Treasury final balance: ${finalTreasuryBalance}`);

  // Calculate and log balance changes
  console.log('Balance changes:');
  const balanceChanges = finalBalances.map(
    (final, index) => final - initialBalances[index]
  );
  balanceChanges.forEach((change, index) =>
    console.log(`Player ${index + 1} balance change: ${change}`)
  );
  const adminBalanceChange = finalAdminBalance - initialAdminBalance;
  console.log(`Admin balance change: ${adminBalanceChange}`);
  const treasuryBalanceChange = finalTreasuryBalance - initialTreasuryBalance;
  console.log(`Treasury balance change: ${treasuryBalanceChange}`);

  // Verify the results
  const totalPool = entryFee.mul(new BN(players.length));
  const treasuryFee = totalPool.mul(new BN(1)).div(new BN(100)); // 1% treasury fee
  const adminCommission = totalPool.mul(new BN(commission)).div(new BN(100));
  const remainingPool = totalPool.sub(treasuryFee).sub(adminCommission);
  const expectedWinnerPayout = remainingPool; // All remaining pool goes to the single winner

  console.log(`Expected total pool: ${totalPool.toString()}`);
  console.log(`Expected treasury fee: ${treasuryFee.toString()}`);
  console.log(`Expected admin commission: ${adminCommission.toString()}`);
  console.log(`Expected remaining pool: ${remainingPool.toString()}`);
  console.log(`Expected payout to winner: ${expectedWinnerPayout.toString()}`);

  // Check winner balance (Player 3, index 2)
  const winnerBalanceChange = balanceChanges[2];
  const expectedWinnerBalanceChange = expectedWinnerPayout.toNumber(); // Remove the subtraction of entry fee

  const winnerDifference = expectedWinnerBalanceChange - winnerBalanceChange;
  const winnerPercentageDifference =
    (winnerDifference / expectedWinnerBalanceChange) * 100;

  console.log('Winner details:');
  console.log(`  Actual balance change: ${winnerBalanceChange}`);
  console.log(`  Expected balance change: ${expectedWinnerBalanceChange}`);
  console.log(`  Difference: ${winnerDifference}`);
  console.log(
    `  Percentage difference: ${winnerPercentageDifference.toFixed(4)}%`
  );

  expect(Math.abs(winnerPercentageDifference)).to.be.lessThan(0.2);

  // Check that other players didn't receive payouts
  // Check that other players didn't receive payouts
  for (let i = 0; i < players.length; i++) {
    if (i === 2) continue; // Skip the winner
    const playerBalanceChange = balanceChanges[i];
    const expectedPlayerBalanceChange = 0; // They should neither gain nor lose if entry fee is not deducted

    const playerDifference = expectedPlayerBalanceChange - playerBalanceChange;
    const playerPercentageDifference =
      (Math.abs(playerDifference) / Math.abs(entryFee.toNumber())) * 100;

    console.log(`Player ${i + 1} details:`);
    console.log(`  Actual balance change: ${playerBalanceChange}`);
    console.log(`  Expected balance change: ${expectedPlayerBalanceChange}`);
    console.log(`  Difference: ${playerDifference}`);
    console.log(
      `  Percentage difference: ${playerPercentageDifference.toFixed(4)}%`
    );

    expect(playerPercentageDifference).to.be.lessThan(0.2);
  }

  // Check admin balance change
  const adminBalanceDifference =
    adminBalanceChange - adminCommission.toNumber();
  console.log(
    `Admin balance difference from expected: ${adminBalanceDifference}`
  );
  expect(adminBalanceDifference).to.be.gte(0).and.lt(2000000); // Less than 0.002 SOL difference

  // Check treasury balance change
  const treasuryBalanceDifference =
    treasuryBalanceChange - treasuryFee.toNumber();
  console.log(
    `Treasury balance difference from expected: ${treasuryBalanceDifference}`
  );
  expect(treasuryBalanceDifference).to.be.gte(0).and.lt(10000); // Less than 0.00001 SOL difference

  console.log('Fund flow details:');
  console.log(`Total pool: ${totalPool.toString()}`);
  console.log(`Treasury fee: ${treasuryFee.toString()}`);
  console.log(`Admin commission: ${adminCommission.toString()}`);
  console.log(`Winner payout: ${expectedWinnerPayout.toString()}`);
  console.log(
    `Sum of outflows: ${treasuryFee
      .add(adminCommission)
      .add(expectedWinnerPayout)
      .toString()}`
  );
  console.log(
    `Difference from total pool: ${totalPool
      .sub(treasuryFee)
      .sub(adminCommission)
      .sub(expectedWinnerPayout)
      .toString()}`
  );

  // Check if the total outflows match the total pool
  const totalOutflows = treasuryFee
    .add(adminCommission)
    .add(expectedWinnerPayout);
  expect(totalOutflows.eq(totalPool)).to.be.true;

  console.log(
    'End game test with a single clear winner completed successfully'
  );
}
