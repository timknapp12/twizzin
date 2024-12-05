import React from 'react';
import {
  Column,
  Row,
  TextArea,
  Input,
  Grid,
  IconButton,
  PrimaryText,
} from '@/components';
import { QuestionForDb, displayOrderMap } from '@/types';
import { FaTrashCan, FaPlus } from 'react-icons/fa6';
import { useAppContext } from '@/contexts/AppContext';

interface AddUpdateQuestionProps {
  questionFromParent: QuestionForDb;
  // eslint-disable-next-line no-unused-vars
  setError: (error: string | null) => void;
}

const getAnswerLetter = (displayOrder: number): string => {
  return displayOrderMap[displayOrder as keyof typeof displayOrderMap] || '';
};

const AddUpdateQuestion: React.FC<AddUpdateQuestionProps> = ({
  questionFromParent,
  setError,
}) => {
  const { t, handleUpdateQuestionData, handleDeleteQuestion, questions } =
    useAppContext();

  const handleQuestionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setError(null);
    handleUpdateQuestionData({
      ...questionFromParent,
      question: e.target.value,
    });
  };

  const handleAnswerChange = (displayOrder: number, value: string) => {
    setError(null);
    handleUpdateQuestionData({
      ...questionFromParent,
      answers: questionFromParent.answers.map((a) =>
        a.displayOrder === displayOrder ? { ...a, answerText: value } : a
      ),
    });
  };

  const handleCorrectAnswerChange = (selectedDisplayOrder: number) => {
    setError(null);
    handleUpdateQuestionData({
      ...questionFromParent,
      answers: questionFromParent.answers.map((a) => ({
        ...a,
        isCorrect: a.displayOrder === selectedDisplayOrder,
      })),
      correctAnswer: getAnswerLetter(selectedDisplayOrder),
    });
  };

  const handleAddAnswer = () => {
    handleUpdateQuestionData({
      ...questionFromParent,
      answers: [
        ...questionFromParent.answers,
        {
          displayOrder: questionFromParent.answers.length,
          answerText: '',
          isCorrect: false,
        },
      ],
    });
  };

  const handleDeleteAnswer = (displayOrder: number) => {
    if (questionFromParent.answers.length > 1) {
      handleUpdateQuestionData({
        ...questionFromParent,
        answers: questionFromParent.answers
          .filter((a) => a.displayOrder !== displayOrder)
          .map((a, index) => ({ ...a, displayOrder: index })),
      });
    }
  };

  const handleTimeLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const value = e.target.value;
    const parsedValue = parseInt(value);
    handleUpdateQuestionData({
      ...questionFromParent,
      timeLimit: isNaN(parsedValue) ? 0 : parsedValue,
    });
  };

  return (
    <Column
      className='w-full gap-4 bg-offWhite p-4 rounded-lg relative'
      align='start'
    >
      <PrimaryText>{`${t('Question')}: ${
        questionFromParent.displayOrder + 1
      }`}</PrimaryText>
      <TextArea
        label={t('Enter question')}
        value={questionFromParent.question}
        onChange={handleQuestionChange}
        placeholder={t('Enter question')}
      />
      <PrimaryText className='-mb-4 mt-2'>
        {t('Add answers and select the correct one')}
      </PrimaryText>
      <Grid min='200px' gapSize='1rem' className='w-full'>
        {questionFromParent.answers.map((answer) => (
          <div key={answer.displayOrder} className='flex items-center'>
            <input
              type='radio'
              name={`correctAnswer-${questionFromParent.displayOrder}`}
              value={answer.displayOrder}
              className='flex-shrink-0 mr-2 accent-primary'
              checked={answer.isCorrect}
              onChange={() => handleCorrectAnswerChange(answer.displayOrder)}
            />
            <Input
              placeholder={`${t('Answer')} ${getAnswerLetter(
                answer.displayOrder
              )}`}
              className='w-full'
              value={answer.answerText}
              onChange={(e) =>
                handleAnswerChange(answer.displayOrder, e.target.value)
              }
            />
            {answer.displayOrder + 1 === questionFromParent.answers.length ? (
              <Column className='gap-0'>
                <IconButton
                  Icon={FaPlus}
                  onClick={handleAddAnswer}
                  title={t('Add answer')}
                  className='cursor-pointer text-foreground'
                  size={16}
                  disabled={questionFromParent.answers.length >= 10}
                />
                <IconButton
                  Icon={FaTrashCan}
                  onClick={() => handleDeleteAnswer(answer.displayOrder)}
                  title={t('Delete answer')}
                  className='text-red'
                  size={16}
                  disabled={questionFromParent.answers.length <= 1}
                />
              </Column>
            ) : (
              <IconButton
                Icon={FaTrashCan}
                onClick={() => handleDeleteAnswer(answer.displayOrder)}
                title={t('Delete answer')}
                className='text-red'
                size={16}
                disabled={questionFromParent.answers.length <= 1}
              />
            )}
          </div>
        ))}
      </Grid>
      <Row justify='end' className='w-full mt-4 mb-4'>
        <Input
          style={{ width: 150 }}
          label={t('Time Limit in seconds')}
          type='number'
          name='questionTime'
          value={questionFromParent.timeLimit || ''}
          onChange={handleTimeLimitChange}
          min={1}
          max={60}
        />
      </Row>
      <Row className='w-full gap-2' justify='end'>
        <IconButton
          Icon={FaTrashCan}
          onClick={() => handleDeleteQuestion(questionFromParent.displayOrder)}
          disabled={questions?.length < 2}
          title={t('Delete question')}
          className='text-red'
          size={20}
        />
      </Row>
    </Column>
  );
};

export default AddUpdateQuestion;
