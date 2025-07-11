import { PublicKey } from '@solana/web3.js';
import { Program, BN, AnchorProvider } from '@coral-xyz/anchor';
import { TwizzinIdl } from '@/types/idl';
import {
  GameSession,
  JoinFullGame,
  QuestionFromDb,
  GameResultFromDb,
  GameResultQuestion,
} from '@/types';
import { submitAnswers } from '../program/submitAnswers';
import { submitAnswersToDb } from '../supabase/submitAnswersToDb';
import { verifyAndPrepareAnswers } from '../merkle/verifyUserAnswers';
import { getSupabaseTimestamp } from '../helpers/timeHelpers';

interface SubmitAnswersResult {
  success: boolean;
  signature: string | null;
  error: string | null;
  gameResult?: GameResultFromDb;
}

interface SubmitAnswersParams {
  program: Program<TwizzinIdl>;
  provider: AnchorProvider;
  gameData: JoinFullGame;
  gameSession: GameSession;
  // eslint-disable-next-line no-unused-vars
  markSessionSubmitted: (gameCode: string) => GameSession | null;
  // eslint-disable-next-line no-unused-vars
  setGameSession: (session: GameSession) => void;
}

export const submitAnswersCombined = async ({
  program,
  provider,
  gameData,
  gameSession,
  markSessionSubmitted,
  setGameSession,
}: SubmitAnswersParams): Promise<SubmitAnswersResult> => {
  const publicKey = provider.wallet.publicKey;
  if (!gameSession || !program || !publicKey || !gameData) {
    return {
      success: false,
      signature: null,
      error: 'Missing required parameters',
    };
  }

  try {
    // Ensure finish time is not after game end time
    const gameEndTime = new Date(gameData.end_time).getTime();
    const submissionTime = Math.min(gameSession.finishTime, gameEndTime);
    // Format finish time for different uses
    const finishTimeAnchor = new BN(submissionTime);
    const finishTimeDb = getSupabaseTimestamp(new Date(submissionTime));

    // Extract questions with correct answers
    const questions = gameData.questions.map((q: QuestionFromDb) => ({
      id: q.id,
      correct_answer: q.correct_answer,
      display_order: q.display_order,
    }));

    // Sort answers by display order
    const sortedAnswers = [...gameSession.answers].sort(
      (a, b) => a.displayOrder - b.displayOrder
    );

    // Format session for verification
    const formattedSession: GameSession = {
      answers: sortedAnswers.map((answer) => ({
        displayOrder: answer.displayOrder,
        answer: answer.answer,
        questionId: answer.questionId,
      })),
      startTime: gameSession.startTime,
      finishTime: submissionTime,
      submitted: gameSession.submitted,
    };

    // Verify and prepare answers
    const { answers: verifiedAnswers, numCorrect } =
      await verifyAndPrepareAnswers(formattedSession, questions);

    // Verify answers because of the out of index error
    console.log(
      'Verified answers being sent to Solana:',
      JSON.stringify(verifiedAnswers, null, 2)
    );
    // Verify answers because of the out of index error
    verifiedAnswers.forEach((a, i) => {
      if (!Array.isArray(a.proof)) {
        throw new Error(
          `Answer at index ${i} has invalid proof: ${JSON.stringify(a.proof)}`
        );
      }
    });

    // Mark the session as submitted
    const submittedSession = markSessionSubmitted(gameData.game_code);
    if (submittedSession) {
      setGameSession(submittedSession);
    }

    // Submit to Solana
    const solanaResult = await submitAnswers(program, provider, {
      admin: new PublicKey(gameData.admin_wallet),
      gameCode: gameData.game_code,
      answers: verifiedAnswers,
      clientFinishTime: finishTimeAnchor,
    });

    if (!solanaResult.success) {
      throw new Error(solanaResult.error || 'Failed to submit to Solana');
    }

    // Submit to Supabase
    const dbResult = await submitAnswersToDb({
      gameId: gameData.id,
      playerWallet: publicKey.toString(),
      gameSession: {
        ...formattedSession,
        answers: verifiedAnswers,
        finishTime: finishTimeDb,
      },
      signature: solanaResult.signature!,
      numCorrect,
    });

    if (!dbResult.success) {
      throw new Error(dbResult.error || 'Failed to submit to database');
    }

    // Construct game result from available data
    const answeredQuestions: GameResultQuestion[] = gameData.questions.map(
      (question) => {
        const userAnswer = verifiedAnswers.find(
          (answer) => answer.questionId === question.id
        );
        const userAnswerDetails = userAnswer
          ? question.answers.find((a) => a.answer_text === userAnswer.answer)
          : null;
        const correctAnswer = question.answers.find((a) => a.is_correct);

        return {
          questionId: question.id,
          questionText: question.question_text,
          userAnswer: userAnswerDetails
            ? {
                text: userAnswerDetails.answer_text,
                displayLetter: userAnswerDetails.display_letter,
              }
            : null,
          correctAnswer: {
            text: correctAnswer?.answer_text || '',
            displayLetter: correctAnswer?.display_letter || '',
          },
          isCorrect: userAnswer?.isCorrect || false,
          displayOrder: question.display_order,
        };
      }
    );

    answeredQuestions.sort((a, b) => a.displayOrder - b.displayOrder);

    const gameResult: GameResultFromDb = {
      answeredQuestions,
      totalCorrect: numCorrect,
      totalQuestions: gameData.questions.length,
      completedAt: finishTimeDb,
      finalRank: undefined,
      xpEarned: undefined,
      rewardsEarned: undefined,
    };

    return {
      success: true,
      signature: solanaResult.signature,
      error: null,
      gameResult,
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
