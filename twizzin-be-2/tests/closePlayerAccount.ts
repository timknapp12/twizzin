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
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

export async function closePlayerAccount(
  program: Program<TwizzinBe2>,
  provider: anchor.AnchorProvider,
  confirm: (signature: string) => Promise<string>
) {
  console.log('Starting close player account tests');

  async function executeDeclareWinners(
    gameCode: string,
    winnerPubkeys: PublicKey[],
    playerPDAs: PublicKey[]
  ) {
    const [gamePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('game'),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from(gameCode),
      ],
      program.programId
    );

    const [winnersPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('winners'), gamePda.toBuffer()],
      program.programId
    );

    await program.methods
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
          isWritable: true,
          isSigner: false,
        }))
      )
      .rpc();
  }

  // Setup game
  const uniqueId = Math.floor(Math.random() * 100);
  const gameCode = `CLOSE${uniqueId}`;
  const now = Math.floor(Date.now() / 1000);

  // Find PDAs
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

  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    program.programId
  );

  // Initialize game
  await program.methods
    .initGame(
      'Test Game',
      gameCode,
      new anchor.BN(0.1 * LAMPORTS_PER_SOL),
      500, // 5% commission
      new anchor.BN(now),
      new anchor.BN(now + 3600),
      1, // maxWinners
      Array(32).fill(1), // answerHash
      new anchor.BN(1 * LAMPORTS_PER_SOL), // donationAmount
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

  // Create and fund regular player
  const player = Keypair.generate();
  const airdropTx = await provider.connection.requestAirdrop(
    player.publicKey,
    2 * LAMPORTS_PER_SOL
  );
  await confirm(airdropTx);

  // Create first player PDA
  const [playerPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('player'), gamePda.toBuffer(), player.publicKey.toBuffer()],
    program.programId
  );

  // Create and fund winning player
  const winningPlayer = Keypair.generate();
  const winnerAirdropTx = await provider.connection.requestAirdrop(
    winningPlayer.publicKey,
    2 * LAMPORTS_PER_SOL
  );
  await confirm(winnerAirdropTx);

  // Create winning player PDA
  const [winnerPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('player'),
      gamePda.toBuffer(),
      winningPlayer.publicKey.toBuffer(),
    ],
    program.programId
  );

  // First player joins game
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

  // Winner joins game
  await program.methods
    .joinGame()
    .accounts({
      player: winningPlayer.publicKey,
      game: gamePda,
      playerAccount: winnerPda,
      vault: vaultPda,
      vaultTokenAccount: null,
      playerTokenAccount: null,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([winningPlayer])
    .rpc();

  // Test 1: Try to close account before game ends
  console.log('\nTest 1: Closure before game ends');
  try {
    await program.methods
      .closePlayerAccount()
      .accounts({
        player: player.publicKey,
        game: gamePda,
        winners: null,
        playerAccount: playerPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([player])
      .rpc();
    assert.fail('Should have failed to close account before game ends');
  } catch (error) {
    console.log('Expected error occurred:', error.message);
    expect(error.message).to.include('GameNotEnded');
  }

  // Submit answers
  console.log('\nSubmitting answers...');
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
      new anchor.BN(now + 100)
    )
    .accounts({
      player: player.publicKey,
      game: gamePda,
      playerAccount: playerPda,
      systemProgram: SystemProgram.programId,
    })
    .signers([player])
    .rpc();

  // Submit winning answers
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
      new anchor.BN(now + 50)
    )
    .accounts({
      player: winningPlayer.publicKey,
      game: gamePda,
      playerAccount: winnerPda,
      systemProgram: SystemProgram.programId,
    })
    .signers([winningPlayer])
    .rpc();

  // Create config if it doesn't exist
  console.log('\nEnsuring config exists...');
  try {
    await program.methods
      .initConfig(provider.wallet.publicKey, provider.wallet.publicKey, 1000)
      .accounts({
        admin: provider.wallet.publicKey,
        config: configPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log('Config initialized');
  } catch (error) {
    console.log('Config might already exist:', error.message);
  }

  // End game
  console.log('\nEnding game...');
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

  // Test 2: Try to close with wrong signer
  console.log('\nTest 2: Closure with wrong signer');
  const wrongPlayer = Keypair.generate();
  try {
    await program.methods
      .closePlayerAccount()
      .accounts({
        player: player.publicKey,
        game: gamePda,
        winners: null,
        playerAccount: playerPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([wrongPlayer])
      .rpc();
    assert.fail('Should have failed to close account with wrong signer');
  } catch (error) {
    console.log('Expected error occurred:', error.message);
    expect(error.message).to.include('unknown signer');
  }

  // Test 3: Successful closure of non-winner account
  console.log('\nTest 3: Successful closure');
  await program.methods
    .closePlayerAccount()
    .accounts({
      player: player.publicKey,
      game: gamePda,
      winners: null,
      playerAccount: playerPda,
      systemProgram: SystemProgram.programId,
    })
    .signers([player])
    .rpc();

  // Verify account is closed
  try {
    await program.account.playerAccount.fetch(playerPda);
    assert.fail('Player account should be closed');
  } catch (error) {
    console.log('Expected error occurred (account closed):', error.message);
    expect(error.message).to.include('Account does not exist');
  }

  // Test 4: Winner Account Before Claiming
  console.log('Test 4: Winner Account Before Claiming');

  console.log('Declaring winners...');

  // Define winnersPda before using it
  const [winnersPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('winners'), gamePda.toBuffer()],
    program.programId
  );

  // Declare winners
  await executeDeclareWinners(gameCode, [winningPlayer.publicKey], [winnerPda]);

  // Try to close winner account before claiming
  console.log('Attempting to close winner account before claiming...');
  try {
    await program.methods
      .closePlayerAccount()
      .accounts({
        player: winningPlayer.publicKey,
        game: gamePda,
        winners: winnersPda,
        playerAccount: winnerPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([winningPlayer])
      .rpc();
    assert.fail('Should have failed to close winner account before claiming');
  } catch (error) {
    console.log('Expected error occurred:', error.message);
    expect(error.message).to.include('CannotCloseWinnerAccount');
  }

  // Test 5: Double Closure Prevention
  console.log('\nTest 5: Double Closure Prevention');
  try {
    await program.methods
      .closePlayerAccount()
      .accounts({
        player: player.publicKey,
        game: gamePda,
        winners: null,
        playerAccount: playerPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([player])
      .rpc();
    assert.fail('Should have failed to close already closed account');
  } catch (error) {
    console.log('Expected error occurred:', error.message);
    expect(error.message).to.satisfy(
      (msg: string) =>
        msg.includes('Account does not exist') ||
        msg.includes('AccountNotInitialized')
    );
  }

  console.log('All close player account tests completed successfully');
}
