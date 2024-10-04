import { useState } from 'react';
import { Column, Row, TextArea, Input, Grid } from '@/components';
import { QuestionForDb, displayOrderMap } from '@/types';
import {
  FaTrash,
  FaCheck,
  FaPencilAlt,
  FaSpinner,
  FaPlus,
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import IconButton from '@/components/IconButton';

const QuestionGroup = ({ displayOrder }: { displayOrder: number }) => {
  const [question, setQuestion] = useState<QuestionForDb>({
    displayOrder,
    question: '',
    answers: [{ displayOrder: 0, answerText: '', isCorrect: false }],
    correctAnswer: '',
    timeLimit: 10,
  });

  const { t } = useTranslation();

  const [isEdit, setIsEdit] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddAnswer = () =>
    setQuestion({
      ...question,
      answers: [
        ...question.answers,
        {
          displayOrder: question.answers.length,
          answerText: '',
          isCorrect: false,
        },
      ],
    });

  const handleDeleteAnswer = (displayOrder: number) => {
    if (question.answers.length > 1) {
      const index = question.answers.findIndex(
        (answer) => answer.displayOrder === displayOrder
      );
      if (index !== -1) {
        setQuestion({
          ...question,
          answers: [
            ...question.answers.slice(0, index),
            ...question.answers.slice(index + 1),
          ].map((answer, newIndex) => ({ ...answer, displayOrder: newIndex })),
        });
      }
    }
  };

  const handleDelete = () => {
    // Implement delete functionality here
    console.log('Delete question:', displayOrder);
  };

  const handleSave = () => {
    setIsEdit(false);
    setIsSaving(true);
    // Implement save functionality here
    console.log('Save question:', displayOrder);
  };

  const handleEdit = () => {
    setIsEdit(true);
  };

  const isSaveDisabled =
    isEdit && !question.question && question.answers.length < 4;

  if (isEdit) {
    return (
      <Column className='w-full gap-4 bg-offWhite dark:bg-lightBlack p-4 rounded-lg relative'>
        <TextArea
          label={`${t('Create Question')}: ${displayOrder + 1}`}
          value={question.question}
          onChange={(e) =>
            setQuestion({ ...question, question: e.target.value })
          }
        />
        <p className='text-xl font-bold'>
          {t('Add answers and select the correct one')}
        </p>
        <Grid min='200px' gapSize='1rem' className='w-full'>
          {question.answers.map((answer, index) => (
            <div key={answer.displayOrder} className='flex items-center gap-2'>
              <input
                type='radio'
                name='correctAnswer'
                value={answer.displayOrder}
                className='flex-shrink-0'
              />
              <Input
                placeholder={t('Answer')}
                className='w-full min-w-0'
                value={answer.answerText}
                onChange={(e) =>
                  setQuestion({
                    ...question,
                    answers: question.answers.map((a) =>
                      a.displayOrder === answer.displayOrder
                        ? { ...a, answerText: e.target.value }
                        : a
                    ),
                  })
                }
              />
              {index + 1 === question.answers.length && (
                <Column className='gap-0'>
                  <IconButton
                    Icon={FaPlus}
                    onClick={handleAddAnswer}
                    title={t('Add question')}
                    className='cursor-pointer text-white'
                    size={16}
                    disabled={question.answers.length >= 10}
                  />
                  <IconButton
                    Icon={FaTrash}
                    onClick={() => handleDeleteAnswer(answer.displayOrder)}
                    title={t('Delete answer')}
                    className='text-red'
                    size={16}
                    disabled={question.answers.length <= 1}
                  />
                </Column>
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
            value={question.timeLimit}
            onChange={(e) =>
              setQuestion({
                ...question,
                timeLimit: parseInt(e.target.value),
              })
            }
            min={1}
            max={60}
          />
        </Row>
        <Row className='w-full gap-2' justify='end'>
          <IconButton
            Icon={FaTrash}
            onClick={handleDelete}
            title={t('Delete question')}
            className='text-red'
            size={20}
          />
          <div className='w-8 h-8 flex items-center justify-center'>
            <IconButton
              Icon={FaCheck}
              onClick={handleSave}
              title={t('Save question')}
              className='text-green'
              size={20}
              disabled={isSaveDisabled}
            />
          </div>
        </Row>
      </Column>
    );
  }

  return (
    <Column className='w-full gap-4 bg-offWhite dark:bg-lightBlack p-4 rounded-lg relative'>
      <Row>
        <p className='font-bold mr-2'>{`${t('Question')} ${
          displayOrder + 1
        }: `}</p>
        <p>{question.question}</p>
      </Row>
      <p className='text-xl font-bold'>{t('Answers')}</p>
      <Grid min='200px' gapSize='1rem' className='w-full'>
        {question.answers.map((answer, index) => (
          <div key={answer.displayOrder} className='flex items-center gap-2'>
            <input
              type='radio'
              name='correctAnswer'
              value={answer.displayOrder}
              className='flex-shrink-0'
              disabled
            />
            <p>
              {answer.answerText ||
                `${t('Answer')}: ${
                  displayOrderMap[
                    answer.displayOrder as keyof typeof displayOrderMap
                  ] ?? ''
                }`}
            </p>
          </div>
        ))}
      </Grid>
      <Row justify='end' className='w-full mt-4 mb-4'>
        <p>{`${t('Time Limit')}: ${question.timeLimit} ${t('seconds')}`}</p>
      </Row>
      <Row className='w-full gap-2' justify='end'>
        <IconButton
          Icon={FaTrash}
          onClick={handleDelete}
          title={t('Delete question')}
          className='text-red'
          size={20}
        />
        <div className='w-8 h-8 flex items-center justify-center'>
          {isSaving ? (
            <FaSpinner className='text-blue animate-spin' size={20} />
          ) : (
            <IconButton
              Icon={FaPencilAlt}
              onClick={handleEdit}
              title={t('Edit question')}
              className='text-white'
              size={20}
            />
          )}
        </div>
      </Row>
    </Column>
  );
};

export default QuestionGroup;
