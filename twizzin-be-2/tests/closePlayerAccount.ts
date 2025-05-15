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
    playerPDAs: PublicKey[],
    isNative: boolean,
    vaultTokenAccount?: PublicKey | null
  ) {
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

    const [winnersPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('winners'), gamePda.toBuffer()],
      program.programId
    );

    await program.methods
      .declareWinners(winnerPubkeys)
      .accounts({
        admin: provider.wallet.publicKey,
        game: gamePda,
        vault: vaultPda,
        vaultTokenAccount: isNative ? null : vaultTokenAccount,
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
  }

  const uniqueId = Math.floor(Math.random() * 100);
  const gameCode = `CLOSE${uniqueId}`;
  const now = Math.floor(Date.now() / 1000); // Seconds, like submitAnswers
  const startTime = new anchor.BN((now - 120) * 1000); // 2 minutes ago
  const endTime = new anchor.BN((now + 3600) * 1000); // 1 hour from now

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

  await program.methods
    .initGame(
      'Test Game',
      gameCode,
      new anchor.BN(0.1 * LAMPORTS_PER_SOL),
      500,
      startTime,
      endTime,
      1,
      Array(32).fill(1),
      new anchor.BN(1 * LAMPORTS_PER_SOL),
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

  const player = Keypair.generate();
  const airdropTx = await provider.connection.requestAirdrop(
    player.publicKey,
    2 * LAMPORTS_PER_SOL
  );
  await confirm(airdropTx);

  const [playerPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('player'), gamePda.toBuffer(), player.publicKey.toBuffer()],
    program.programId
  );

  const winningPlayer = Keypair.generate();
  const winnerAirdropTx = await provider.connection.requestAirdrop(
    winningPlayer.publicKey,
    2 * LAMPORTS_PER_SOL
  );
  await confirm(winnerAirdropTx);

  const [winnerPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('player'),
      gamePda.toBuffer(),
      winningPlayer.publicKey.toBuffer(),
    ],
    program.programId
  );

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

  // Submit answers with past time
  console.log('\nSubmitting answers...');
  await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1s like submitAnswers
  const submitNow = Math.floor(Date.now() / 1000);
  const clientFinishTime = new anchor.BN((submitNow - 30) * 1000); // 30 seconds ago

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
      game: gamePda,
      playerAccount: playerPda,
      systemProgram: SystemProgram.programId,
    })
    .signers([player])
    .rpc();

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
      player: winningPlayer.publicKey,
      game: gamePda,
      playerAccount: winnerPda,
      systemProgram: SystemProgram.programId,
    })
    .signers([winningPlayer])
    .rpc();

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

  try {
    await program.account.playerAccount.fetch(playerPda);
    assert.fail('Player account should be closed');
  } catch (error) {
    console.log('Expected error occurred (account closed):', error.message);
    expect(error.message).to.include('Account does not exist');
  }

  console.log('\nTest 4: Winner Account Before Claiming');
  console.log('Declaring winners...');

  const [winnersPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('winners'), gamePda.toBuffer()],
    program.programId
  );

  await executeDeclareWinners(
    gameCode,
    [winningPlayer.publicKey],
    [winnerPda],
    true
  );

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
