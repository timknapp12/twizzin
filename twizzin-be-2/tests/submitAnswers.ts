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
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { createHash } from 'crypto';

interface AnswerInput {
  displayOrder: number;
  answer: string;
  questionId: string;
  proof: number[][];
}

const createLeafHash = (
  displayOrder: number,
  answer: string,
  questionId: string
): Buffer => {
  const hash = createHash('sha256');
  hash.update(Buffer.from([displayOrder]));
  hash.update(Buffer.from(answer));
  hash.update(Buffer.from(questionId));
  return hash.digest();
};

const hashPair = (first: Buffer, second: Buffer): Buffer => {
  const hash = createHash('sha256');
  if (Buffer.compare(first, second) <= 0) {
    hash.update(first);
    hash.update(second);
  } else {
    hash.update(second);
    hash.update(first);
  }
  return hash.digest();
};

class MerkleTree {
  private layers: Buffer[][];

  constructor(
    answers: Array<{ displayOrder: number; answer: string; questionId: string }>
  ) {
    const leaves = answers.map((answer) =>
      createLeafHash(answer.displayOrder, answer.answer, answer.questionId)
    );
    this.layers = [leaves];

    while (this.layers[this.layers.length - 1].length > 1) {
      this.layers.push(
        this.createNextLayer(this.layers[this.layers.length - 1])
      );
    }
  }

  private createNextLayer(nodes: Buffer[]): Buffer[] {
    const layerNodes: Buffer[] = [];
    for (let i = 0; i < nodes.length; i += 2) {
      if (i + 1 === nodes.length) {
        layerNodes.push(nodes[i]);
      } else {
        layerNodes.push(hashPair(nodes[i], nodes[i + 1]));
      }
    }
    return layerNodes;
  }

  getRoot(): Buffer {
    return this.layers[this.layers.length - 1][0];
  }

  getProof(index: number): Buffer[] {
    let currentIndex = index;
    const proof: Buffer[] = [];

    for (
      let layerIndex = 0;
      layerIndex < this.layers.length - 1;
      layerIndex++
    ) {
      const currentLayer = this.layers[layerIndex];
      const isRightNode = currentIndex % 2 === 0;
      const pairIndex = isRightNode ? currentIndex + 1 : currentIndex - 1;

      if (pairIndex < currentLayer.length) {
        proof.push(currentLayer[pairIndex]);
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return proof;
  }
}

const createTestAnswers = () => {
  const correctAnswers = [
    { displayOrder: 0, answer: 'a', questionId: 'q1' },
    { displayOrder: 1, answer: 'b', questionId: 'q2' },
    { displayOrder: 2, answer: 'c', questionId: 'q3' },
  ];

  const tree = new MerkleTree(correctAnswers);
  const root = tree.getRoot();

  const testAnswers: AnswerInput[] = correctAnswers.map((answer, index) => {
    const proof = tree.getProof(index);
    return {
      displayOrder: answer.displayOrder,
      answer: answer.answer,
      questionId: answer.questionId,
      proof: proof.map((proofElement) => {
        const bytes = new Uint8Array(32).fill(0);
        bytes.set(new Uint8Array(proofElement));
        return Array.from(bytes);
      }),
    };
  });

  return {
    root: Array.from(new Uint8Array(root)),
    testAnswers,
  };
};

export async function submitAnswers(
  program: Program<TwizzinBe2>,
  provider: anchor.AnchorProvider,
  confirm: (signature: string) => Promise<string>
) {
  console.log('Starting submit answers tests');

  const { root: validAnswerHash, testAnswers } = createTestAnswers();

  const setupGameAndPlayer = async () => {
    const gameCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const player = new Keypair();

    const airdropSig = await provider.connection.requestAirdrop(
      player.publicKey,
      LAMPORTS_PER_SOL
    );
    await confirm(airdropSig);

    const now = Math.floor(Date.now() / 1000);
    // Start time 2 minutes ago to ensure we have enough time buffer
    const gameStartTime = new anchor.BN((now - 120) * 1000);
    const gameEndTime = new anchor.BN((now + 3600) * 1000); // 1 hour from now

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

    await program.methods
      .initGame(
        'Test Game',
        gameCode,
        new anchor.BN(0),
        5,
        gameStartTime,
        gameEndTime,
        5,
        validAnswerHash,
        new anchor.BN(0)
      )
      .accounts({
        admin: provider.wallet.publicKey,
        game: gamePda,
        tokenMint: NATIVE_MINT,
        vault: vaultPda,
        adminTokenAccount: null,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [playerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('player'), gamePda.toBuffer(), player.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .joinGame()
      .accounts({
        player: player.publicKey,
        game: gamePda,
        playerAccount: playerPda,
        vault: vaultPda,
        playerTokenAccount: null,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([player])
      .rpc();

    return { gameCode, gamePda, player, playerPda, gameStartTime, gameEndTime };
  };

  const executeSubmitAnswers = async (params: {
    player: Keypair;
    gamePda: PublicKey;
    playerPda: PublicKey;
    answers: AnswerInput[];
    clientFinishTime: anchor.BN;
  }) => {
    const { player, gamePda, playerPda, answers, clientFinishTime } = params;

    return program.methods
      .submitAnswers(
        answers.map((a) => ({
          displayOrder: a.displayOrder,
          answer: a.answer,
          questionId: a.questionId,
          proof: a.proof,
        })),
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
  };

  const expectError = (error: any, errorTypes: string[]) => {
    const errorString = error.toString();
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

  // Test 1: Successfully submit answers
  console.log('Testing successful answer submission...');
  try {
    const { gamePda, player, playerPda, gameStartTime } =
      await setupGameAndPlayer();

    // Wait a bit to ensure we're after start time
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const now = Math.floor(Date.now() / 1000);
    // Set client finish time to 30 seconds ago
    const clientFinishTime = new anchor.BN((now - 30) * 1000);

    const tx = await executeSubmitAnswers({
      player,
      gamePda,
      playerPda,
      answers: testAnswers,
      clientFinishTime,
    });
    await confirm(tx);

    const playerAccount = await program.account.playerAccount.fetch(playerPda);
    expect(playerAccount.finishedTime.eq(clientFinishTime)).to.be.true;
    expect(playerAccount.numCorrect).to.equal(testAnswers.length);

    console.log('Successful answer submission test passed');
  } catch (error) {
    console.error('Successful answer submission test failed:', error);
    throw error;
  }

  // Test 2: Fail to submit before game starts
  console.log('Testing submission before game starts...');
  try {
    const { gamePda, player, playerPda, gameStartTime } =
      await setupGameAndPlayer();
    const tooEarlyTime = new anchor.BN(gameStartTime.toNumber() - 60000); // 1 minute before start

    await executeSubmitAnswers({
      player,
      gamePda,
      playerPda,
      answers: testAnswers,
      clientFinishTime: tooEarlyTime,
    });
    throw new Error('Should have failed with GameNotStarted');
  } catch (error) {
    expectError(error, ['GameNotStarted']);
    console.log('Submission before game starts test passed');
  }

  // Test 3: Fail to submit after game ends
  console.log('Testing submission after game ends...');
  try {
    const { gamePda, player, playerPda, gameEndTime } =
      await setupGameAndPlayer();
    const tooLateTime = new anchor.BN(gameEndTime.toNumber() + 60000); // 1 minute after end

    await executeSubmitAnswers({
      player,
      gamePda,
      playerPda,
      answers: testAnswers,
      clientFinishTime: tooLateTime,
    });
    throw new Error('Should have failed with GameEnded');
  } catch (error) {
    expectError(error, ['GameEnded']);
    console.log('Submission after game ends test passed');
  }

  // Test 4: Fail to submit with future timestamp
  console.log('Testing submission with future timestamp...');
  try {
    const { gamePda, player, playerPda } = await setupGameAndPlayer();
    const now = Math.floor(Date.now() / 1000);
    const futureTime = new anchor.BN((now + 60) * 1000); // 1 minute in future

    await executeSubmitAnswers({
      player,
      gamePda,
      playerPda,
      answers: testAnswers,
      clientFinishTime: futureTime,
    });
    throw new Error('Should have failed with InvalidFinishTime');
  } catch (error) {
    expectError(error, ['InvalidFinishTime']);
    console.log('Future timestamp test passed');
  }

  // Test 5: Fail to submit twice
  console.log('Testing double submission...');
  try {
    const { gamePda, player, playerPda } = await setupGameAndPlayer();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const now = Math.floor(Date.now() / 1000);
    const clientFinishTime = new anchor.BN((now - 30) * 1000); // 30 seconds ago

    // First submission
    const tx = await executeSubmitAnswers({
      player,
      gamePda,
      playerPda,
      answers: testAnswers,
      clientFinishTime,
    });
    await confirm(tx);

    // Second submission
    await executeSubmitAnswers({
      player,
      gamePda,
      playerPda,
      answers: testAnswers,
      clientFinishTime,
    });
    throw new Error('Should have failed with AlreadySubmitted');
  } catch (error) {
    expectError(error, ['AlreadySubmitted']);
    console.log('Double submission test passed');
  }

  console.log('All submit answers tests completed successfully');
}
