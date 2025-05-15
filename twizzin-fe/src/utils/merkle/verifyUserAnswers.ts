import { GameSession } from '@/types';
import { MerkleTree } from './MerkleTree';
import { VerifyAnswersResult } from '@/types';

export async function verifyAndPrepareAnswers(
  gameSession: GameSession,
  questions: Array<{
    id: string;
    correct_answer: string;
    display_order: number;
  }>
): Promise<VerifyAnswersResult> {
  // Validate we have answers for all questions
  if (gameSession.answers.length !== questions.length) {
    throw new Error('Number of answers does not match number of questions');
  }

  // Sort questions by display order to ensure consistent ordering
  const sortedQuestions = [...questions].sort(
    (a, b) => a.display_order - b.display_order
  );

  // Create answers array in same order as questions
  const correctAnswersForTree = sortedQuestions.map((q) => ({
    displayOrder: q.display_order,
    answer: q.correct_answer,
    salt: q.id,
  }));

  // Create tree and generate proofs
  const tree = await MerkleTree.create(correctAnswersForTree);

  // Verify each answer and calculate correctness
  const verifiedAnswers = gameSession.answers.map((userAnswer) => {
    const question = sortedQuestions.find(
      (q) => q.display_order === userAnswer.displayOrder
    );
    if (!question) {
      throw new Error(
        `No matching question found for answer with display order ${userAnswer.displayOrder}`
      );
    }

    const proof = tree.getProof(userAnswer.displayOrder);
    const isCorrect =
      userAnswer.answer.trim().toUpperCase() ===
      question.correct_answer.trim().toUpperCase();

    return {
      displayOrder: userAnswer.displayOrder,
      answer: userAnswer.answer,
      questionId: question.id,
      proof: proof.map((p) => Array.from(p)),
      isCorrect, // Include isCorrect flag
    };
  });

  // Count correct answers
  const numCorrect = verifiedAnswers.filter((a) => a.isCorrect).length;

  // Keep isCorrect in the returned answers
  const formattedAnswers = verifiedAnswers.map((answer) => ({
    displayOrder: answer.displayOrder,
    answer: answer.answer,
    questionId: answer.questionId,
    proof: answer.proof,
    isCorrect: answer.isCorrect,
  }));

  return {
    answers: formattedAnswers,
    numCorrect,
  };
}
