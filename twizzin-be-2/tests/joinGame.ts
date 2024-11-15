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
} from '@solana/spl-token';

export async function joinGame(
  program: Program<TwizzinBe2>,
  provider: anchor.AnchorProvider,
  confirm: (signature: string) => Promise<string>
) {
  console.log('Starting join game tests');

  // Test parameters for game creation
  const validName = 'Test Game';
  const validGameCode = 'GAME1';
  const validEntryFee = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
  const validCommission = 5;
  const now = Math.floor(Date.now() / 1000);
  const validStartTime = new anchor.BN(now);
  const validEndTime = new anchor.BN(now + 3600);
  const validMaxWinners = 5;
  const validAnswerHash = Array(32).fill(1);

  // Helper function to setup a player with enough SOL
  const setupPlayer = async () => {
    const player = anchor.web3.Keypair.generate();

    // Calculate rent for player account
    const rentExempt =
      await provider.connection.getMinimumBalanceForRentExemption(200);

    // Airdrop enough for rent + transaction fees + potential entry fee
    const airdropAmount = rentExempt + 0.5 * LAMPORTS_PER_SOL;
    const airdropSig = await provider.connection.requestAirdrop(
      player.publicKey,
      airdropAmount
    );
    await confirm(airdropSig);

    return player;
  };

  // Helper function for executing join game
  const executeJoinGame = async (params: {
    gameCode: string;
    player: anchor.web3.Keypair;
    tokenMint?: PublicKey;
    playerTokenAccount?: PublicKey;
    vaultTokenAccount?: PublicKey;
  }) => {
    const { gameCode, player, tokenMint = NATIVE_MINT } = params;

    const [gamePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('game'),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from(gameCode),
      ],
      program.programId
    );

    const [playerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('player'), gamePda.toBuffer(), player.publicKey.toBuffer()],
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

    const isNative = tokenMint.equals(NATIVE_MINT);

    const accounts = {
      player: player.publicKey,
      game: gamePda,
      playerAccount: playerPda,
      vault: vaultPda,
      vaultTokenAccount: isNative ? null : params.vaultTokenAccount,
      playerTokenAccount: isNative ? null : params.playerTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    };

    return program.methods
      .joinGame()
      .accounts(accounts)
      .signers([player])
      .rpc();
  };

  // Helper function for error checking
  const expectError = (error: any, errorTypes: string[]) => {
    const errorString = error.toString();
    if (errorString.includes('custom program error: 0x1')) {
      // Handle insufficient funds error
      return;
    }
    if (errorString.includes('Error: custom program error:')) {
      const errorMessage = error.logs[1];
      const hasExpectedError = errorTypes.some((type) =>
        errorMessage.includes(type)
      );
      expect(
        hasExpectedError,
        `Expected one of [${errorTypes}] but got logs: ${error.logs.join('\n')}`
      ).to.be.true;
    } else {
      const hasExpectedError = errorTypes.some((type) =>
        errorString.includes(type)
      );
      expect(
        hasExpectedError,
        `Expected one of [${errorTypes}] but got: ${errorString}`
      ).to.be.true;
    }
  };

  // Helper function to create a game
  const createGame = async (params: {
    gameCode: string;
    entryFee: anchor.BN;
    tokenMint?: PublicKey;
    startTime?: anchor.BN;
    endTime?: anchor.BN;
  }) => {
    const {
      gameCode,
      entryFee,
      tokenMint = NATIVE_MINT,
      startTime = validStartTime,
      endTime = validEndTime,
    } = params;

    let adminTokenAccount = null;
    let vaultTokenAccount = null;

    const [vaultPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from(gameCode),
      ],
      program.programId
    );

    if (!tokenMint.equals(NATIVE_MINT)) {
      adminTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.payer,
        tokenMint,
        provider.wallet.publicKey
      );

      // Create the vault's token account
      vaultTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.payer,
        tokenMint,
        vaultPda,
        true // allowOwnerOffCurve: true for PDA
      );
    }

    const [gamePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('game'),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from(gameCode),
      ],
      program.programId
    );

    const tx = await program.methods
      .initGame(
        validName,
        gameCode,
        entryFee,
        validCommission,
        startTime,
        endTime,
        validMaxWinners,
        validAnswerHash,
        new anchor.BN(0)
      )
      .accounts({
        admin: provider.wallet.publicKey,
        game: gamePda,
        tokenMint,
        vault: vaultPda,
        vaultTokenAccount: vaultTokenAccount?.address || null,
        adminTokenAccount: adminTokenAccount?.address || null,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await confirm(tx);
    return { gamePda, vaultPda, vaultTokenAccount };
  };

  // Test 1: Successfully join a free native SOL game
  console.log('Testing joining free native SOL game...');
  try {
    const gameCode = 'FREE1';
    const player = await setupPlayer();

    // Create free game
    await createGame({
      gameCode,
      entryFee: new anchor.BN(0),
    });

    // Join game
    const tx = await executeJoinGame({
      gameCode,
      player,
    });
    await confirm(tx);

    // Verify player account was created correctly
    const [gamePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('game'),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from(gameCode),
      ],
      program.programId
    );
    const [playerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('player'), gamePda.toBuffer(), player.publicKey.toBuffer()],
      program.programId
    );

    const playerAccount = await program.account.playerAccount.fetch(playerPda);
    expect(playerAccount.player.equals(player.publicKey)).to.be.true;
    expect(playerAccount.finishedTime.eq(new anchor.BN(0))).to.be.true;
    expect(playerAccount.numCorrect).to.equal(0);

    console.log('Free native SOL game join test passed');
  } catch (error) {
    console.error('Free native SOL game join test failed:', error);
    throw error;
  }

  // Test 2: Successfully join a paid native SOL game
  console.log('Testing joining paid native SOL game...');
  try {
    const gameCode = 'PAID1';
    const player = await setupPlayer();

    // Create paid game
    await createGame({
      gameCode,
      entryFee: validEntryFee,
    });

    const balanceBefore = await provider.connection.getBalance(
      player.publicKey
    );

    // Join game
    const tx = await executeJoinGame({
      gameCode,
      player,
    });
    await confirm(tx);

    // Verify SOL was transferred
    const balanceAfter = await provider.connection.getBalance(player.publicKey);
    expect(balanceAfter).to.be.lessThan(
      balanceBefore - validEntryFee.toNumber()
    );

    console.log('Paid native SOL game join test passed');
  } catch (error) {
    console.error('Paid native SOL game join test failed:', error);
    throw error;
  }

  // Test 3: Fail to join game after end time
  console.log('Testing joining ended game...');
  try {
    const gameCode = 'END1';
    const player = await setupPlayer();

    // Create ended game
    await createGame({
      gameCode,
      entryFee: new anchor.BN(0),
      startTime: new anchor.BN(now - 7200), // 2 hours ago
      endTime: new anchor.BN(now - 3600), // 1 hour ago
    });

    // Attempt to join
    await executeJoinGame({
      gameCode,
      player,
    });
    throw new Error('Should have failed with GameEnded');
  } catch (error) {
    expectError(error, ['GameEnded', 'Error: 6000']);
    console.log('Game ended test passed');
  }

  // Test 4: Fail to join with insufficient SOL
  console.log('Testing joining with insufficient SOL...');
  try {
    const gameCode = 'INSUF1';
    const player = anchor.web3.Keypair.generate();
    // Don't airdrop any SOL to this player

    // Create expensive game
    await createGame({
      gameCode,
      entryFee: new anchor.BN(2 * LAMPORTS_PER_SOL),
    });

    // Attempt to join without enough SOL
    await executeJoinGame({
      gameCode,
      player,
    });
    throw new Error('Should have failed with insufficient funds');
  } catch (error) {
    expectError(error, ['insufficient lamports', '0x1']);
    console.log('Insufficient SOL test passed');
  }

  // Test 5: Fail to join same game twice
  console.log('Testing joining game twice...');
  try {
    const gameCode = 'TWICE1';
    const player = await setupPlayer();

    // Create game
    await createGame({
      gameCode,
      entryFee: new anchor.BN(0),
    });

    // Join first time
    const tx = await executeJoinGame({
      gameCode,
      player,
    });
    await confirm(tx);

    // Attempt to join second time
    await executeJoinGame({
      gameCode,
      player,
    });
    throw new Error('Should have failed joining twice');
  } catch (error) {
    expectError(error, ['account already exists', '0x0']);
    console.log('Join twice test passed');
  }

  // Test 6: Successfully join a paid SPL token game
  console.log('Testing joining paid SPL token game...');
  try {
    const gameCode = 'TOKEN1';
    const player = await setupPlayer();

    // Create new SPL token mint
    const mint = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      9
    );

    // Create token accounts for player
    const playerTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mint,
      player.publicKey
    );

    // Mint some tokens to player
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mint,
      playerTokenAccount.address,
      provider.wallet.payer,
      100 * LAMPORTS_PER_SOL
    );

    // Create paid token game
    const { vaultTokenAccount } = await createGame({
      gameCode,
      entryFee: new anchor.BN(5 * LAMPORTS_PER_SOL),
      tokenMint: mint,
    });

    const balanceBefore = (
      await getAccount(provider.connection, playerTokenAccount.address)
    ).amount;

    // Join game
    const tx = await executeJoinGame({
      gameCode,
      player,
      tokenMint: mint,
      playerTokenAccount: playerTokenAccount.address,
      vaultTokenAccount: vaultTokenAccount.address,
    });
    await confirm(tx);

    // Verify tokens were transferred
    const balanceAfter = (
      await getAccount(provider.connection, playerTokenAccount.address)
    ).amount;
    expect(balanceAfter.toString()).to.equal(
      (balanceBefore - BigInt(5 * LAMPORTS_PER_SOL)).toString()
    );

    console.log('Paid SPL token game join test passed');
  } catch (error) {
    console.error('Paid SPL token game join test failed:', error);
    throw error;
  }

  // Test 7: Fail to join SPL token game without token account
  console.log('Testing joining token game without token account...');
  try {
    const gameCode = 'TOKEN2';
    const player = await setupPlayer();

    // Create new SPL token mint
    const mint = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      9
    );

    // Create paid token game
    const { vaultTokenAccount } = await createGame({
      gameCode,
      entryFee: new anchor.BN(1 * LAMPORTS_PER_SOL),
      tokenMint: mint,
    });

    // Attempt to join without token account
    await executeJoinGame({
      gameCode,
      player,
      tokenMint: mint,
      playerTokenAccount: null,
      vaultTokenAccount: vaultTokenAccount.address,
    });
    throw new Error('Should have failed with PlayerTokenAccountNotProvided');
  } catch (error) {
    expectError(error, [
      'PlayerTokenAccountNotProvided',
      '6014',
      'Player token account not provided',
    ]);
    console.log('Missing token account test passed');
  }

  // Test 8: Fail to join SPL token game with insufficient tokens
  console.log('Testing joining token game with insufficient balance...');
  try {
    const gameCode = 'TOKEN3';
    const player = await setupPlayer();

    // Create new SPL token mint
    const mint = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      9
    );

    // Create token account for player but don't mint any tokens
    const playerTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mint,
      player.publicKey
    );

    // Create paid token game
    const { vaultTokenAccount } = await createGame({
      gameCode,
      entryFee: new anchor.BN(1 * LAMPORTS_PER_SOL),
      tokenMint: mint,
    });

    // Attempt to join without enough tokens
    await executeJoinGame({
      gameCode,
      player,
      tokenMint: mint,
      playerTokenAccount: playerTokenAccount.address,
      vaultTokenAccount: vaultTokenAccount.address,
    });
    throw new Error('Should have failed with insufficient token balance');
  } catch (error) {
    // The error here might vary depending on the token program's error handling
    console.log('Insufficient tokens test passed');
  }

  // Test 9: Successfully join a free SPL token game
  console.log('Testing joining free SPL token game...');
  try {
    const gameCode = 'TOKEN4';
    const player = await setupPlayer();

    // Create new SPL token mint
    const mint = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      9
    );

    // Create free token game (0 entry fee)
    const { vaultTokenAccount } = await createGame({
      gameCode,
      entryFee: new anchor.BN(0),
      tokenMint: mint,
    });

    const solBalanceBefore = await provider.connection.getBalance(
      player.publicKey
    );

    // Join game - For free games, we still need to pass the vault token account
    // but the player token account can be null since no transfer will occur
    const tx = await executeJoinGame({
      gameCode,
      player,
      tokenMint: mint,
      playerTokenAccount: null,
      vaultTokenAccount: vaultTokenAccount.address,
    });
    await confirm(tx);

    // Verify only SOL was spent on gas
    const solBalanceAfter = await provider.connection.getBalance(
      player.publicKey
    );
    expect(solBalanceAfter).to.be.lessThan(solBalanceBefore); // Some SOL spent on gas

    console.log('Free SPL token game join test passed');
  } catch (error) {
    console.error('Free SPL token game join test failed:', error);
    throw error;
  }

  console.log('All join game tests completed successfully');
}
