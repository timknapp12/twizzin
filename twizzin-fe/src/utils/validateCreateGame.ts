import { QuestionForDb, displayOrderMap, CreateGameData } from '@/types';
import i18next from 'i18next';

const validateQuestions = (questions: QuestionForDb[]): string | null => {
  const isQuestionValid = (
    question: QuestionForDb,
    index: number
  ): string | null => {
    if (!question.questionText.trim()) {
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

const validateGameData = (gameData: CreateGameData): string | null => {
  if (!gameData.gameName || gameData.gameName.trim() === '') {
    return i18next.t('Game title is required');
  }

  // if (!gameData.startTime || new Date(gameData.startTime) <= new Date()) {
  //   return i18next.t('Start time must be in the future');
  // }

  if (!gameData.maxWinners || gameData.maxWinners < 1) {
    return i18next.t('Number of max winners must be at least 1');
  }

  if (
    (!gameData.entryFee || gameData.entryFee <= 0) &&
    (!gameData.donation || gameData.donation <= 0)
  ) {
    return i18next.t('Either entry fee or donation must be greater than 0');
  }

  return null;
};

export const validateGame = (
  gameData: CreateGameData,
  questions: QuestionForDb[]
): string | null => {
  // Check game data
  const gameDataError = validateGameData(gameData);
  if (gameDataError) return gameDataError;

  // Check questions
  const questionsError = validateQuestions(questions);
  if (questionsError) return questionsError;

  return null;
};
