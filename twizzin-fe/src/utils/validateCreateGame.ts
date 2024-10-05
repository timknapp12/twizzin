import { QuestionForDb, displayOrderMap } from '@/types';
import i18next from 'i18next';

export const validateQuestions = (
  questions: QuestionForDb[]
): string | null => {
  const isQuestionValid = (
    question: QuestionForDb,
    index: number
  ): string | null => {
    if (!question.question.trim()) {
      return i18next.t('Question {{number}} is blank', { number: index + 1 });
    }
    if (!question.answers.some((answer) => answer.isCorrect)) {
      return i18next.t(
        'Question {{number}} does not have a correct answer selected',
        { number: index + 1 }
      );
    }
    const emptyAnswer = question.answers.findIndex(
      (answer) => !answer.answerText.trim()
    );
    if (emptyAnswer !== -1) {
      return i18next.t(
        'Question {{questionNumber}}, Answer {{answerLetter}} is blank',
        {
          questionNumber: index + 1,
          answerLetter:
            displayOrderMap[emptyAnswer as keyof typeof displayOrderMap],
        }
      );
    }
    if (
      question.timeLimit === null ||
      question.timeLimit === 0 ||
      isNaN(Number(question.timeLimit)) ||
      Number(question.timeLimit) < 1 ||
      question.timeLimit > 60
    ) {
      return i18next.t(
        'Question {{number}} time limit must be a number between 1 and 60 seconds',
        { number: index + 1 }
      );
    }
    return null;
  };

  const errors = questions.map(isQuestionValid);
  return errors.find((error) => error !== null) || null;
};
