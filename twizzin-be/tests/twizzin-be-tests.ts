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

let configPubkey: PublicKey;
let treasuryPubkey: PublicKey;

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

  it('Initializes the program config', async () => {
    console.log('Starting program config initialization test');

    const configKeypair = anchor.web3.Keypair.generate();
    configPubkey = configKeypair.publicKey;

    // Generate a new public key for the treasury
    const treasuryKeypair = anchor.web3.Keypair.generate();
    treasuryPubkey = treasuryKeypair.publicKey;

    console.log('Sending initConfig transaction');
    const tx = await program.methods
      .initConfig(treasuryPubkey)
      .accounts({
        admin: provider.wallet.publicKey,
        config: configPubkey,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([configKeypair])
      .rpc();

    await confirm(tx);

    console.log('Config initialized, fetching config state');
    const configState = await program.account.programConfig.fetch(configPubkey);

    expect(configState.treasuryPubkey.equals(treasuryPubkey)).to.be.true;
    console.log('Program config initialization test completed successfully');
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

  // it("Updates a player's guesses", async () => {
  //   console.log('Starting update player test');

  //   // Fetch the current on-chain time
  //   const slot = await provider.connection.getSlot();
  //   const timestamp = await provider.connection.getBlockTime(slot);
  //   if (!timestamp) throw new Error("Couldn't fetch on-chain time");

  //   const currentTime = new BN(timestamp * 1000); // Convert to milliseconds
  //   const startTime = currentTime.add(new BN(10000)); // Start 10 seconds from now
  //   const endTime = startTime.add(new BN(60000)); // End 1 minute after start

  //   console.log('Current on-chain time:', currentTime.toString());
  //   console.log('Game start time:', startTime.toString());
  //   console.log('Game end time:', endTime.toString());

  //   // Initialize the game with the new start and end times
  //   const gameCode = 'TEST' + Math.floor(Math.random() * 10000);
  //   const [gameAccount] = PublicKey.findProgramAddressSync(
  //     [
  //       Buffer.from('game'),
  //       provider.wallet.publicKey.toBuffer(),
  //       Buffer.from(gameCode),
  //     ],
  //     program.programId
  //   );

  //   const [vaultAccount] = PublicKey.findProgramAddressSync(
  //     [
  //       Buffer.from('vault'),
  //       provider.wallet.publicKey.toBuffer(),
  //       Buffer.from(gameCode),
  //     ],
  //     program.programId
  //   );

  //   await program.methods
  //     .initGame(
  //       'Test Game',
  //       new BN(LAMPORTS_PER_SOL / 100),
  //       5,
  //       gameCode,
  //       startTime,
  //       endTime,
  //       3,
  //       [
  //         { displayOrder: 0, answer: 'A', salt: 'salt0' },
  //         { displayOrder: 1, answer: 'B', salt: 'salt1' },
  //         { displayOrder: 2, answer: 'C', salt: 'salt2' },
  //       ]
  //     )
  //     .accounts({
  //       admin: provider.wallet.publicKey,
  //       game: gameAccount,
  //       vault: vaultAccount,
  //       config: configPubkey,
  //       systemProgram: SystemProgram.programId,
  //     } as any)
  //     .rpc();

  //   const playerKeypair = Keypair.generate();

  //   // Airdrop SOL to the player before adding them to the game
  //   await airdropSol(playerKeypair.publicKey, 2);

  //   // Add player to the game
  //   await program.methods
  //     .addPlayer(gameCode)
  //     .accounts({
  //       player: playerKeypair.publicKey,
  //       game: gameAccount,
  //       vault: vaultAccount,
  //       systemProgram: SystemProgram.programId,
  //     } as any)
  //     .signers([playerKeypair])
  //     .rpc();

  //   const guesses = [
  //     { displayOrder: 0, answer: 'A', salt: 'salt0' },
  //     { displayOrder: 1, answer: 'B', salt: 'salt1' },
  //     { displayOrder: 2, answer: 'C', salt: 'salt2' },
  //   ];

  //   // Wait for the game to start
  //   const timeToWait = startTime.sub(currentTime).toNumber() + 2000; // Add 2 seconds buffer
  //   console.log('Waiting for', timeToWait, 'ms');
  //   await new Promise((resolve) => setTimeout(resolve, timeToWait));

  //   // Fetch the current on-chain time again
  //   const newSlot = await provider.connection.getSlot();
  //   const newTimestamp = await provider.connection.getBlockTime(newSlot);
  //   if (!newTimestamp) throw new Error("Couldn't fetch on-chain time");

  //   const playerEndTime = new BN(newTimestamp * 1000);
  //   console.log('Player end time:', playerEndTime.toString());

  //   console.log('Sending updatePlayer transaction');
  //   const tx = await program.methods
  //     .updatePlayer(guesses, playerEndTime)
  //     .accounts({
  //       player: playerKeypair.publicKey,
  //       game: gameAccount,
  //       systemProgram: SystemProgram.programId,
  //     } as any)
  //     .signers([playerKeypair])
  //     .rpc();

  //   await confirm(tx);

  //   console.log('Player updated, fetching updated game state');
  //   const gameState = await program.account.game.fetch(gameAccount);

  //   const updatedPlayer = gameState.players.find((p) =>
  //     p.player.equals(playerKeypair.publicKey)
  //   );

  //   console.log('Updated player:', JSON.stringify(updatedPlayer, null, 2));

  //   expect(updatedPlayer).to.not.be.undefined;
  //   expect(updatedPlayer!.numCorrect).to.equal(3); // All guesses are correct
  //   expect(updatedPlayer!.playerEndTime.eq(playerEndTime)).to.be.true;

  //   console.log('Update player test completed');
  // });

  // it('Adds three players with different correct answer counts', async () => {
  //   console.log('Starting test for multiple players with different scores');

  //   // Fetch the current on-chain time
  //   const slot = await provider.connection.getSlot();
  //   const timestamp = await provider.connection.getBlockTime(slot);
  //   if (!timestamp) throw new Error("Couldn't fetch on-chain time");

  //   const currentTime = new BN(timestamp * 1000); // Convert to milliseconds
  //   const startTime = currentTime.add(new BN(10000)); // Start 10 seconds from now
  //   const endTime = startTime.add(new BN(60000)); // End 1 minute after start

  //   console.log('Current on-chain time:', currentTime.toString());
  //   console.log('Game start time:', startTime.toString());
  //   console.log('Game end time:', endTime.toString());

  //   // Initialize the game with the new start and end times
  //   const gameCode = 'TEST' + Math.floor(Math.random() * 10000);
  //   const [gameAccount] = PublicKey.findProgramAddressSync(
  //     [
  //       Buffer.from('game'),
  //       provider.wallet.publicKey.toBuffer(),
  //       Buffer.from(gameCode),
  //     ],
  //     program.programId
  //   );

  //   const [vaultAccount] = PublicKey.findProgramAddressSync(
  //     [
  //       Buffer.from('vault'),
  //       provider.wallet.publicKey.toBuffer(),
  //       Buffer.from(gameCode),
  //     ],
  //     program.programId
  //   );

  //   await program.methods
  //     .initGame(
  //       'Test Game',
  //       new BN(LAMPORTS_PER_SOL / 100),
  //       5,
  //       gameCode,
  //       startTime,
  //       endTime,
  //       3,
  //       [
  //         { displayOrder: 0, answer: 'D', salt: 'salt0' },
  //         { displayOrder: 1, answer: 'C', salt: 'salt1' },
  //         { displayOrder: 2, answer: 'B', salt: 'salt2' },
  //         { displayOrder: 3, answer: 'A', salt: 'salt3' },
  //         { displayOrder: 4, answer: 'A', salt: 'salt4' },
  //       ]
  //     )
  //     .accounts({
  //       admin: provider.wallet.publicKey,
  //       game: gameAccount,
  //       vault: vaultAccount,
  //       config: configPubkey,
  //       systemProgram: SystemProgram.programId,
  //     } as any)
  //     .rpc();

  //   const players = [
  //     { keypair: Keypair.generate(), correctAnswers: 2 },
  //     { keypair: Keypair.generate(), correctAnswers: 3 },
  //     { keypair: Keypair.generate(), correctAnswers: 4 },
  //   ];

  //   for (const player of players) {
  //     await airdropSol(player.keypair.publicKey, 2);

  //     await program.methods
  //       .addPlayer(gameCode)
  //       .accounts({
  //         player: player.keypair.publicKey,
  //         game: gameAccount,
  //         vault: vaultAccount,
  //         systemProgram: SystemProgram.programId,
  //       } as any)
  //       .signers([player.keypair])
  //       .rpc();
  //   }

  //   // Wait for the game to start
  //   const timeToWait = startTime.sub(currentTime).toNumber() + 2000; // Add 2 seconds buffer
  //   console.log('Waiting for', timeToWait, 'ms for the game to start');
  //   await new Promise((resolve) => setTimeout(resolve, timeToWait));

  //   // Update players with different guesses and timestamps
  //   for (let i = 0; i < players.length; i++) {
  //     const player = players[i];
  //     const guesses = [
  //       { displayOrder: 0, answer: 'D', salt: 'salt0' },
  //       { displayOrder: 1, answer: 'C', salt: 'salt1' },
  //       { displayOrder: 2, answer: 'B', salt: 'salt2' },
  //       { displayOrder: 3, answer: 'A', salt: 'salt3' },
  //       { displayOrder: 4, answer: 'A', salt: 'salt4' },
  //     ];

  //     // Modify guesses to match the desired number of correct answers
  //     guesses.forEach((guess, index) => {
  //       if (index >= player.correctAnswers) {
  //         guess.answer = 'X'; // Incorrect answer
  //       }
  //     });

  //     // Fetch the current on-chain time for each player's end time
  //     const playerSlot = await provider.connection.getSlot();
  //     const playerTimestamp = await provider.connection.getBlockTime(
  //       playerSlot
  //     );
  //     if (!playerTimestamp)
  //       throw new Error("Couldn't fetch on-chain time for player");

  //     const playerEndTime = new BN(playerTimestamp * 1000);
  //     console.log(`Player ${i + 1} end time:`, playerEndTime.toString());

  //     await program.methods
  //       .updatePlayer(guesses, playerEndTime)
  //       .accounts({
  //         player: player.keypair.publicKey,
  //         game: gameAccount,
  //         systemProgram: SystemProgram.programId,
  //       } as any)
  //       .signers([player.keypair])
  //       .rpc();
  //   }

  //   // Verify player scores
  //   const updatedGameState = await program.account.game.fetch(gameAccount);

  //   for (const player of players) {
  //     const updatedPlayer = updatedGameState.players.find((p) =>
  //       p.player.equals(player.keypair.publicKey)
  //     );
  //     expect(updatedPlayer).to.not.be.undefined;
  //     expect(updatedPlayer!.numCorrect).to.equal(player.correctAnswers);
  //     console.log(
  //       `Player ${player.keypair.publicKey.toBase58()} has ${
  //         updatedPlayer!.numCorrect
  //       } correct answers`
  //     );
  //   }

  //   console.log('Game state players:');
  //   console.log(
  //     JSON.stringify(
  //       updatedGameState.players.map((p) => ({
  //         player: p.player.toBase58(),
  //         numCorrect: p.numCorrect,
  //         playerEndTime: p.playerEndTime.toString(),
  //       })),
  //       null,
  //       2
  //     )
  //   );

  //   console.log(
  //     'Multiple players with different scores test completed successfully'
  //   );
  // });

  // it('Fails to update player when game has not started', async () => {
  //   console.log(
  //     'Starting test for update_player failure when game not started'
  //   );

  //   // Fetch the current on-chain time
  //   const slot = await provider.connection.getSlot();
  //   const timestamp = await provider.connection.getBlockTime(slot);
  //   if (!timestamp) throw new Error("Couldn't fetch on-chain time");

  //   const currentTime = new BN(timestamp * 1000); // Convert to milliseconds
  //   const futureStartTime = currentTime.add(new BN(60000)); // Start 1 minute from now
  //   const futureEndTime = futureStartTime.add(new BN(1800000)); // End 30 minutes after start

  //   console.log('Current on-chain time:', currentTime.toString());
  //   console.log('Future game start time:', futureStartTime.toString());
  //   console.log('Future game end time:', futureEndTime.toString());

  //   const gameCode = 'FUTURE' + Math.floor(Math.random() * 10000);
  //   const [newGameAccount] = PublicKey.findProgramAddressSync(
  //     [
  //       Buffer.from('game'),
  //       provider.wallet.publicKey.toBuffer(),
  //       Buffer.from(gameCode),
  //     ],
  //     program.programId
  //   );

  //   const [newVaultAccount] = PublicKey.findProgramAddressSync(
  //     [
  //       Buffer.from('vault'),
  //       provider.wallet.publicKey.toBuffer(),
  //       Buffer.from(gameCode),
  //     ],
  //     program.programId
  //   );

  //   await program.methods
  //     .initGame(
  //       'Future Game',
  //       new BN(LAMPORTS_PER_SOL / 100),
  //       5,
  //       gameCode,
  //       futureStartTime,
  //       futureEndTime,
  //       3,
  //       [{ displayOrder: 0, answer: 'A', salt: 'salt0' }]
  //     )
  //     .accounts({
  //       admin: provider.wallet.publicKey,
  //       game: newGameAccount,
  //       vault: newVaultAccount,
  //       config: configPubkey,
  //       systemProgram: SystemProgram.programId,
  //     } as any)
  //     .rpc();

  //   // Add a player to the game
  //   const playerKeypair = Keypair.generate();
  //   await airdropSol(playerKeypair.publicKey, 2);
  //   await program.methods
  //     .addPlayer(gameCode)
  //     .accounts({
  //       player: playerKeypair.publicKey,
  //       game: newGameAccount,
  //       vault: newVaultAccount,
  //       systemProgram: SystemProgram.programId,
  //     } as any)
  //     .signers([playerKeypair])
  //     .rpc();

  //   // Try to update player before game starts
  //   const guesses = [{ displayOrder: 0, answer: 'A', salt: 'salt0' }];

  //   // Fetch current on-chain time again for the update attempt
  //   const updateSlot = await provider.connection.getSlot();
  //   const updateTimestamp = await provider.connection.getBlockTime(updateSlot);
  //   if (!updateTimestamp)
  //     throw new Error("Couldn't fetch on-chain time for update");

  //   const updateTime = new BN(updateTimestamp * 1000);
  //   console.log('Update attempt time:', updateTime.toString());

  //   try {
  //     await program.methods
  //       .updatePlayer(guesses, updateTime)
  //       .accounts({
  //         player: playerKeypair.publicKey,
  //         game: newGameAccount,
  //         systemProgram: SystemProgram.programId,
  //       } as any)
  //       .signers([playerKeypair])
  //       .rpc();

  //     // If we reach here, the test should fail
  //     assert.fail('Expected an error, but none was thrown');
  //   } catch (error) {
  //     console.log('Error caught:', error);
  //     // Check if the error is the one we expect
  //     assert.include(
  //       error.message,
  //       'GameNotStarted',
  //       'Expected GameNotStarted error'
  //     );
  //   }

  //   console.log(
  //     'Test for update_player failure when game not started completed successfully'
  //   );
  // });

  // it('Fails to update player when game expires or player end time is invalid', async () => {
  //   console.log('Starting test for update_player failure scenarios');

  //   // Fetch the current on-chain time
  //   const slot = await provider.connection.getSlot();
  //   const timestamp = await provider.connection.getBlockTime(slot);
  //   if (!timestamp) throw new Error("Couldn't fetch on-chain time");

  //   const currentTime = new BN(timestamp * 1000); // Convert to milliseconds
  //   const startTime = currentTime.add(new BN(5000)); // Start 5 seconds from now
  //   const endTime = startTime.add(new BN(20000)); // End 20 seconds after start

  //   console.log('Current on-chain time:', currentTime.toString());
  //   console.log('Game start time:', startTime.toString());
  //   console.log('Game end time:', endTime.toString());

  //   const gameCode = 'EXPIRE' + Math.floor(Math.random() * 10000);
  //   const [newGameAccount] = PublicKey.findProgramAddressSync(
  //     [
  //       Buffer.from('game'),
  //       provider.wallet.publicKey.toBuffer(),
  //       Buffer.from(gameCode),
  //     ],
  //     program.programId
  //   );

  //   const [newVaultAccount] = PublicKey.findProgramAddressSync(
  //     [
  //       Buffer.from('vault'),
  //       provider.wallet.publicKey.toBuffer(),
  //       Buffer.from(gameCode),
  //     ],
  //     program.programId
  //   );

  //   await program.methods
  //     .initGame(
  //       'Expiring Game',
  //       new BN(LAMPORTS_PER_SOL / 100),
  //       5,
  //       gameCode,
  //       startTime,
  //       endTime,
  //       3,
  //       [{ displayOrder: 0, answer: 'A', salt: 'salt0' }]
  //     )
  //     .accounts({
  //       admin: provider.wallet.publicKey,
  //       game: newGameAccount,
  //       vault: newVaultAccount,
  //       config: configPubkey,
  //       systemProgram: SystemProgram.programId,
  //     } as any)
  //     .rpc();

  //   // Add a player to the game
  //   const playerKeypair = Keypair.generate();
  //   await airdropSol(playerKeypair.publicKey, 2);
  //   await program.methods
  //     .addPlayer(gameCode)
  //     .accounts({
  //       player: playerKeypair.publicKey,
  //       game: newGameAccount,
  //       vault: newVaultAccount,
  //       systemProgram: SystemProgram.programId,
  //     } as any)
  //     .signers([playerKeypair])
  //     .rpc();

  //   const guesses = [{ displayOrder: 0, answer: 'A', salt: 'salt0' }];

  //   // Wait for the game to start
  //   const timeToStart = startTime.sub(currentTime).toNumber();
  //   console.log(`Waiting ${timeToStart}ms for the game to start`);
  //   await new Promise((resolve) => setTimeout(resolve, timeToStart));

  //   // Scenario 1: Try to update with a valid timestamp (should succeed)
  //   const validUpdateSlot = await provider.connection.getSlot();
  //   const validUpdateTimestamp = await provider.connection.getBlockTime(
  //     validUpdateSlot
  //   );
  //   if (!validUpdateTimestamp)
  //     throw new Error("Couldn't fetch on-chain time for valid update");

  //   const validPlayerEndTime = new BN(validUpdateTimestamp * 1000);
  //   console.log('Valid update time:', validPlayerEndTime.toString());

  //   await program.methods
  //     .updatePlayer(guesses, validPlayerEndTime)
  //     .accounts({
  //       player: playerKeypair.publicKey,
  //       game: newGameAccount,
  //       systemProgram: SystemProgram.programId,
  //     } as any)
  //     .signers([playerKeypair])
  //     .rpc();

  //   console.log('Valid update succeeded');

  //   // Scenario 2: Wait for the game to expire, then try to update (should fail)
  //   const timeToExpire = endTime.sub(validPlayerEndTime).toNumber() + 2000; // Add 2 seconds buffer
  //   console.log(`Waiting ${timeToExpire}ms for the game to expire`);
  //   await new Promise((resolve) => setTimeout(resolve, timeToExpire));

  //   const expiredUpdateSlot = await provider.connection.getSlot();
  //   const expiredUpdateTimestamp = await provider.connection.getBlockTime(
  //     expiredUpdateSlot
  //   );
  //   if (!expiredUpdateTimestamp)
  //     throw new Error("Couldn't fetch on-chain time for expired update");

  //   const expiredPlayerEndTime = new BN(expiredUpdateTimestamp * 1000);
  //   console.log(
  //     'Expired update attempt time:',
  //     expiredPlayerEndTime.toString()
  //   );

  //   try {
  //     await program.methods
  //       .updatePlayer(guesses, expiredPlayerEndTime)
  //       .accounts({
  //         player: playerKeypair.publicKey,
  //         game: newGameAccount,
  //         systemProgram: SystemProgram.programId,
  //       } as any)
  //       .signers([playerKeypair])
  //       .rpc();

  //     assert.fail('Expected an error for expired game, but none was thrown');
  //   } catch (error) {
  //     console.log('Error caught for expired game:', error);
  //     assert.include(error.message, 'GameEnded', 'Expected GameEnded error');
  //   }

  //   console.log(
  //     'Test for update_player failure scenarios completed successfully'
  //   );
  // });

  it('Ends a game with multiple winners and verifies payouts', async () => {
    console.log('Starting end game test with multiple winners');

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
    const gameName = 'End Game Test';
    const entryFee = new BN(LAMPORTS_PER_SOL / 10); // 0.1 SOL
    const commission = 10; // 10%
    const gameCode = 'ENDTEST' + Math.floor(Math.random() * 10000);
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

      // Update player guesses
      const guesses = answers.map((answer, index) => ({
        displayOrder: index,
        answer: index < i ? answer.answer : 'X', // First i players get correct answers
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

      console.log(`Player ${i + 1} joined and updated guesses`);
    }

    // Wait for the game to end
    const timeToEnd = endTime.sub(new BN(Date.now())).toNumber() + 2000; // Add 2 seconds buffer
    console.log(`Waiting ${timeToEnd}ms for the game to end...`);
    await new Promise((resolve) => setTimeout(resolve, timeToEnd));

    console.log('Ending game with the following accounts:');
    console.log('Admin:', provider.wallet.publicKey.toBase58());
    console.log('Game:', gameAccount.toBase58());
    console.log('Vault:', vaultAccount.toBase58());
    console.log('Config:', configPubkey.toBase58());
    console.log('Treasury:', treasuryPubkey.toBase58());
    console.log('Players:');
    players.forEach((player, index) => {
      console.log(`  Player ${index + 1}:`, player.publicKey.toBase58());
    });

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

    // Calculate expected payouts
    const totalPool = entryFee.mul(new BN(players.length));
    const treasuryFee = totalPool.mul(new BN(1)).div(new BN(100)); // 1% treasury fee
    const adminCommission = totalPool.mul(new BN(commission)).div(new BN(100));
    const remainingPool = totalPool.sub(treasuryFee).sub(adminCommission);
    const actualWinners = 2; // Players 4 and 5
    const expectedWinnerPayout = remainingPool.div(new BN(actualWinners));

    console.log('Fund flow details:');
    console.log(`Total pool: ${totalPool.toString()}`);
    console.log(`Treasury fee: ${treasuryFee.toString()}`);
    console.log(`Admin commission: ${adminCommission.toString()}`);
    console.log(`Remaining pool: ${remainingPool.toString()}`);
    console.log(`Payout per winner: ${expectedWinnerPayout.toString()}`);

    // Estimate transaction fees
    const estimatedTxFee = 5000; // 0.000005 SOL per transaction, adjust if needed

    const balanceChanges = await Promise.all(
      players.map(async (player, index) => {
        const finalBalance = await provider.connection.getBalance(
          player.publicKey
        );
        return finalBalance - initialPlayerBalances[index];
      })
    );

    // Check player balances and payouts
    for (let i = 0; i < players.length; i++) {
      const finalBalance = await provider.connection.getBalance(
        players[i].publicKey
      );
      const balanceChange = finalBalance - initialPlayerBalances[i];

      console.log(`Player ${i + 1} details:`);
      console.log(`  Initial balance: ${initialPlayerBalances[i]}`);
      console.log(`  Final balance: ${finalBalance}`);
      console.log(`  Balance change: ${balanceChange}`);

      if (i >= players.length - actualWinners) {
        // Winners (Players 4 and 5)
        const expectedBalanceChange =
          expectedWinnerPayout.toNumber() -
          entryFee.toNumber() -
          estimatedTxFee;
        const percentageDifference =
          Math.abs(
            (balanceChange - expectedBalanceChange) / expectedBalanceChange
          ) * 100;
        console.log(`  Expected balance change: ${expectedBalanceChange}`);
        console.log(
          `  Percentage difference: ${percentageDifference.toFixed(4)}%`
        );
        expect(percentageDifference).to.be.lessThan(0.5); // Increased tolerance to 0.5%
      } else {
        // Non-winners
        const expectedBalanceChange = -entryFee.toNumber() - estimatedTxFee; // They should lose their entry fee plus transaction fees
        const percentageDifference =
          Math.abs(
            (balanceChange - expectedBalanceChange) / expectedBalanceChange
          ) * 100;
        console.log(`  Expected balance change: ${expectedBalanceChange}`);
        console.log(
          `  Percentage difference: ${percentageDifference.toFixed(4)}%`
        );
        expect(percentageDifference).to.be.lessThan(0.5); // Increased tolerance to 0.5%
      }
    }

    // Check admin balance change
    const finalAdminBalance = await provider.connection.getBalance(
      provider.wallet.publicKey
    );
    const adminBalanceChange = finalAdminBalance - initialAdminBalance;
    console.log('Admin balance details:');
    console.log(`  Initial balance: ${initialAdminBalance}`);
    console.log(`  Final balance: ${finalAdminBalance}`);
    console.log(`  Balance change: ${adminBalanceChange}`);
    console.log(`  Expected commission: ${adminCommission.toNumber()}`);

    // Calculate the extra balance change (likely from rent returns)
    const extraAdminBalance = adminBalanceChange - adminCommission.toNumber();
    const extraPercentage =
      (extraAdminBalance / adminCommission.toNumber()) * 100;

    console.log(`  Extra balance: ${extraAdminBalance}`);
    console.log(`  Extra percentage: ${extraPercentage.toFixed(4)}%`);

    // Check if the extra balance is within a reasonable range
    expect(extraPercentage).to.be.gte(0).and.lt(5); // Allow up to 5% extra for rent returns

    // Verify that the admin received at least the expected commission
    expect(adminBalanceChange).to.be.gte(adminCommission.toNumber());

    // Check treasury balance change
    const finalTreasuryBalance = await provider.connection.getBalance(
      treasuryPubkey
    );
    const treasuryBalanceChange = finalTreasuryBalance - initialTreasuryBalance;
    console.log('Treasury balance details:');
    console.log(`  Initial balance: ${initialTreasuryBalance}`);
    console.log(`  Final balance: ${finalTreasuryBalance}`);
    console.log(`  Balance change: ${treasuryBalanceChange}`);
    console.log(`  Expected fee: ${treasuryFee.toNumber()}`);

    const treasuryExtraBalance = treasuryBalanceChange - treasuryFee.toNumber();
    const treasuryExtraPercentage =
      (treasuryExtraBalance / treasuryFee.toNumber()) * 100;

    console.log(`  Extra balance: ${treasuryExtraBalance}`);
    console.log(`  Extra percentage: ${treasuryExtraPercentage.toFixed(4)}%`);

    // Check if the extra balance is within a reasonable range
    expect(treasuryExtraPercentage).to.be.gte(0).and.lt(5); // Allow up to 5% extra

    // Verify that the treasury received at least the expected fee
    expect(treasuryBalanceChange).to.be.gte(treasuryFee.toNumber());

    // Calculate the net change across all players
    const netPlayerChange = balanceChanges.reduce(
      (sum, change) => sum + change,
      0
    );

    // Calculate the total distribution
    const totalDistributed =
      netPlayerChange + adminBalanceChange + treasuryBalanceChange;

    console.log('Distribution details:');
    console.log(`  Net player change: ${netPlayerChange}`);
    console.log(`  Admin commission: ${adminBalanceChange}`);
    console.log(`  Treasury fee: ${treasuryBalanceChange}`);
    console.log(`  Total distributed: ${totalDistributed}`);
    console.log(`  Total fees collected: ${totalPool.toNumber()}`);

    // The total distributed should be close to zero (as it's a zero-sum game minus fees)
    const distributionDifference = Math.abs(totalDistributed);
    const distributionPercentageDifference =
      (distributionDifference / totalPool.toNumber()) * 100;

    console.log(`  Distribution difference: ${distributionDifference}`);
    console.log(
      `  Distribution percentage difference: ${distributionPercentageDifference.toFixed(
        4
      )}%`
    );

    // Allow for a small difference due to transaction fees
    expect(distributionPercentageDifference).to.be.lessThan(1); // 1% tolerance

    // Verify that the total distributed is close to zero
    expect(totalDistributed).to.be.closeTo(0, totalPool.toNumber() * 0.01); // 1% of total fees tolerance

    console.log('End game test with multiple winners completed successfully');
  });

  // it('Ends a game with all players performing poorly', async () => {
  //   console.log('Starting end game test with all players performing poorly');

  //   // Fetch the current on-chain time
  //   const slot = await provider.connection.getSlot();
  //   const timestamp = await provider.connection.getBlockTime(slot);
  //   if (!timestamp) throw new Error("Couldn't fetch on-chain time");

  //   const currentTime = new BN(timestamp * 1000); // Convert to milliseconds
  //   const startTime = currentTime.add(new BN(5000)); // Start 5 seconds from now
  //   const endTime = startTime.add(new BN(30000)); // End 30 seconds after start

  //   console.log('Current on-chain time:', currentTime.toString());
  //   console.log('Game start time:', startTime.toString());
  //   console.log('Game end time:', endTime.toString());

  //   const initialAdminBalance = await provider.connection.getBalance(
  //     provider.wallet.publicKey
  //   );
  //   const initialTreasuryBalance = await provider.connection.getBalance(
  //     treasuryPubkey
  //   );

  //   // Initialize a new game
  //   const gameCode = 'POORPERF' + Math.floor(Math.random() * 10000);
  //   const gameName = 'Poor Performance Game';
  //   const entryFee = new BN(LAMPORTS_PER_SOL / 10); // 0.1 SOL
  //   const commission = 10; // 10%
  //   const maxWinners = 3;
  //   const answers = [
  //     { displayOrder: 0, answer: 'A', salt: 'salt0' },
  //     { displayOrder: 1, answer: 'B', salt: 'salt1' },
  //     { displayOrder: 2, answer: 'C', salt: 'salt2' },
  //   ];

  //   const [gameAccount] = PublicKey.findProgramAddressSync(
  //     [
  //       Buffer.from('game'),
  //       provider.wallet.publicKey.toBuffer(),
  //       Buffer.from(gameCode),
  //     ],
  //     program.programId
  //   );

  //   const [vaultAccount] = PublicKey.findProgramAddressSync(
  //     [
  //       Buffer.from('vault'),
  //       provider.wallet.publicKey.toBuffer(),
  //       Buffer.from(gameCode),
  //     ],
  //     program.programId
  //   );

  //   await program.methods
  //     .initGame(
  //       gameName,
  //       entryFee,
  //       commission,
  //       gameCode,
  //       startTime,
  //       endTime,
  //       maxWinners,
  //       answers
  //     )
  //     .accounts({
  //       admin: provider.wallet.publicKey,
  //       game: gameAccount,
  //       vault: vaultAccount,
  //       config: configPubkey,
  //       systemProgram: SystemProgram.programId,
  //     } as any)
  //     .rpc();

  //   // Wait for the game to start
  //   const timeToStart = startTime.sub(currentTime).toNumber();
  //   console.log(`Waiting ${timeToStart}ms for the game to start`);
  //   await new Promise((resolve) => setTimeout(resolve, timeToStart));

  //   // Add players to the game and update their guesses
  //   const players = [];
  //   for (let i = 0; i < 5; i++) {
  //     const playerKeypair = Keypair.generate();
  //     await airdropSol(playerKeypair.publicKey, 1);
  //     players.push(playerKeypair);

  //     await program.methods
  //       .addPlayer(gameCode)
  //       .accounts({
  //         player: playerKeypair.publicKey,
  //         game: gameAccount,
  //         vault: vaultAccount,
  //         systemProgram: SystemProgram.programId,
  //       } as any)
  //       .signers([playerKeypair])
  //       .rpc();

  //     // Update player guesses
  //     const guesses = answers.map((answer, index) => ({
  //       displayOrder: index,
  //       answer: 'X', // All players give incorrect answers
  //       salt: answer.salt,
  //     }));

  //     // Simulate different submission times
  //     await new Promise((resolve) => setTimeout(resolve, 1000));

  //     const playerUpdateSlot = await provider.connection.getSlot();
  //     const playerUpdateTimestamp = await provider.connection.getBlockTime(
  //       playerUpdateSlot
  //     );
  //     if (!playerUpdateTimestamp)
  //       throw new Error("Couldn't fetch on-chain time for player update");

  //     const playerEndTime = new BN(playerUpdateTimestamp * 1000);

  //     await program.methods
  //       .updatePlayer(guesses, playerEndTime)
  //       .accounts({
  //         player: playerKeypair.publicKey,
  //         game: gameAccount,
  //         systemProgram: SystemProgram.programId,
  //       } as any)
  //       .signers([playerKeypair])
  //       .rpc();

  //     console.log(`Player ${i + 1} end time: ${playerEndTime.toString()}`);
  //   }

  //   // Wait for the game to end
  //   const timeToEnd = endTime.sub(new BN(Date.now())).toNumber() + 2000; // Add 2 seconds buffer
  //   console.log(`Waiting ${timeToEnd}ms for the game to end...`);
  //   await new Promise((resolve) => setTimeout(resolve, timeToEnd));

  //   console.log('Ending game with the following accounts:');
  //   console.log('Admin:', provider.wallet.publicKey.toBase58());
  //   console.log('Game:', gameAccount.toBase58());
  //   console.log('Vault:', vaultAccount.toBase58());
  //   console.log('Config:', configPubkey.toBase58());
  //   console.log('Treasury:', treasuryPubkey.toBase58());
  //   console.log('Players:');
  //   players.forEach((player, index) => {
  //     console.log(`  Player ${index + 1}:`, player.publicKey.toBase58());
  //   });

  //   // End the game
  //   const endGameTx = await program.methods
  //     .endGame()
  //     .accounts({
  //       admin: provider.wallet.publicKey,
  //       game: gameAccount,
  //       vault: vaultAccount,
  //       config: configPubkey,
  //       treasury: treasuryPubkey,
  //       systemProgram: SystemProgram.programId,
  //     } as any)
  //     .remainingAccounts(
  //       players.map((player) => ({
  //         pubkey: player.publicKey,
  //         isWritable: true,
  //         isSigner: false,
  //       }))
  //     )
  //     .rpc();

  //   await confirm(endGameTx);

  //   // Verify the results
  //   const totalPool = entryFee.mul(new BN(players.length));
  //   const treasuryFee = totalPool.mul(new BN(1)).div(new BN(100)); // 1% treasury fee
  //   const adminCommission = totalPool.mul(new BN(commission)).div(new BN(100));
  //   const remainingPool = totalPool.sub(treasuryFee).sub(adminCommission);
  //   const expectedWinnerPayout = remainingPool.div(new BN(maxWinners));

  //   console.log(`Total pool: ${totalPool.toString()}`);
  //   console.log(`Treasury fee: ${treasuryFee.toString()}`);
  //   console.log(`Admin commission: ${adminCommission.toString()}`);
  //   console.log(`Remaining pool: ${remainingPool.toString()}`);
  //   console.log(`Payout per winner: ${expectedWinnerPayout.toString()}`);
  //   console.log(`Entry fee: ${entryFee.toString()}`);

  //   // Check winner balances (first 3 players)
  //   for (let i = 0; i < maxWinners; i++) {
  //     const winnerBalance = await provider.connection.getBalance(
  //       players[i].publicKey
  //     );
  //     const expectedWinnerBalance =
  //       LAMPORTS_PER_SOL +
  //       expectedWinnerPayout.toNumber() -
  //       entryFee.toNumber();

  //     const winnerDifference = expectedWinnerBalance - winnerBalance;
  //     const winnerPercentageDifference =
  //       (winnerDifference / expectedWinnerBalance) * 100;

  //     console.log(`Winner ${i + 1} details:`);
  //     console.log(`  Actual balance: ${winnerBalance}`);
  //     console.log(`  Expected balance: ${expectedWinnerBalance}`);
  //     console.log(`  Difference: ${winnerDifference}`);
  //     console.log(
  //       `  Percentage difference: ${winnerPercentageDifference.toFixed(4)}%`
  //     );

  //     expect(winnerPercentageDifference).to.be.lessThan(0.2);
  //   }

  //   // Check that other players didn't receive payouts
  //   for (let i = maxWinners; i < players.length; i++) {
  //     const playerBalance = await provider.connection.getBalance(
  //       players[i].publicKey
  //     );
  //     const expectedPlayerBalance = LAMPORTS_PER_SOL - entryFee.toNumber();

  //     const playerDifference = expectedPlayerBalance - playerBalance;
  //     const playerPercentageDifference =
  //       (playerDifference / expectedPlayerBalance) * 100;

  //     console.log(`Player ${i + 1} details:`);
  //     console.log(`  Actual balance: ${playerBalance}`);
  //     console.log(`  Expected balance: ${expectedPlayerBalance}`);
  //     console.log(`  Difference: ${playerDifference}`);
  //     console.log(
  //       `  Percentage difference: ${playerPercentageDifference.toFixed(4)}%`
  //     );

  //     expect(playerPercentageDifference).to.be.lessThan(0.2);
  //   }

  //   // Check admin balance change
  //   const finalAdminBalance = await provider.connection.getBalance(
  //     provider.wallet.publicKey
  //   );
  //   const adminBalanceChange = finalAdminBalance - initialAdminBalance;
  //   console.log(`Admin balance change: ${adminBalanceChange}`);
  //   console.log(`Expected admin commission: ${adminCommission.toNumber()}`);

  //   // Allow for a small difference due to rent returns
  //   const adminBalanceDifference =
  //     adminBalanceChange - adminCommission.toNumber();
  //   console.log(
  //     `Admin balance difference from expected: ${adminBalanceDifference}`
  //   );
  //   expect(adminBalanceDifference).to.be.gte(0).and.lt(2000000); // Less than 0.002 SOL difference

  //   // Check treasury balance change
  //   const finalTreasuryBalance = await provider.connection.getBalance(
  //     treasuryPubkey
  //   );
  //   const treasuryBalanceChange = finalTreasuryBalance - initialTreasuryBalance;
  //   console.log(`Treasury balance change: ${treasuryBalanceChange}`);
  //   console.log(`Expected treasury fee: ${treasuryFee.toNumber()}`);

  //   // Allow for a small difference in treasury balance
  //   const treasuryBalanceDifference =
  //     treasuryBalanceChange - treasuryFee.toNumber();
  //   console.log(
  //     `Treasury balance difference from expected: ${treasuryBalanceDifference}`
  //   );
  //   expect(treasuryBalanceDifference).to.be.gte(0).and.lt(10000); // Less than 0.00001 SOL difference

  //   // Calculate and verify total distribution
  //   const totalDistributed = expectedWinnerPayout
  //     .mul(new BN(maxWinners))
  //     .add(adminCommission)
  //     .add(treasuryFee);
  //   console.log(`Total distributed: ${totalDistributed.toString()}`);
  //   console.log(`Total pool: ${totalPool.toString()}`);

  //   const distributionDifference = totalPool.sub(totalDistributed);
  //   console.log(
  //     `Distribution difference: ${distributionDifference.toString()}`
  //   );

  //   expect(distributionDifference.abs().toNumber()).to.be.lt(10000); // Less than 0.00001 SOL difference

  //   console.log(
  //     'End game test with all players performing poorly completed successfully'
  //   );
  // });

  // it('Ends a game with a single clear winner', async () => {
  //   console.log('Starting end game test with a single clear winner');

  //   // Fetch the current on-chain time
  //   const slot = await provider.connection.getSlot();
  //   const timestamp = await provider.connection.getBlockTime(slot);
  //   if (!timestamp) throw new Error("Couldn't fetch on-chain time");

  //   const currentTime = new BN(timestamp * 1000); // Convert to milliseconds
  //   const startTime = currentTime.add(new BN(5000)); // Start 5 seconds from now
  //   const endTime = startTime.add(new BN(30000)); // End 30 seconds after start

  //   console.log('Current on-chain time:', currentTime.toString());
  //   console.log('Game start time:', startTime.toString());
  //   console.log('Game end time:', endTime.toString());

  //   const initialAdminBalance = await provider.connection.getBalance(
  //     provider.wallet.publicKey
  //   );
  //   const initialTreasuryBalance = await provider.connection.getBalance(
  //     treasuryPubkey
  //   );

  //   // Initialize a new game
  //   const gameCode = 'SINGLEWINNER' + Math.floor(Math.random() * 10000);
  //   const gameName = 'Single Winner Game';
  //   const entryFee = new BN(LAMPORTS_PER_SOL / 10); // 0.1 SOL
  //   const commission = 10; // 10%
  //   const maxWinners = 3;
  //   const answers = [
  //     { displayOrder: 0, answer: 'A', salt: 'salt0' },
  //     { displayOrder: 1, answer: 'B', salt: 'salt1' },
  //     { displayOrder: 2, answer: 'C', salt: 'salt2' },
  //   ];

  //   const [gameAccount] = PublicKey.findProgramAddressSync(
  //     [
  //       Buffer.from('game'),
  //       provider.wallet.publicKey.toBuffer(),
  //       Buffer.from(gameCode),
  //     ],
  //     program.programId
  //   );

  //   const [vaultAccount] = PublicKey.findProgramAddressSync(
  //     [
  //       Buffer.from('vault'),
  //       provider.wallet.publicKey.toBuffer(),
  //       Buffer.from(gameCode),
  //     ],
  //     program.programId
  //   );

  //   await program.methods
  //     .initGame(
  //       gameName,
  //       entryFee,
  //       commission,
  //       gameCode,
  //       startTime,
  //       endTime,
  //       maxWinners,
  //       answers
  //     )
  //     .accounts({
  //       admin: provider.wallet.publicKey,
  //       game: gameAccount,
  //       vault: vaultAccount,
  //       config: configPubkey,
  //       systemProgram: SystemProgram.programId,
  //     } as any)
  //     .rpc();

  //   // Wait for the game to start
  //   const timeToStart = startTime.sub(currentTime).toNumber();
  //   console.log(`Waiting ${timeToStart}ms for the game to start`);
  //   await new Promise((resolve) => setTimeout(resolve, timeToStart));

  //   // Add players to the game and update their guesses
  //   const players = [];
  //   for (let i = 0; i < 5; i++) {
  //     const playerKeypair = Keypair.generate();
  //     await airdropSol(playerKeypair.publicKey, 1);
  //     players.push(playerKeypair);

  //     await program.methods
  //       .addPlayer(gameCode)
  //       .accounts({
  //         player: playerKeypair.publicKey,
  //         game: gameAccount,
  //         vault: vaultAccount,
  //         systemProgram: SystemProgram.programId,
  //       } as any)
  //       .signers([playerKeypair])
  //       .rpc();

  //     // Update player guesses
  //     const guesses = answers.map((answer, index) => ({
  //       displayOrder: index,
  //       answer: i === 2 ? answer.answer : 'X', // Only Player 3 (i === 2) gets correct answers
  //       salt: answer.salt,
  //     }));

  //     await new Promise((resolve) => setTimeout(resolve, 1000));

  //     const playerUpdateSlot = await provider.connection.getSlot();
  //     const playerUpdateTimestamp = await provider.connection.getBlockTime(
  //       playerUpdateSlot
  //     );
  //     if (!playerUpdateTimestamp)
  //       throw new Error("Couldn't fetch on-chain time for player update");

  //     const playerEndTime = new BN(playerUpdateTimestamp * 1000);

  //     await program.methods
  //       .updatePlayer(guesses, playerEndTime)
  //       .accounts({
  //         player: playerKeypair.publicKey,
  //         game: gameAccount,
  //         systemProgram: SystemProgram.programId,
  //       } as any)
  //       .signers([playerKeypair])
  //       .rpc();

  //     console.log(`Player ${i + 1} end time: ${playerEndTime.toString()}`);
  //   }

  //   // Wait for the game to end
  //   const timeToEnd = endTime.sub(new BN(Date.now())).toNumber() + 2000; // Add 2 seconds buffer
  //   console.log(`Waiting ${timeToEnd}ms for the game to end...`);
  //   await new Promise((resolve) => setTimeout(resolve, timeToEnd));

  //   // Log initial balances
  //   console.log('Initial balances:');
  //   const initialBalances = await Promise.all(
  //     players.map((player) => provider.connection.getBalance(player.publicKey))
  //   );
  //   initialBalances.forEach((balance, index) =>
  //     console.log(`Player ${index + 1} initial balance: ${balance}`)
  //   );
  //   console.log(`Admin initial balance: ${initialAdminBalance}`);
  //   console.log(`Treasury initial balance: ${initialTreasuryBalance}`);

  //   // Fetch the game state before ending the game
  //   const gameStateBefore = await program.account.game.fetch(gameAccount);
  //   console.log('Game state before ending:', gameStateBefore);

  //   console.log('Player correct answers:');
  //   gameStateBefore.players.forEach((player, index) => {
  //     console.log(`Player ${index + 1}: ${player.numCorrect} correct answers`);
  //   });

  //   // End the game
  //   console.log('Ending game...');
  //   const endGameTx = await program.methods
  //     .endGame()
  //     .accounts({
  //       admin: provider.wallet.publicKey,
  //       game: gameAccount,
  //       vault: vaultAccount,
  //       config: configPubkey,
  //       treasury: treasuryPubkey,
  //       systemProgram: SystemProgram.programId,
  //     } as any)
  //     .remainingAccounts(
  //       players.map((player) => ({
  //         pubkey: player.publicKey,
  //         isWritable: true,
  //         isSigner: false,
  //       }))
  //     )
  //     .rpc();

  //   await confirm(endGameTx);
  //   console.log('Game ended');

  //   // Log final balances
  //   console.log('Final balances:');
  //   const finalBalances = await Promise.all(
  //     players.map((player) => provider.connection.getBalance(player.publicKey))
  //   );
  //   finalBalances.forEach((balance, index) =>
  //     console.log(`Player ${index + 1} final balance: ${balance}`)
  //   );
  //   const finalAdminBalance = await provider.connection.getBalance(
  //     provider.wallet.publicKey
  //   );
  //   console.log(`Admin final balance: ${finalAdminBalance}`);
  //   const finalTreasuryBalance = await provider.connection.getBalance(
  //     treasuryPubkey
  //   );
  //   console.log(`Treasury final balance: ${finalTreasuryBalance}`);

  //   // Calculate and log balance changes
  //   console.log('Balance changes:');
  //   const balanceChanges = finalBalances.map(
  //     (final, index) => final - initialBalances[index]
  //   );
  //   balanceChanges.forEach((change, index) =>
  //     console.log(`Player ${index + 1} balance change: ${change}`)
  //   );
  //   const adminBalanceChange = finalAdminBalance - initialAdminBalance;
  //   console.log(`Admin balance change: ${adminBalanceChange}`);
  //   const treasuryBalanceChange = finalTreasuryBalance - initialTreasuryBalance;
  //   console.log(`Treasury balance change: ${treasuryBalanceChange}`);

  //   // Verify the results
  //   const totalPool = entryFee.mul(new BN(players.length));
  //   const treasuryFee = totalPool.mul(new BN(1)).div(new BN(100)); // 1% treasury fee
  //   const adminCommission = totalPool.mul(new BN(commission)).div(new BN(100));
  //   const remainingPool = totalPool.sub(treasuryFee).sub(adminCommission);
  //   const expectedWinnerPayout = remainingPool; // All remaining pool goes to the single winner

  //   console.log(`Expected total pool: ${totalPool.toString()}`);
  //   console.log(`Expected treasury fee: ${treasuryFee.toString()}`);
  //   console.log(`Expected admin commission: ${adminCommission.toString()}`);
  //   console.log(`Expected remaining pool: ${remainingPool.toString()}`);
  //   console.log(
  //     `Expected payout to winner: ${expectedWinnerPayout.toString()}`
  //   );

  //   // Check winner balance (Player 3, index 2)
  //   const winnerBalanceChange = balanceChanges[2];
  //   const expectedWinnerBalanceChange = expectedWinnerPayout.toNumber(); // Remove the subtraction of entry fee

  //   const winnerDifference = expectedWinnerBalanceChange - winnerBalanceChange;
  //   const winnerPercentageDifference =
  //     (winnerDifference / expectedWinnerBalanceChange) * 100;

  //   console.log('Winner details:');
  //   console.log(`  Actual balance change: ${winnerBalanceChange}`);
  //   console.log(`  Expected balance change: ${expectedWinnerBalanceChange}`);
  //   console.log(`  Difference: ${winnerDifference}`);
  //   console.log(
  //     `  Percentage difference: ${winnerPercentageDifference.toFixed(4)}%`
  //   );

  //   expect(Math.abs(winnerPercentageDifference)).to.be.lessThan(0.2);

  //   // Check that other players didn't receive payouts
  //   // Check that other players didn't receive payouts
  //   for (let i = 0; i < players.length; i++) {
  //     if (i === 2) continue; // Skip the winner
  //     const playerBalanceChange = balanceChanges[i];
  //     const expectedPlayerBalanceChange = 0; // They should neither gain nor lose if entry fee is not deducted

  //     const playerDifference =
  //       expectedPlayerBalanceChange - playerBalanceChange;
  //     const playerPercentageDifference =
  //       (Math.abs(playerDifference) / Math.abs(entryFee.toNumber())) * 100;

  //     console.log(`Player ${i + 1} details:`);
  //     console.log(`  Actual balance change: ${playerBalanceChange}`);
  //     console.log(`  Expected balance change: ${expectedPlayerBalanceChange}`);
  //     console.log(`  Difference: ${playerDifference}`);
  //     console.log(
  //       `  Percentage difference: ${playerPercentageDifference.toFixed(4)}%`
  //     );

  //     expect(playerPercentageDifference).to.be.lessThan(0.2);
  //   }

  //   // Check admin balance change
  //   const adminBalanceDifference =
  //     adminBalanceChange - adminCommission.toNumber();
  //   console.log(
  //     `Admin balance difference from expected: ${adminBalanceDifference}`
  //   );
  //   expect(adminBalanceDifference).to.be.gte(0).and.lt(2000000); // Less than 0.002 SOL difference

  //   // Check treasury balance change
  //   const treasuryBalanceDifference =
  //     treasuryBalanceChange - treasuryFee.toNumber();
  //   console.log(
  //     `Treasury balance difference from expected: ${treasuryBalanceDifference}`
  //   );
  //   expect(treasuryBalanceDifference).to.be.gte(0).and.lt(10000); // Less than 0.00001 SOL difference

  //   console.log('Fund flow details:');
  //   console.log(`Total pool: ${totalPool.toString()}`);
  //   console.log(`Treasury fee: ${treasuryFee.toString()}`);
  //   console.log(`Admin commission: ${adminCommission.toString()}`);
  //   console.log(`Winner payout: ${expectedWinnerPayout.toString()}`);
  //   console.log(
  //     `Sum of outflows: ${treasuryFee
  //       .add(adminCommission)
  //       .add(expectedWinnerPayout)
  //       .toString()}`
  //   );
  //   console.log(
  //     `Difference from total pool: ${totalPool
  //       .sub(treasuryFee)
  //       .sub(adminCommission)
  //       .sub(expectedWinnerPayout)
  //       .toString()}`
  //   );

  //   // Check if the total outflows match the total pool
  //   const totalOutflows = treasuryFee
  //     .add(adminCommission)
  //     .add(expectedWinnerPayout);
  //   expect(totalOutflows.eq(totalPool)).to.be.true;

  //   console.log(
  //     'End game test with a single clear winner completed successfully'
  //   );
  // });
});
