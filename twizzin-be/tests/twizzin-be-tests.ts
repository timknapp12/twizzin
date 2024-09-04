import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { TwizzinBe } from '../target/types/twizzin_be';
import { expect } from 'chai';
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

  const confirm = async (signature: string): Promise<string> => {
    const block = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature,
      ...block,
    });
    return signature;
  };

  it('Initializes a game', async () => {
    console.log('Starting game initialization test');
    const gameName = 'Test Game';
    const entryFee = new BN(LAMPORTS_PER_SOL / 100); // 0.01 SOL
    const commission = 5; // 5%
    const startTime = new BN(Math.floor(Date.now() / 1000));
    const endTime = new BN(startTime.toNumber() + 1800); // 30 minutes after start
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

    const airdropSignature = await provider.connection.requestAirdrop(
      provider.wallet.publicKey,
      2 * LAMPORTS_PER_SOL
    );

    await confirm(airdropSignature);
    await new Promise((resolve) => setTimeout(resolve, 2000));

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
    console.log(
      `Requesting airdrop for player: ${playerKeypair.publicKey.toBase58()}`
    );
    const airdropSignature = await provider.connection.requestAirdrop(
      playerKeypair.publicKey,
      2 * LAMPORTS_PER_SOL // Airdrop 2 SOL
    );

    await confirm(airdropSignature);

    // Add a delay to ensure the airdrop is processed
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const balance = await provider.connection.getBalance(
      playerKeypair.publicKey
    );
    console.log(
      `Player balance after airdrop: ${balance / LAMPORTS_PER_SOL} SOL`
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

    const airdropSignature = await provider.connection.requestAirdrop(
      playerKeypair.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await confirm(airdropSignature);
    await new Promise((resolve) => setTimeout(resolve, 2000));

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
    const endTime = new BN(Math.floor(Date.now() / 1000));

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
      const airdropSignature = await provider.connection.requestAirdrop(
        player.keypair.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await confirm(airdropSignature);
      await new Promise((resolve) => setTimeout(resolve, 2000));

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

    // Update players with different guesses
    for (const player of players) {
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

      const endTime = new BN(Math.floor(Date.now() / 1000));

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
    const gameState = await program.account.game.fetch(gameAccount);

    for (const player of players) {
      const updatedPlayer = gameState.players.find((p) =>
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
        gameState.players.map((p) => ({
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
});
