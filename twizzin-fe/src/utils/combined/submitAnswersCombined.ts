import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { TwizzinIdl } from '../../types/idl';
import { GameSession, JoinFullGame, QuestionFromDb } from '@/types';
import { submitAnswers } from '../program/submitAnswers';
import { submitAnswersToDb } from '../supabase/submitAnswersToDb';
import { verifyAndPrepareAnswers } from '../merkle/verifyUserAnswers';

export const submitAnswersCombined = async ({
  program,
  connection,
  publicKey,
  sendTransaction,
  gameData,
  gameSession,
  markSessionSubmitted,
  setGameSession,
}: {
  program: Program<TwizzinIdl>;
  connection: Connection;
  publicKey: PublicKey;
  sendTransaction: (
    // eslint-disable-next-line no-unused-vars
    transaction: Transaction,
    // eslint-disable-next-line no-unused-vars
    connection: Connection
  ) => Promise<string>;
  gameData: JoinFullGame;
  gameSession: GameSession;
  // eslint-disable-next-line no-unused-vars
  markSessionSubmitted: (gameCode: string) => GameSession | null;
  // eslint-disable-next-line no-unused-vars
  setGameSession: (session: GameSession) => void;
}): Promise<{
  success: boolean;
  signature: string | null;
  error: string | null;
}> => {
  if (!gameSession || !program || !publicKey || !gameData) {
    return {
      success: false,
      signature: null,
      error: 'Missing required parameters',
    };
  }

  try {
    // Use questions from gameData
    const questions = gameData.questions.map((q: QuestionFromDb) => ({
      id: q.id,
      correct_answer: q.correct_answer,
      display_order: q.display_order,
    }));

    // Verify and prepare answers
    const { answers: verifiedAnswers, numCorrect } =
      await verifyAndPrepareAnswers(gameSession, questions);

    // Mark the session as submitted
    const submittedSession = markSessionSubmitted(gameData.game_code);
    if (submittedSession) {
      setGameSession(submittedSession);
    }

    // Submit to Solana
    const solanaResult = await submitAnswers(
      program,
      connection,
      publicKey,
      sendTransaction,
      {
        admin: new PublicKey(gameData.admin_wallet),
        gameCode: gameData.game_code,
        answers: verifiedAnswers,
        clientFinishTime: gameSession.finishTime,
      }
    );

    if (!solanaResult.success) {
      throw new Error(solanaResult.error || 'Failed to submit to Solana');
    }

    // Submit to Supabase with correct answer count
    const dbResult = await submitAnswersToDb({
      gameId: gameData.id,
      playerWallet: publicKey.toString(),
      gameSession: {
        ...gameSession,
        answers: verifiedAnswers,
      },
      signature: solanaResult.signature!,
      numCorrect,
    });

    if (!dbResult.success) {
      throw new Error(dbResult.error || 'Failed to submit to database');
    }

    return {
      success: true,
      signature: solanaResult.signature,
      error: null,
    };
  } catch (error: any) {
    console.error('Error in submitAnswersCombined:', error);
    return {
      success: false,
      signature: null,
      error: error.message || 'Failed to submit game',
    };
  }
};
