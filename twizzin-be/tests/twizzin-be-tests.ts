import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { TwizzinBe } from '../target/types/twizzin_be';
import { expect, assert } from 'chai';
import { BN } from '@coral-xyz/anchor';
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Keypair,
} from '@solana/web3.js';

describe('twizzin-be', () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const program = anchor.workspace.TwizzinBe as Program<TwizzinBe>;

  const gameCode = 'TEST12';
  let gameAccount: PublicKey;
  let vaultAccount: PublicKey;

  // New function for airdropping SOL
  const airdropSol = async (
    publicKey: PublicKey,
    amount: number = 1
  ): Promise<void> => {
    const signature = await provider.connection.requestAirdrop(
      publicKey,
      amount * LAMPORTS_PER_SOL
    );
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature,
      ...latestBlockhash,
    });
    console.log(`Airdropped ${amount} SOL to ${publicKey.toBase58()}`);
  };

  // New function to confirm transactions
  const confirm = async (signature: string): Promise<string> => {
    const block = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature,
      ...block,
    });
    return signature;
  };

  // Before running tests, airdrop SOL to necessary accounts
  before(async () => {
    // Airdrop to the payer account
    await airdropSol(provider.wallet.publicKey, 10);
  });

  it('Initializes a game', async () => {
    console.log('Starting game initialization test');
    const gameName = 'Test Game';
    const entryFee = new BN(LAMPORTS_PER_SOL / 100); // 0.01 SOL
    const commission = 5; // 5%
    const startTime = new BN(Date.now());
    const endTime = startTime.add(new BN(1800000)); // 30 minutes after start
    const maxWinners = 3;
    const answers = [
      { displayOrder: 0, answer: 'A', salt: 'salt0' },
      { displayOrder: 1, answer: 'B', salt: 'salt1' },
      { displayOrder: 2, answer: 'C', salt: 'salt2' },
      { displayOrder: 3, answer: 'D', salt: 'salt3' },
    ];

    [gameAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('game'),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from(gameCode),
      ],
      program.programId
    );

    [vaultAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from(gameCode),
      ],
      program.programId
    );

    console.log('Sending initGame transaction');
    const tx = await program.methods
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
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    await confirm(tx);

    console.log('Game initialized, fetching game state');
    const gameState = await program.account.game.fetch(gameAccount);
    // console.log('Initial game state:', JSON.stringify(gameState, null, 2));

    expect(gameState.name).to.equal(gameName);
    expect(gameState.entryFee.eq(entryFee)).to.be.true;
    expect(gameState.commission).to.equal(commission);
    expect(gameState.gameCode).to.equal(gameCode);
    expect(gameState.startTime.eq(startTime)).to.be.true;
    expect(gameState.endTime.eq(endTime)).to.be.true;
    expect(gameState.answers.length).to.equal(answers.length);
    console.log('Game initialization test completed successfully');
  });

  it('Updates a game with partial parameters', async () => {
    console.log('Starting game update test');

    const newGameName = 'Updated Test Game';
    const newAnswers = [
      { displayOrder: 0, answer: 'D', salt: 'salt0' },
      { displayOrder: 1, answer: 'C', salt: 'salt1' },
      { displayOrder: 2, answer: 'B', salt: 'salt2' },
      { displayOrder: 3, answer: 'A', salt: 'salt3' },
      { displayOrder: 4, answer: 'A', salt: 'salt4' },
    ];

    console.log('Sending updateGame transaction');
    const tx = await program.methods
      .updateGame(
        newGameName,
        null, // entryFee
        null, // commission
        null, // startTime
        null, // endTime
        null, // maxWinners
        newAnswers
      )
      .accounts({
        admin: provider.wallet.publicKey,
        game: gameAccount,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    await confirm(tx);

    console.log('Game updated, fetching updated game state');
    const updatedGameState = await program.account.game.fetch(gameAccount);

    expect(updatedGameState.name).to.equal(newGameName);
    expect(updatedGameState.answers.length).to.equal(newAnswers.length);

    // Check that other fields remain unchanged
    expect(updatedGameState.entryFee.eq(new BN(LAMPORTS_PER_SOL / 100))).to.be
      .true;
    expect(updatedGameState.commission).to.equal(5);

    console.log('Game update test completed successfully');
  });

  it('Adds a player to the game', async () => {
    console.log('Starting add player test');
    const playerKeypair = Keypair.generate();

    // Airdrop SOL to the player before adding them to the game
    await airdropSol(playerKeypair.publicKey, 2);

    console.log(
      `Player balance after airdrop: ${
        (await provider.connection.getBalance(playerKeypair.publicKey)) /
        LAMPORTS_PER_SOL
      } SOL`
    );

    console.log('Sending addPlayer transaction');
    const tx = await program.methods
      .addPlayer(gameCode)
      .accounts({
        player: playerKeypair.publicKey,
        game: gameAccount,
        vault: vaultAccount,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([playerKeypair])
      .rpc();

    await confirm(tx);

    console.log('Player added, fetching updated game state');
    const gameState = await program.account.game.fetch(gameAccount);

    expect(gameState.players.length).to.equal(1);
    expect(gameState.players[0].player.equals(playerKeypair.publicKey)).to.be
      .true;
    console.log('Add player test completed successfully');
  });

  it("Updates a player's guesses", async () => {
    console.log('Starting update player test');
    const playerKeypair = Keypair.generate();

    // Airdrop SOL to the player before adding them to the game
    await airdropSol(playerKeypair.publicKey, 2);

    // Add player to the game
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

    // Fetch and log the game state after adding the player
    let gameState = await program.account.game.fetch(gameAccount);
    // console.log(
    //   'Game state after adding player:',
    //   JSON.stringify(gameState, null, 2)
    // );

    const guesses = [
      { displayOrder: 0, answer: 'D', salt: 'salt0' },
      { displayOrder: 1, answer: 'C', salt: 'salt1' },
      { displayOrder: 2, answer: 'B', salt: 'salt2' },
      { displayOrder: 3, answer: 'A', salt: 'salt3' },
      { displayOrder: 4, answer: 'A', salt: 'salt4' },
    ];
    const endTime = new BN(Date.now());

    console.log('Sending updatePlayer transaction');
    const tx = await program.methods
      .updatePlayer(guesses, endTime)
      .accounts({
        player: playerKeypair.publicKey,
        game: gameAccount,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([playerKeypair])
      .rpc();

    await confirm(tx);

    console.log('Player updated, fetching updated game state');
    gameState = await program.account.game.fetch(gameAccount);
    // console.log('Updated game state:', JSON.stringify(gameState, null, 2));

    const updatedPlayer = gameState.players.find((p) =>
      p.player.equals(playerKeypair.publicKey)
    );
    // console.log('Updated player:', JSON.stringify(updatedPlayer, null, 2));

    expect(updatedPlayer).to.not.be.undefined;
    expect(updatedPlayer!.numCorrect).to.equal(5); // All guesses are correct
    expect(updatedPlayer!.playerEndTime.eq(endTime)).to.be.true;

    console.log('Update player test completed');
  });

  it('Adds three players with different correct answer counts', async () => {
    console.log('Starting test for multiple players with different scores');

    const players = [
      { keypair: Keypair.generate(), correctAnswers: 2 },
      { keypair: Keypair.generate(), correctAnswers: 3 },
      { keypair: Keypair.generate(), correctAnswers: 4 },
    ];

    for (const player of players) {
      // Airdrop SOL to each player
      await airdropSol(player.keypair.publicKey, 2);

      await program.methods
        .addPlayer(gameCode)
        .accounts({
          player: player.keypair.publicKey,
          game: gameAccount,
          vault: vaultAccount,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([player.keypair])
        .rpc();
    }

    // Fetch the game's end time
    const gameState = await program.account.game.fetch(gameAccount);
    const gameEndTime = gameState.endTime;

    // Update players with different guesses and timestamps
    const baseTimestamp = new BN(Date.now());
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const guesses = [
        { displayOrder: 0, answer: 'D', salt: 'salt0' },
        { displayOrder: 1, answer: 'C', salt: 'salt1' },
        { displayOrder: 2, answer: 'B', salt: 'salt2' },
        { displayOrder: 3, answer: 'A', salt: 'salt3' },
        { displayOrder: 4, answer: 'A', salt: 'salt4' },
      ];

      // Modify guesses to match the desired number of correct answers
      guesses.forEach((guess, index) => {
        if (index >= player.correctAnswers) {
          guess.answer = 'X'; // Incorrect answer
        }
      });

      // Add 15-60 seconds to the base timestamp for each player
      const endTime = baseTimestamp.add(new BN((i + 1) * 15000));

      await program.methods
        .updatePlayer(guesses, endTime)
        .accounts({
          player: player.keypair.publicKey,
          game: gameAccount,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([player.keypair])
        .rpc();
    }

    // Verify player scores
    const updatedGameState = await program.account.game.fetch(gameAccount);

    for (const player of players) {
      const updatedPlayer = updatedGameState.players.find((p) =>
        p.player.equals(player.keypair.publicKey)
      );
      expect(updatedPlayer).to.not.be.undefined;
      expect(updatedPlayer!.numCorrect).to.equal(player.correctAnswers);
      console.log(
        `Player ${player.keypair.publicKey.toBase58()} has ${
          updatedPlayer!.numCorrect
        } correct answers`
      );
    }

    console.log('Game state players:');
    console.log(
      JSON.stringify(
        updatedGameState.players.map((p) => ({
          player: p.player.toBase58(),
          numCorrect: p.numCorrect,
          playerEndTime: p.playerEndTime.toString(),
        })),
        null,
        2
      )
    );

    console.log(
      'Multiple players with different scores test completed successfully'
    );
  });

  it('Fails to update player when game has not started', async () => {
    console.log(
      'Starting test for update_player failure when game not started'
    );

    // Create a new game with a future start time
    const futureStartTime = new BN(Date.now() + 3600000); // 1 hour in the future
    const futureEndTime = new BN(futureStartTime.toNumber() + 1800000); // 30 minutes after start

    const [newGameAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('game'),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from('FUTURE'),
      ],
      program.programId
    );

    const [newVaultAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from('FUTURE'),
      ],
      program.programId
    );

    await program.methods
      .initGame(
        'Future Game',
        new BN(LAMPORTS_PER_SOL / 100),
        5,
        'FUTURE',
        futureStartTime,
        futureEndTime,
        3,
        [{ displayOrder: 0, answer: 'A', salt: 'salt0' }]
      )
      .accounts({
        admin: provider.wallet.publicKey,
        game: newGameAccount,
        vault: newVaultAccount,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    // Add a player to the game
    const playerKeypair = Keypair.generate();
    await airdropSol(playerKeypair.publicKey, 2);
    await program.methods
      .addPlayer('FUTURE')
      .accounts({
        player: playerKeypair.publicKey,
        game: newGameAccount,
        vault: newVaultAccount,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([playerKeypair])
      .rpc();

    // Try to update player before game starts
    const guesses = [{ displayOrder: 0, answer: 'A', salt: 'salt0' }];
    const endTime = new BN(Date.now());

    try {
      await program.methods
        .updatePlayer(guesses, endTime)
        .accounts({
          player: playerKeypair.publicKey,
          game: newGameAccount,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([playerKeypair])
        .rpc();

      // If we reach here, the test should fail
      assert.fail('Expected an error, but none was thrown');
    } catch (error) {
      console.log('Error caught:', error);
      // Check if the error is the one we expect
      assert.include(
        error.message,
        'GameNotStarted',
        'Expected GameNotStarted error'
      );
    }

    console.log(
      'Test for update_player failure when game not started completed successfully'
    );
  });

  it('Fails to update player when game expires or player end time is invalid', async () => {
    console.log('Starting test for update_player failure scenarios');

    // Adjust these timestamps
    const startTime = new BN(Date.now());
    const endTime = new BN(startTime.toNumber() + 10000); // 10 seconds after start

    const [newGameAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('game'),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from('EXPIRED'),
      ],
      program.programId
    );

    const [newVaultAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from('EXPIRED'),
      ],
      program.programId
    );

    await program.methods
      .initGame(
        'Expiring Game',
        new BN(LAMPORTS_PER_SOL / 100),
        5,
        'EXPIRED',
        startTime,
        endTime,
        3,
        [{ displayOrder: 0, answer: 'A', salt: 'salt0' }]
      )
      .accounts({
        admin: provider.wallet.publicKey,
        game: newGameAccount,
        vault: newVaultAccount,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    // Add a player to the game
    const playerKeypair = Keypair.generate();
    await airdropSol(playerKeypair.publicKey, 2);
    await program.methods
      .addPlayer('EXPIRED')
      .accounts({
        player: playerKeypair.publicKey,
        game: newGameAccount,
        vault: newVaultAccount,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([playerKeypair])
      .rpc();

    const guesses = [{ displayOrder: 0, answer: 'A', salt: 'salt0' }];

    // Add a small delay to ensure the game has started
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Scenario 1: Try to update with a valid timestamp (should succeed)
    const validPlayerEndTime = new BN(startTime.toNumber() + 5000); // 5 seconds after start
    await program.methods
      .updatePlayer(guesses, validPlayerEndTime)
      .accounts({
        player: playerKeypair.publicKey,
        game: newGameAccount,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([playerKeypair])
      .rpc();

    // Scenario 2: Wait for the game to expire, then try to update (should fail)
    await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait for game to expire

    try {
      await program.methods
        .updatePlayer(guesses, new BN(Date.now()))
        .accounts({
          player: playerKeypair.publicKey,
          game: newGameAccount,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([playerKeypair])
        .rpc();

      assert.fail('Expected an error for expired game, but none was thrown');
    } catch (error) {
      console.log('Error caught for expired game:', error);
      assert.include(error.message, 'GameEnded', 'Expected GameEnded error');
    }

    console.log(
      'Test for update_player failure scenarios completed successfully'
    );
  });
});
