import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { TwizzinBe2 } from '../target/types/twizzin_be_2';
import { expect } from 'chai';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';

export async function startGame(
  program: Program<TwizzinBe2>,
  provider: anchor.AnchorProvider,
  confirm: (signature: string) => Promise<string>
) {
  console.log('Starting game start tests');

  // Helper function for error checking
  const expectError = (error: any, errorTypes: string[]) => {
    const errorString = error.toString();
    const hasExpectedError = errorTypes.some((type) =>
      errorString.includes(type)
    );
    expect(
      hasExpectedError,
      `Expected one of [${errorTypes}] but got: ${errorString}`
    ).to.be.true;
  };

  // First create a game that we can use for testing
  const gameCode = 'START1';
  const now = Math.floor(Date.now() / 1000);

  // Create game PDA
  const [gamePda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('game'),
      provider.wallet.publicKey.toBuffer(),
      Buffer.from(gameCode),
    ],
    program.programId
  );

  // Create vault PDA
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('vault'),
      provider.wallet.publicKey.toBuffer(),
      Buffer.from(gameCode),
    ],
    program.programId
  );

  // Initialize a game first
  await program.methods
    .initGame(
      'Test Start Game',
      gameCode,
      new anchor.BN(0.1 * LAMPORTS_PER_SOL),
      5,
      new anchor.BN(now + 3600),
      new anchor.BN(now + 7200),
      5,
      Array(32).fill(1),
      new anchor.BN(0),
      false, // allAreWinners
      false // evenSplit
    )
    .accounts({
      admin: provider.wallet.publicKey,
      game: gamePda,
      tokenMint: NATIVE_MINT,
      vault: vaultPda,
      adminTokenAccount: null,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  // Test 1: Start game with wrong admin
  console.log('Testing start game with wrong admin...');
  try {
    const wrongAdmin = anchor.web3.Keypair.generate();
    await program.methods
      .startGame()
      .accounts({
        admin: wrongAdmin.publicKey,
        game: gamePda,
      })
      .signers([wrongAdmin])
      .rpc();
    throw new Error('Should have failed with invalid authority');
  } catch (error) {
    expectError(error, ['InvalidAuthority']);
  }

  // Test 2: Successful game start
  console.log('Testing successful game start...');
  try {
    const tx = await program.methods
      .startGame()
      .accounts({
        admin: provider.wallet.publicKey,
        game: gamePda,
      })
      .rpc();

    await confirm(tx);

    // Verify game state
    const gameState = await program.account.game.fetch(gamePda);
    const currentTime = Math.floor(Date.now() / 1000);

    // The start time should be close to current time
    // Allow for a small difference due to processing time
    const timeDiff = Math.abs(gameState.startTime.toNumber() - currentTime);
    expect(timeDiff).to.be.lessThan(5); // Allow 5 seconds difference

    console.log('Game start test passed');
  } catch (error) {
    console.error('Game start failed:', error);
    throw error;
  }

  console.log('All game start tests completed successfully');
}
