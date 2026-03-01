import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedHandler } from '@/lib/auth';
import { getGameFromDb } from '@/utils/supabase/getGameFromDb';
import { verifyAndPrepareAnswers } from '@/utils/merkle/verifyUserAnswers';
import { GameSession, QuestionFromDb } from '@/types';

interface VerifyAnswersRequest {
  gameCode: string;
  answers: Array<{
    displayOrder: number;
    answer: string;
    questionId: string;
  }>;
  finishTime: number;
}

export const POST = createAuthenticatedHandler(async (request: NextRequest, user) => {
  try {
    const body: VerifyAnswersRequest = await request.json();
    const { gameCode, answers, finishTime } = body;

    // Validate required fields
    if (!gameCode || !answers || !finishTime) {
      return NextResponse.json(
        { error: 'Missing required fields: gameCode, answers, finishTime' },
        { status: 400 }
      );
    }

    if (!Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json(
        { error: 'Invalid answers format: must be a non-empty array' },
        { status: 400 }
      );
    }

    // Fetch the full game data from the database (includes correct answers)
    const game = await getGameFromDb(gameCode);

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Validate the game is active
    if (game.status !== 'active') {
      return NextResponse.json(
        { error: 'Game is not active' },
        { status: 400 }
      );
    }

    // Validate timing is reasonable
    const now = Date.now();
    const gameStartTime = new Date(game.start_time).getTime();
    const gameEndTime = new Date(game.end_time).getTime();

    if (finishTime < gameStartTime) {
      return NextResponse.json(
        { error: 'Finish time is before game start time' },
        { status: 400 }
      );
    }

    // Allow a reasonable buffer (30 seconds) past game end time for network delays
    const endTimeBuffer = 30 * 1000;
    if (finishTime > gameEndTime + endTimeBuffer) {
      return NextResponse.json(
        { error: 'Finish time is too far after game end time' },
        { status: 400 }
      );
    }

    // Extract questions with correct answers for merkle proof generation
    const questions = game.questions.map((q: QuestionFromDb) => ({
      id: q.id,
      correct_answer: q.correct_answer,
      display_order: q.display_order,
    }));

    // Sort answers by display order
    const sortedAnswers = [...answers].sort(
      (a, b) => a.displayOrder - b.displayOrder
    );

    // Format session for verification
    const formattedSession: GameSession = {
      answers: sortedAnswers.map((answer) => ({
        displayOrder: answer.displayOrder,
        answer: answer.answer,
        questionId: answer.questionId,
      })),
      startTime: gameStartTime,
      finishTime,
      submitted: false,
    };

    // Generate merkle proofs server-side
    const { answers: verifiedAnswers, numCorrect } =
      await verifyAndPrepareAnswers(formattedSession, questions);

    // Build response with data needed for results display (Option A)
    // Include correctAnswer text and letter for each answer so the client
    // can display results without needing correct answer data locally
    const answersWithResultData = verifiedAnswers.map((verifiedAnswer) => {
      const question = game.questions.find(
        (q: QuestionFromDb) => q.id === verifiedAnswer.questionId
      );
      const correctAnswerOption = question?.answers.find(
        (a: { is_correct: boolean }) => a.is_correct
      );

      return {
        displayOrder: verifiedAnswer.displayOrder,
        answer: verifiedAnswer.answer,
        questionId: verifiedAnswer.questionId,
        proof: verifiedAnswer.proof,
        isCorrect: verifiedAnswer.isCorrect,
        correctAnswerText: correctAnswerOption?.answer_text || '',
        correctAnswerLetter: correctAnswerOption?.display_letter || '',
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        answers: answersWithResultData,
        numCorrect,
      },
    });

  } catch (error: any) {
    console.error('Error verifying answers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify answers' },
      { status: 500 }
    );
  }
});
