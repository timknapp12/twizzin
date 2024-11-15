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

export async function claim(
  program: Program<TwizzinBe2>,
  provider: anchor.AnchorProvider,
  confirm: (signature: string) => Promise<string>
) {
  console.log('Starting claim tests');

  // Test 1: Claim before game end
  console.log('Testing claim before game end...');
  try {
    const gameCode = 'EARLY' + Math.floor(Math.random() * 1000000);

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

    const now = Math.floor(Date.now() / 1000);
    const startTime = new anchor.BN(now);
    const endTime = new anchor.BN(now + 3600);
    const entryFee = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
    const commission = 5;
    const maxWinners = 5;
    const answerHash = Array(32).fill(1);
    const donationAmount = new anchor.BN(0.2 * LAMPORTS_PER_SOL);

    const rentExemption =
      await provider.connection.getMinimumBalanceForRentExemption(
        program.account.game.size
      );

    const tx = await program.methods
      .initGame(
        'Test Game',
        gameCode,
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
    await confirm(tx);

    const player = Keypair.generate();

    const airdropSig = await provider.connection.requestAirdrop(
      player.publicKey,
      LAMPORTS_PER_SOL
    );
    await confirm(airdropSig);

    const [playerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('player'), gamePda.toBuffer(), player.publicKey.toBuffer()],
      program.programId
    );

    const joinTx = await program.methods
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
    await confirm(joinTx);

    console.log('Attempting early claim...');
    await program.methods
      .claim(donationAmount)
      .accounts({
        player: player.publicKey,
        game: gamePda,
        playerAccount: playerPda,
        vault: vaultPda,
        vaultTokenAccount: null,
        playerTokenAccount: null,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([player])
      .rpc();

    throw new Error('Should have failed with game not ended');
  } catch (error) {
    expect(error.toString()).to.include('GameNotEnded');
    console.log('Early claim test passed (failed as expected)');
  }

  // Test 2: Successful SOL claim
  console.log('\nTesting successful SOL claim...');
  try {
    const gameCode = 'CLAIM' + Math.floor(Math.random() * 1000000);

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

    const now = Math.floor(Date.now() / 1000);
    const startTime = new anchor.BN(now);
    const endTime = new anchor.BN(now + 3600);
    const entryFee = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
    const commission = 5;
    const maxWinners = 2;
    const answerHash = Array(32).fill(1);
    const donationAmount = new anchor.BN(0.2 * LAMPORTS_PER_SOL);

    const rentExemption =
      await provider.connection.getMinimumBalanceForRentExemption(
        program.account.game.size
      );

    const tx = await program.methods
      .initGame(
        'Test Game',
        gameCode,
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
    await confirm(tx);

    // Setup multiple players
    const numPlayers = 3;
    const players = Array(numPlayers)
      .fill(0)
      .map(() => Keypair.generate());
    const playerPdas = [];

    // Create and fund players
    for (const player of players) {
      const airdropSig = await provider.connection.requestAirdrop(
        player.publicKey,
        LAMPORTS_PER_SOL
      );
      await confirm(airdropSig);

      // Create player PDA and join game
      const [playerPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('player'),
          gamePda.toBuffer(),
          player.publicKey.toBuffer(),
        ],
        program.programId
      );
      playerPdas.push(playerPda);

      const joinTx = await program.methods
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
      await confirm(joinTx);
    }

    // End game
    const updatedEndTime = new anchor.BN(Math.floor(Date.now() / 1000) - 3600);
    const updatedStartTime = new anchor.BN(updatedEndTime.toNumber() - 7200);

    const updateTx = await program.methods
      .updateGame(
        'Test Game',
        entryFee,
        null,
        updatedStartTime,
        updatedEndTime,
        null,
        null,
        null
      )
      .accounts({
        admin: provider.wallet.publicKey,
        game: gamePda,
        vault: vaultPda,
        tokenMint: NATIVE_MINT,
        vaultTokenAccount: null,
        adminTokenAccount: null,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    await confirm(updateTx);

    // Calculate prize
    const vaultBalance = await provider.connection.getBalance(vaultPda);

    const distributablePot = vaultBalance - rentExemption;
    const treasuryFee = Math.floor(distributablePot * 0.06);
    const commissionAmount = Math.floor(distributablePot * (commission / 100));
    const expectedPrizePool = distributablePot - treasuryFee - commissionAmount;
    const prizePerWinner = Math.floor(expectedPrizePool / maxWinners);

    // Test claiming for first two players (winners)
    for (let i = 0; i < maxWinners; i++) {
      const player = players[i];
      const playerPda = playerPdas[i];

      const initialVaultBalance = await provider.connection.getBalance(
        vaultPda
      );

      const claimTx = await program.methods
        .claim(new anchor.BN(prizePerWinner))
        .accounts({
          player: player.publicKey,
          game: gamePda,
          playerAccount: playerPda,
          vault: vaultPda,
          vaultTokenAccount: null,
          playerTokenAccount: null,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([player])
        .rpc();

      const finalVaultBalance = await provider.connection.getBalance(vaultPda);
      const vaultBalanceChange = initialVaultBalance - finalVaultBalance;

      expect(vaultBalanceChange).to.equal(prizePerWinner);
      console.log(`Player ${i + 1} claim test passed`);
    }

    console.log('SOL claim test passed');
  } catch (error) {
    console.error('SOL claim test failed:', error);
    throw error;
  }

  // Test 3: Successful SPL token claim
  console.log('\nTesting successful SPL token claim...');
  try {
    const gameCode = 'TOKEN' + Math.floor(Math.random() * 1000000);

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

    const now = Math.floor(Date.now() / 1000);
    const startTime = new anchor.BN(now);
    const endTime = new anchor.BN(now + 3600);
    const entryFee = new anchor.BN(1_000_000); // 1 token
    const donationAmount = new anchor.BN(10_000_000); // 10 tokens
    const commission = 5;
    const maxWinners = 5;
    const answerHash = Array(32).fill(1);

    // Create mint and accounts
    console.log('Creating mint...');
    const mint = await createMint(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      provider.wallet.publicKey,
      provider.wallet.publicKey,
      9
    );

    // Create admin token account and mint initial tokens
    const adminTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      mint,
      provider.wallet.publicKey
    );

    // Mint initial tokens to admin (exactly donationAmount)
    await mintTo(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      mint,
      adminTokenAccount.address,
      provider.wallet.publicKey,
      donationAmount.toNumber()
    );
    console.log('Minted initial tokens to admin');

    // Create vault token account
    const vaultTokenAccount = await anchor.utils.token.associatedAddress({
      mint: mint,
      owner: vaultPda,
    });

    // Initialize game with donation
    await program.methods
      .initGame(
        'Test Game',
        gameCode,
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
        tokenMint: mint,
        vault: vaultPda,
        vaultTokenAccount: vaultTokenAccount,
        adminTokenAccount: adminTokenAccount.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Setup multiple players and join game
    const numPlayers = 3;
    const players = Array(numPlayers)
      .fill(0)
      .map(() => Keypair.generate());
    const playerTokenAccounts = [];
    const playerPdas = [];

    for (const player of players) {
      // Fund player with SOL
      await provider.connection.requestAirdrop(
        player.publicKey,
        LAMPORTS_PER_SOL
      );

      // Create player token account
      const playerTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        (provider.wallet as anchor.Wallet).payer,
        mint,
        player.publicKey
      );
      playerTokenAccounts.push(playerTokenAccount);

      // Mint entry fee tokens to player
      await mintTo(
        provider.connection,
        (provider.wallet as anchor.Wallet).payer,
        mint,
        playerTokenAccount.address,
        provider.wallet.publicKey,
        entryFee.toNumber()
      );

      // Calculate player PDA
      const [playerPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('player'),
          gamePda.toBuffer(),
          player.publicKey.toBuffer(),
        ],
        program.programId
      );
      playerPdas.push(playerPda);

      // Join game
      await program.methods
        .joinGame()
        .accounts({
          player: player.publicKey,
          game: gamePda,
          playerAccount: playerPda,
          vault: vaultPda,
          vaultTokenAccount: vaultTokenAccount,
          playerTokenAccount: playerTokenAccount.address,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([player])
        .rpc();
    }

    // End game
    const updatedEndTime = new anchor.BN(Math.floor(Date.now() / 1000) - 3600);
    const updatedStartTime = new anchor.BN(updatedEndTime.toNumber() - 7200);

    await program.methods
      .updateGame(
        'Test Game',
        entryFee,
        null,
        updatedStartTime,
        updatedEndTime,
        null,
        null,
        null
      )
      .accounts({
        admin: provider.wallet.publicKey,
        game: gamePda,
        vault: vaultPda,
        tokenMint: mint,
        vaultTokenAccount: vaultTokenAccount,
        adminTokenAccount: adminTokenAccount.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Calculate actual prize amount (now includes multiple entry fees)
    const totalPot =
      donationAmount.toNumber() + entryFee.toNumber() * numPlayers;
    const treasuryFee = Math.floor(totalPot * 0.06);
    const commissionAmount = Math.floor(totalPot * (commission / 100));
    const prizePool = totalPot - treasuryFee - commissionAmount;
    const prizePerWinner = Math.floor(prizePool / maxWinners);

    // Test claiming for each player
    for (let i = 0; i < numPlayers; i++) {
      const player = players[i];
      const playerTokenAccount = playerTokenAccounts[i];
      const playerPda = playerPdas[i];

      // Get initial balances
      const vaultBalanceBefore = (
        await getAccount(provider.connection, vaultTokenAccount)
      ).amount;
      const playerBalanceBefore = (
        await getAccount(provider.connection, playerTokenAccount.address)
      ).amount;

      // Claim prize
      await program.methods
        .claim(new anchor.BN(prizePerWinner))
        .accounts({
          player: player.publicKey,
          game: gamePda,
          playerAccount: playerPda,
          vault: vaultPda,
          vaultTokenAccount: vaultTokenAccount,
          playerTokenAccount: playerTokenAccount.address,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([player])
        .rpc();

      // Verify balances
      const vaultBalanceAfter = (
        await getAccount(provider.connection, vaultTokenAccount)
      ).amount;
      const playerBalanceAfter = (
        await getAccount(provider.connection, playerTokenAccount.address)
      ).amount;

      const vaultChange =
        Number(vaultBalanceBefore) - Number(vaultBalanceAfter);
      const playerChange =
        Number(playerBalanceAfter) - Number(playerBalanceBefore);

      expect(vaultChange).to.equal(prizePerWinner);
      expect(playerChange).to.equal(prizePerWinner);

      console.log(`Player ${i + 1} claim test passed`);
    }

    console.log('SPL token claim test passed');
  } catch (error) {
    console.error('SPL token claim test failed:', error);
    if (error.logs) {
      console.error('Error logs:', error.logs);
    }
    throw error;
  }

  console.log('\nAll claim tests completed successfully');
}
