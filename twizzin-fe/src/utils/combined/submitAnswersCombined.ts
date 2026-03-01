import { PublicKey } from '@solana/web3.js';
import { Program, BN, AnchorProvider } from '@coral-xyz/anchor';
import { TwizzinIdl } from '@/types/idl';
import {
  GameSession,
  JoinFullGame,
  GameResultFromDb,
  GameResultQuestion,
} from '@/types';
import { submitAnswers } from '../program/submitAnswers';
import { getSupabaseTimestamp } from '../helpers/timeHelpers';
import { authenticatedApiClient } from '../api/authenticatedClient';

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
    // Use the client submission time (already properly set by UI layer)
    // - If user manually submitted: finishTime = Date.now() when they clicked
    // - If time expired: finishTime = game end time (set by handleAutoSubmitUnanswered)
    const submissionTime = gameSession.finishTime;
    // Format finish time for different uses
    const finishTimeAnchor = new BN(submissionTime);
    const finishTimeDb = getSupabaseTimestamp(new Date(submissionTime));

    // Sort answers by display order
    const sortedAnswers = [...gameSession.answers].sort(
      (a, b) => a.displayOrder - b.displayOrder
    );

    // Format answers for the server-side verification API
    const answersForApi = sortedAnswers.map((answer) => ({
      displayOrder: answer.displayOrder,
      answer: answer.answer,
      questionId: answer.questionId,
    }));

    // Call server-side API to generate merkle proofs and verify answers
    // This keeps correct answers on the server — they are never sent to the client
    const verifyResult = await authenticatedApiClient.verifyAnswers(
      gameData.game_code,
      answersForApi,
      submissionTime
    );

    if (!verifyResult.success || !verifyResult.data) {
      throw new Error(verifyResult.error || 'Failed to verify answers');
    }

    const { answers: verifiedAnswersWithResults, numCorrect } = verifyResult.data;

    // Extract proof-only answers for Solana submission (strip result display data)
    const verifiedAnswers = verifiedAnswersWithResults.map(
      (a: {
        displayOrder: number;
        answer: string;
        questionId: string;
        proof: number[][];
        isCorrect: boolean;
      }) => ({
        displayOrder: a.displayOrder,
        answer: a.answer,
        questionId: a.questionId,
        proof: a.proof,
        isCorrect: a.isCorrect,
      })
    );

    // Verify answers because of the out of index error
    console.log(
      'Verified answers being sent to Solana:',
      JSON.stringify(verifiedAnswers, null, 2)
    );
    verifiedAnswers.forEach(
      (a: { proof: number[][] }, i: number) => {
        if (!Array.isArray(a.proof)) {
          throw new Error(
            `Answer at index ${i} has invalid proof: ${JSON.stringify(a.proof)}`
          );
        }
      }
    );

    // Format session for DB submission
    const formattedSession: GameSession = {
      answers: answersForApi,
      startTime: gameSession.startTime,
      finishTime: submissionTime,
      submitted: gameSession.submitted,
    };

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

    // Submit to Supabase using authenticated API
    const apiResult = await authenticatedApiClient.submitAnswers(
      gameData.game_code,
      {
        ...formattedSession,
        answers: verifiedAnswers,
        finishTime: finishTimeDb,
      },
      solanaResult.signature!,
      numCorrect
    );

    if (!apiResult.success) {
      throw new Error(apiResult.error || 'Failed to submit to database');
    }

    // Construct game result from server-verified data
    // The verify-answers API returns correctAnswerText and correctAnswerLetter
    // so we can build the results display without having correct answers locally
    const answeredQuestions: GameResultQuestion[] = gameData.questions.map(
      (question) => {
        const serverAnswer = verifiedAnswersWithResults.find(
          (a: { questionId: string }) => a.questionId === question.id
        );
        const userAnswerDetails = serverAnswer
          ? question.answers.find(
              (a) => a.display_letter === serverAnswer.answer
            )
          : null;

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
            text: serverAnswer?.correctAnswerText || '',
            displayLetter: serverAnswer?.correctAnswerLetter || '',
          },
          isCorrect: serverAnswer?.isCorrect || false,
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
