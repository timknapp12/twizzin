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
    const startTime = new BN(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now
    const endTime = new BN(startTime.toNumber() + 1800); // 30 minutes after start
    const answers = [
      { displayOrder: 1, answer: 'A', salt: 'salt1' },
      { displayOrder: 2, answer: 'B', salt: 'salt2' },
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

    expect(gameState.name).to.equal(gameName);
    expect(gameState.entryFee.eq(entryFee)).to.be.true;
    expect(gameState.commission).to.equal(commission);
    expect(gameState.gameCode).to.equal(gameCode);
    expect(gameState.startTime.eq(startTime)).to.be.true;
    expect(gameState.endTime.eq(endTime)).to.be.true;
    expect(gameState.answers.length).to.equal(answers.length);
    console.log('Game initialization test completed successfully');
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
    await new Promise((resolve) => setTimeout(resolve, 5000));

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
});
