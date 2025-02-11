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
  getAccount,
  transfer,
} from '@solana/spl-token';

export async function claim(
  program: Program<TwizzinBe2>,
  provider: anchor.AnchorProvider,
  confirm: (signature: string) => Promise<string>
) {
  console.log('Starting claim tests');

  const uniqueId = Math.floor(Math.random() * 1000000);
  const getUniqueGameCode = (base: string) => `${base}${uniqueId}`;

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

  // Helper function to get player account data
  async function getPlayerAccount(pda: PublicKey) {
    try {
      const account = await program.account.playerAccount.fetch(pda);
      return {
        numCorrect: account.numCorrect,
        finishedTime: account.finishedTime,
        player: account.player,
      };
    } catch (error) {
      console.error('Error fetching player account:', error);
      throw error;
    }
  }

  // Helper to declare winners
  async function executeDeclareWinners(
    gameCode: string,
    winnerPubkeys: PublicKey[],
    playerPDAs: PublicKey[]
  ) {
    // Get all player accounts
    const playerAccounts = await Promise.all(
      playerPDAs.map(async (pda, index) => {
        try {
          const account = await getPlayerAccount(pda);
          return {
            pubkey: winnerPubkeys[index],
            pda,
            numCorrect: account.numCorrect,
            finishedTime: account.finishedTime,
          };
        } catch (error) {
          console.error(
            'Error fetching player account:',
            pda.toString(),
            error
          );
          throw error;
        }
      })
    );

    // Sort by score (descending) and finish time (ascending)
    playerAccounts.sort((a, b) => {
      if (!a || !b) return 0; // Handle null values
      if (a.numCorrect !== b.numCorrect) {
        return b.numCorrect - a.numCorrect; // Higher scores first
      }
      // For equal scores, ensure deterministic ordering
      if (a.finishedTime.eq(b.finishedTime)) {
        return a.pubkey.toBuffer().compare(b.pubkey.toBuffer());
      }
      return a.finishedTime.sub(b.finishedTime).toNumber();
    });

    // Get sorted arrays, filtering out any null values
    const sortedWinners = playerAccounts
      .filter((acc) => acc && acc.pubkey)
      .map((acc) => acc.pubkey);
    const sortedPDAs = playerAccounts
      .filter((acc) => acc && acc.pda)
      .map((acc) => acc.pda);

    if (sortedWinners.length === 0) {
      throw new Error('No winners to declare');
    }

    const { gamePda, winnersPda } = findPDAs(
      gameCode,
      provider.wallet.publicKey
    );

    try {
      const tx = await program.methods
        .declareWinners(sortedWinners)
        .accounts({
          admin: provider.wallet.publicKey,
          game: gamePda,
          winners: winnersPda,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts(
          sortedPDAs.map((pda) => ({
            pubkey: pda,
            isWritable: false,
            isSigner: false,
          }))
        )
        .rpc();

      await confirm(tx);
      return tx;
    } catch (error) {
      console.error('Error in executeDeclareWinners:', error);
      throw error;
    }
  }

  // Test 1: Error Cases
  console.log('\nTest 1: Error Cases');
  const gameCode1 = getUniqueGameCode('CLAIM1');
  const entryFee = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
  const commission = 500; // 5%
  const now = Date.now();
  const startTime = new anchor.BN(now);
  const endTime = new anchor.BN(now + 3600 * 1000);
  const maxWinners = 3;
  const answerHash = Array(32).fill(1);
  const donationAmount = new anchor.BN(1 * LAMPORTS_PER_SOL);

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
      false,
      false
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

  // Create and fund players
  const players = Array(4)
    .fill(0)
    .map(() => Keypair.generate());

  for (const player of players) {
    const tx = await provider.connection.requestAirdrop(
      player.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await confirm(tx);
  }

  // Have players join and submit answers with different scores and times
  const playerPDAs = [];
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const playerPda = findPlayerPDA(gamePda, player.publicKey);
    playerPDAs.push(playerPda);

    // Join game
    await program.methods
      .joinGame()
      .accounts({
        player: player.publicKey,
        game: gamePda,
        playerAccount: playerPda,
        vault: vaultPda,
        vaultTokenAccount: null,
        playerTokenAccount: null,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([player])
      .rpc();

    // Submit answers with different scores and times
    const answers = [];
    // Add i+1 correct answers for each player
    for (let j = 0; j < i + 1; j++) {
      answers.push({
        displayOrder: j + 1,
        answer: 'test',
        questionId: 'test',
        proof: [],
      });
    }

    await program.methods
      .submitAnswers(
        answers,
        new anchor.BN(now + i * 100) // Different finish times
      )
      .accounts({
        player: player.publicKey,
        game: gamePda,
        playerAccount: playerPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([player])
      .rpc();
  }

  // End game
  await program.methods
    .endGame()
    .accounts({
      admin: provider.wallet.publicKey,
      game: gamePda,
      vault: vaultPda,
      config: configPda,
      treasury: (
        await program.account.programConfig.fetch(configPda)
      ).treasuryPubkey,
      vaultTokenAccount: null,
      adminTokenAccount: null,
      treasuryTokenAccount: null,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  // Declare winners
  const { winnersPda } = findPDAs(gameCode1, provider.wallet.publicKey);
  const winners = players
    .slice(0, maxWinners)
    .map((player) => player.publicKey);

  // Make sure players have finished and have scores before declaring winners
  await executeDeclareWinners(
    gameCode1,
    winners,
    playerPDAs.slice(0, winners.length)
  );

  // After declaring winners, let's verify the winners account
  console.log('Testing error cases...');

  // Case 1: Non-winner tries to claim
  try {
    const nonWinner = players[3]; // Fourth player
    const nonWinnerPda = playerPDAs[3];

    await program.methods
      .claim()
      .accounts({
        player: nonWinner.publicKey,
        game: gamePda,
        winners: winnersPda,
        playerAccount: nonWinnerPda,
        vault: vaultPda,
        vaultTokenAccount: null,
        playerTokenAccount: null,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([nonWinner])
      .rpc();

    assert.fail('Should have thrown NotAWinner error');
  } catch (error) {
    expect(error.message).to.include('NotAWinner');
  }

  // Case 2: Double claim attempt
  const winner = players[0]; // First winner
  const winnerPda = playerPDAs[0];

  // First claim should succeed
  await program.methods
    .claim()
    .accounts({
      player: winner.publicKey,
      game: gamePda,
      winners: winnersPda,
      playerAccount: winnerPda,
      vault: vaultPda,
      vaultTokenAccount: null,
      playerTokenAccount: null,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([winner])
    .rpc();

  console.log('First claim succeeded, attempting second claim...');

  // Second claim should fail because the player account is closed
  try {
    await program.methods
      .claim()
      .accounts({
        player: winner.publicKey,
        game: gamePda,
        winners: winnersPda,
        playerAccount: winnerPda,
        vault: vaultPda,
        vaultTokenAccount: null,
        playerTokenAccount: null,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([winner])
      .rpc();
    assert.fail('Should have thrown AccountNotInitialized error');
  } catch (error) {
    console.log('Second claim error:', error.message);
    expect(error.message).to.include('AccountNotInitialized');
  }

  console.log('Error cases completed successfully');

  // Test 2: Successful SOL Claims
  console.log('\nTest 2: Successful SOL Claims');

  // Create new game for SOL claims test
  const gameCode2 = getUniqueGameCode('CLAIM2');
  const {
    gamePda: gamePda2,
    vaultPda: vaultPda2,
    winnersPda: winnersPda2,
  } = findPDAs(gameCode2, provider.wallet.publicKey);

  // Initialize game
  await program.methods
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
      false,
      false
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

  // Create and fund players
  const players2 = Array(2)
    .fill(0)
    .map(() => Keypair.generate());

  // Fund players
  for (const player of players2) {
    const tx = await provider.connection.requestAirdrop(
      player.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await confirm(tx);
  }

  // Have players join and submit answers
  const playerPDAs2 = [];
  for (let i = 0; i < players2.length; i++) {
    const player = players2[i];
    const playerPda = findPlayerPDA(gamePda2, player.publicKey);
    playerPDAs2.push(playerPda);

    // Join game
    await program.methods
      .joinGame()
      .accounts({
        player: player.publicKey,
        game: gamePda2,
        playerAccount: playerPda,
        vault: vaultPda2,
        vaultTokenAccount: null,
        playerTokenAccount: null,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([player])
      .rpc();

    // Submit answers with different finish times
    await program.methods
      .submitAnswers(
        [
          {
            displayOrder: 1,
            answer: 'test',
            questionId: 'test',
            proof: [],
          },
        ],
        new anchor.BN(now + i * 100) // Different finish time for each player
      )
      .accounts({
        player: player.publicKey,
        game: gamePda2,
        playerAccount: playerPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([player])
      .rpc();
  }

  // End game
  await program.methods
    .endGame()
    .accounts({
      admin: provider.wallet.publicKey,
      game: gamePda2,
      vault: vaultPda2,
      config: configPda,
      treasury: (
        await program.account.programConfig.fetch(configPda)
      ).treasuryPubkey,
      vaultTokenAccount: null,
      adminTokenAccount: null,
      treasuryTokenAccount: null,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  // Declare winners
  await executeDeclareWinners(
    gameCode2,
    players2.map((p) => p.publicKey),
    playerPDAs2
  );

  // Test successful claims
  for (let i = 0; i < players2.length; i++) {
    const player = players2[i];
    const playerPda = playerPDAs2[i];

    await program.methods
      .claim()
      .accounts({
        player: player.publicKey,
        game: gamePda2,
        winners: winnersPda2,
        playerAccount: playerPda,
        vault: vaultPda2,
        vaultTokenAccount: null,
        playerTokenAccount: null,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([player])
      .rpc();
  }
  console.log(`Claim successful for winner SOL`);

  // Test 3: Successful SPL Token Claims
  console.log('\nTest 3: Successful SPL Token Claims');
  const gameCode3 = getUniqueGameCode('CLAIM3');
  const { gamePda: gamePda3, vaultPda: vaultPda3 } = findPDAs(
    gameCode3,
    provider.wallet.publicKey
  );

  // Create new SPL token mint
  const mint = await createMint(
    provider.connection,
    provider.wallet.payer,
    provider.wallet.publicKey,
    null,
    9
  );

  // Create vault token account
  const vaultTokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    provider.wallet.payer,
    mint,
    vaultPda3,
    true // allowOwnerOffCurve
  );

  // Create admin token account and mint tokens
  const adminTokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    provider.wallet.payer,
    mint,
    provider.wallet.publicKey
  );

  await mintTo(
    provider.connection,
    provider.wallet.payer,
    mint,
    adminTokenAccount.address,
    provider.wallet.publicKey,
    1000 * LAMPORTS_PER_SOL
  );

  // Test 3: Successful SPL Token Claims
  // After creating the vault token account and before initializing the game
  const mintAmount = new anchor.BN(1000 * LAMPORTS_PER_SOL); // Mint enough tokens for prizes

  // Mint tokens to admin
  await mintTo(
    provider.connection,
    provider.wallet.payer,
    mint,
    adminTokenAccount.address,
    provider.wallet.publicKey,
    mintAmount.toNumber()
  );

  // Initialize game
  await program.methods
    .initGame(
      'Test Game 3',
      gameCode3,
      new anchor.BN(5 * LAMPORTS_PER_SOL), // 5 token entry fee
      commission,
      startTime,
      endTime,
      maxWinners,
      answerHash,
      donationAmount,
      false,
      false
    )
    .accounts({
      admin: provider.wallet.publicKey,
      game: gamePda3,
      tokenMint: mint,
      vault: vaultPda3,
      vaultTokenAccount: vaultTokenAccount.address,
      adminTokenAccount: adminTokenAccount.address,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  // Transfer tokens to vault for prizes
  await transfer(
    provider.connection,
    provider.wallet.payer,
    adminTokenAccount.address,
    vaultTokenAccount.address,
    provider.wallet.publicKey,
    mintAmount.toNumber() / 2 // Transfer half of minted tokens to vault
  );

  // Create and fund players
  const players3 = Array(2)
    .fill(0)
    .map(() => Keypair.generate());

  // Setup players with SOL for transaction fees
  for (const player of players3) {
    const tx = await provider.connection.requestAirdrop(
      player.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await confirm(tx);

    // Create and fund player token accounts
    const playerTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mint,
      player.publicKey
    );

    // Mint tokens to player
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mint,
      playerTokenAccount.address,
      provider.wallet.publicKey,
      10 * LAMPORTS_PER_SOL
    );
  }

  // Players join and submit answers with different finish times
  const playerPDAs3 = [];
  const playerTokenAccounts = [];
  for (let i = 0; i < players3.length; i++) {
    const player = players3[i];
    const playerPda = findPlayerPDA(gamePda3, player.publicKey);
    const playerTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mint,
      player.publicKey
    );
    playerTokenAccounts.push(playerTokenAccount);

    await program.methods
      .joinGame()
      .accounts({
        player: player.publicKey,
        game: gamePda3,
        playerAccount: playerPda,
        vault: vaultPda3,
        vaultTokenAccount: vaultTokenAccount.address,
        playerTokenAccount: playerTokenAccount.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([player])
      .rpc();
    playerPDAs3.push(playerPda);

    await program.methods
      .submitAnswers(
        [
          {
            displayOrder: 1,
            answer: 'test',
            questionId: 'test',
            proof: [],
          },
        ],
        new anchor.BN(now + i * 100) // Different finish time for each player
      )
      .accounts({
        player: player.publicKey,
        game: gamePda3,
        playerAccount: playerPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([player])
      .rpc();
  }

  // End game
  const config = await program.account.programConfig.fetch(configPda);
  const treasuryTokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    provider.wallet.payer,
    mint,
    config.treasuryPubkey
  );

  await program.methods
    .endGame()
    .accounts({
      admin: provider.wallet.publicKey,
      game: gamePda3,
      vault: vaultPda3,
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
  const { winnersPda: winnersPda3 } = findPDAs(
    gameCode3,
    provider.wallet.publicKey
  );
  const winners3 = [
    {
      player: players3[0].publicKey,
      score: new anchor.BN(100),
      finishTime: new anchor.BN(now + 100),
      prizeAmount: new anchor.BN(1_000_000),
    },
    {
      player: players3[1].publicKey,
      score: new anchor.BN(90),
      finishTime: new anchor.BN(now + 200),
      prizeAmount: new anchor.BN(500_000),
    },
  ];

  // Sort winners
  winners3.sort((a, b) => {
    if (!a.score.eq(b.score)) {
      return b.score.sub(a.score).toNumber();
    }
    return a.finishTime.sub(b.finishTime).toNumber();
  });

  await executeDeclareWinners(
    gameCode3,
    winners3.slice(0, maxWinners).map((kp) => kp.player),
    playerPDAs3.slice(0, maxWinners)
  );

  // Record initial token balances
  const initialTokenBalances = await Promise.all(
    playerTokenAccounts.map((account) =>
      getAccount(provider.connection, account.address)
    )
  );

  // Have all winners claim their prizes
  for (let i = 0; i < players3.length; i++) {
    const player = players3[i];
    const playerPda = playerPDAs3[i];
    const playerTokenAccount = playerTokenAccounts[i];

    await program.methods
      .claim()
      .accounts({
        player: player.publicKey,
        game: gamePda3,
        winners: winnersPda3,
        playerAccount: playerPda,
        vault: vaultPda3,
        vaultTokenAccount: vaultTokenAccount.address,
        playerTokenAccount: playerTokenAccount.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([player])
      .rpc();

    // Verify token balance increased
    const newTokenAccount = await getAccount(
      provider.connection,
      playerTokenAccount.address
    );
    expect(Number(newTokenAccount.amount)).to.be.above(
      Number(initialTokenBalances[i].amount)
    );
  }
  console.log('SPL token claims completed successfully');

  console.log('All claim tests completed successfully');
}
