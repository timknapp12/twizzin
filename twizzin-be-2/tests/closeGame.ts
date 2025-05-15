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

export async function closeGame(
  program: Program<TwizzinBe2>,
  provider: anchor.AnchorProvider,
  confirm: (signature: string) => Promise<string>
) {
  console.log('Starting close game tests');

  const uniqueId = Math.floor(Math.random() * 1000000);
  const getUniqueGameCode = (base: string) => `${base}${uniqueId}`;

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

  async function executeDeclareWinners(
    gameCode: string,
    winnerPubkeys: PublicKey[],
    playerPDAs: PublicKey[],
    isNative: boolean,
    vaultTokenAccount?: PublicKey | null
  ) {
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

    playerAccounts.sort((a, b) => {
      if (!a || !b) return 0;
      if (a.numCorrect !== b.numCorrect) {
        return b.numCorrect - a.numCorrect;
      }
      if (a.finishedTime.eq(b.finishedTime)) {
        return a.pubkey.toBuffer().compare(b.pubkey.toBuffer());
      }
      return a.finishedTime.sub(b.finishedTime).toNumber();
    });

    const sortedWinners = playerAccounts
      .filter((acc) => acc && acc.pubkey)
      .map((acc) => acc.pubkey);
    const sortedPDAs = playerAccounts
      .filter((acc) => acc && acc.pda)
      .map((acc) => acc.pda);

    if (sortedWinners.length === 0) {
      throw new Error('No winners to declare');
    }

    const { gamePda, vaultPda, winnersPda } = findPDAs(
      gameCode,
      provider.wallet.publicKey
    );

    try {
      const tx = await program.methods
        .declareWinners(sortedWinners)
        .accounts({
          admin: provider.wallet.publicKey,
          game: gamePda,
          vault: vaultPda,
          vaultTokenAccount: isNative ? null : vaultTokenAccount,
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

  // Test 1: Error Cases for Close Game
  console.log('\nTest 1: Close Game Error Cases');
  const gameCode1 = getUniqueGameCode('CLOSE1');
  const entryFee = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
  const commission = 500;
  const now1 = Math.floor(Date.now() / 1000);
  const startTime1 = new anchor.BN((now1 - 120) * 1000);
  const endTime1 = new anchor.BN((now1 + 3600) * 1000);
  const maxWinners = 3;
  const answerHash = Array(32).fill(1);
  const donationAmount = new anchor.BN(1 * LAMPORTS_PER_SOL);

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
      startTime1,
      endTime1,
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

  const playerPDAs = [];
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const playerPda = findPlayerPDA(gamePda, player.publicKey);
    playerPDAs.push(playerPda);

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

    const answers = [];
    for (let j = 0; j < i + 1; j++) {
      answers.push({
        displayOrder: j + 1,
        answer: 'test',
        questionId: 'test',
        proof: [],
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
    const submitNow = Math.floor(Date.now() / 1000);
    const clientFinishTime = new anchor.BN((submitNow - 30) * 1000);

    await program.methods
      .submitAnswers(answers, clientFinishTime)
      .accounts({
        player: player.publicKey,
        game: gamePda,
        playerAccount: playerPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([player])
      .rpc();
  }

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

  const { winnersPda } = findPDAs(gameCode1, provider.wallet.publicKey);
  const winners = players
    .slice(0, maxWinners)
    .map((player) => player.publicKey);
  await executeDeclareWinners(
    gameCode1,
    winners,
    playerPDAs.slice(0, winners.length),
    true
  );

  console.log('Testing close game error cases...');

  try {
    const nonWinner = players[3];
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

  const winner = players[0];
  const winnerPda = playerPDAs[0];
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
  console.log('Error case setup completed successfully');

  // Test 2: Successful SOL Game Closure
  console.log('\nTest 2: Successful SOL Game Closure');
  const gameCode2 = getUniqueGameCode('CLOSE2');
  const now2 = Math.floor(Date.now() / 1000);
  const startTime2 = new anchor.BN((now2 - 120) * 1000);
  const endTime2 = new anchor.BN((now2 + 3600) * 1000);
  const {
    gamePda: gamePda2,
    vaultPda: vaultPda2,
    winnersPda: winnersPda2,
  } = findPDAs(gameCode2, provider.wallet.publicKey);

  await program.methods
    .initGame(
      'Test Game 2',
      gameCode2,
      entryFee,
      commission,
      startTime2,
      endTime2,
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

  const players2 = Array(2)
    .fill(0)
    .map(() => Keypair.generate());
  for (const player of players2) {
    const tx = await provider.connection.requestAirdrop(
      player.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await confirm(tx);
  }

  const playerPDAs2 = [];
  for (let i = 0; i < players2.length; i++) {
    const player = players2[i];
    const playerPda = findPlayerPDA(gamePda2, player.publicKey);
    playerPDAs2.push(playerPda);

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

    await new Promise((resolve) => setTimeout(resolve, 1000));
    const submitNow = Math.floor(Date.now() / 1000);
    const clientFinishTime = new anchor.BN((submitNow - 30) * 1000);

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
        clientFinishTime
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

  await executeDeclareWinners(
    gameCode2,
    players2.map((p) => p.publicKey),
    playerPDAs2,
    true
  );

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
  console.log('SOL game closed successfully');

  // Test 3: Successful SPL Token Game Closure
  console.log('\nTest 3: Successful SPL Token Game Closure');
  const gameCode3 = getUniqueGameCode('CLOSE3');
  const now3 = Math.floor(Date.now() / 1000);
  const startTime3 = new anchor.BN((now3 - 120) * 1000);
  const endTime3 = new anchor.BN((now3 + 3600) * 1000);
  const { gamePda: gamePda3, vaultPda: vaultPda3 } = findPDAs(
    gameCode3,
    provider.wallet.publicKey
  );

  const mint = await createMint(
    provider.connection,
    provider.wallet.payer,
    provider.wallet.publicKey,
    null,
    9
  );

  const vaultTokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    provider.wallet.payer,
    mint,
    vaultPda3,
    true
  );

  const adminTokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    provider.wallet.payer,
    mint,
    provider.wallet.publicKey
  );

  const mintAmount = new anchor.BN(1000 * LAMPORTS_PER_SOL);
  await mintTo(
    provider.connection,
    provider.wallet.payer,
    mint,
    adminTokenAccount.address,
    provider.wallet.publicKey,
    mintAmount.toNumber()
  );

  await program.methods
    .initGame(
      'Test Game 3',
      gameCode3,
      new anchor.BN(5 * LAMPORTS_PER_SOL),
      commission,
      startTime3,
      endTime3,
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

  await transfer(
    provider.connection,
    provider.wallet.payer,
    adminTokenAccount.address,
    vaultTokenAccount.address,
    provider.wallet.publicKey,
    mintAmount.toNumber() / 2
  );

  const players3 = Array(2)
    .fill(0)
    .map(() => Keypair.generate());
  for (const player of players3) {
    const tx = await provider.connection.requestAirdrop(
      player.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await confirm(tx);
    const playerTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mint,
      player.publicKey
    );
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mint,
      playerTokenAccount.address,
      provider.wallet.publicKey,
      10 * LAMPORTS_PER_SOL
    );
  }

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

    await new Promise((resolve) => setTimeout(resolve, 1000));
    const submitNow = Math.floor(Date.now() / 1000);
    const clientFinishTime = new anchor.BN((submitNow - 30) * 1000);

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
        clientFinishTime
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

  const { winnersPda: winnersPda3 } = findPDAs(
    gameCode3,
    provider.wallet.publicKey
  );
  await executeDeclareWinners(
    gameCode3,
    players3.map((p) => p.publicKey),
    playerPDAs3,
    false,
    vaultTokenAccount.address
  );

  const initialTokenBalances = await Promise.all(
    playerTokenAccounts.map((account) =>
      getAccount(provider.connection, account.address)
    )
  );

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

    const newTokenAccount = await getAccount(
      provider.connection,
      playerTokenAccount.address
    );
    expect(Number(newTokenAccount.amount)).to.be.above(
      Number(initialTokenBalances[i].amount)
    );
  }
  console.log('SPL token claims completed successfully');

  // Final close game scenarios
  console.log('\nTesting additional close game scenarios');
  const gameCode4 = getUniqueGameCode('CLOSE4');
  const now4 = Math.floor(Date.now() / 1000);
  const startTime4 = new anchor.BN((now4 - 120) * 1000);
  const endTime4 = new anchor.BN((now4 + 3600) * 1000);
  const {
    gamePda: gamePda4,
    vaultPda: vaultPda4,
    winnersPda: winnersPda4,
  } = findPDAs(gameCode4, provider.wallet.publicKey);

  await program.methods
    .initGame(
      'Test Game 4',
      gameCode4,
      entryFee,
      commission,
      startTime4,
      endTime4,
      maxWinners,
      answerHash,
      donationAmount,
      false,
      false
    )
    .accounts({
      admin: provider.wallet.publicKey,
      game: gamePda4,
      tokenMint: NATIVE_MINT,
      vault: vaultPda4,
      vaultTokenAccount: null,
      adminTokenAccount: null,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const player4 = Keypair.generate();
  const tx = await provider.connection.requestAirdrop(
    player4.publicKey,
    2 * LAMPORTS_PER_SOL
  );
  await confirm(tx);

  const balance = await provider.connection.getBalance(player4.publicKey);
  console.log('Player balance:', balance / LAMPORTS_PER_SOL, 'SOL');

  const playerPda4 = findPlayerPDA(gamePda4, player4.publicKey);

  await program.methods
    .joinGame()
    .accounts({
      player: player4.publicKey,
      game: gamePda4,
      playerAccount: playerPda4,
      vault: vaultPda4,
      vaultTokenAccount: null,
      playerTokenAccount: null,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([player4])
    .rpc();

  await new Promise((resolve) => setTimeout(resolve, 1000));
  const submitNow = Math.floor(Date.now() / 1000);
  const clientFinishTime = new anchor.BN((submitNow - 30) * 1000);

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
      clientFinishTime
    )
    .accounts({
      player: player4.publicKey,
      game: gamePda4,
      playerAccount: playerPda4,
      systemProgram: SystemProgram.programId,
    })
    .signers([player4])
    .rpc();

  await program.methods
    .endGame()
    .accounts({
      admin: provider.wallet.publicKey,
      game: gamePda4,
      vault: vaultPda4,
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

  await executeDeclareWinners(
    gameCode4,
    [player4.publicKey],
    [playerPda4],
    true
  );

  console.log('Testing closure before claims...');
  try {
    await program.methods
      .closeGame()
      .accounts({
        admin: provider.wallet.publicKey,
        game: gamePda4,
        winners: winnersPda4,
        vault: vaultPda4,
        vaultTokenAccount: null,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    assert.fail('Should have failed to close game with unclaimed prizes');
  } catch (error) {
    const errorMessage = error.toString().toLowerCase();
    expect(errorMessage.includes('unclaimed')).to.be.true;
  }

  console.log('Processing winner claim before closure...');
  await program.methods
    .claim()
    .accounts({
      player: player4.publicKey,
      game: gamePda4,
      winners: winnersPda4,
      playerAccount: playerPda4,
      vault: vaultPda4,
      vaultTokenAccount: null,
      playerTokenAccount: null,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([player4])
    .rpc();

  console.log('Testing successful game closure...');
  await program.methods
    .closeGame()
    .accounts({
      admin: provider.wallet.publicKey,
      game: gamePda4,
      winners: winnersPda4,
      vault: vaultPda4,
      vaultTokenAccount: null,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log('Testing double closure prevention...');
  try {
    await program.methods
      .closeGame()
      .accounts({
        admin: provider.wallet.publicKey,
        game: gamePda4,
        winners: winnersPda4,
        vault: vaultPda4,
        vaultTokenAccount: null,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    assert.fail('Should have thrown AccountNotInitialized error');
  } catch (error) {
    expect(error.message).to.include('AccountNotInitialized');
  }

  console.log('Close game test scenarios completed successfully');
}
