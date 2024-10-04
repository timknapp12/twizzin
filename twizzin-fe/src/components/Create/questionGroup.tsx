import { useState, useEffect } from 'react';
import {
  Column,
  Row,
  TextArea,
  Input,
  Grid,
  IconButton,
  Label,
  LabelSecondary,
  H3,
  H3Secondary,
} from '@/components';
import { QuestionForDb, displayOrderMap } from '@/types';
import { FaTrashCan, FaCheck, FaPencil, FaPlus } from 'react-icons/fa6';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/AppContext';

const getAnswerLetter = (displayOrder: number): string => {
  return displayOrderMap[displayOrder as keyof typeof displayOrderMap] || '';
};

const QuestionGroup = ({
  questionFromParent,
}: {
  questionFromParent: QuestionForDb;
}) => {
  const { handleUpdateQuestionData, handleDeleteQuestion, questions } =
    useAppContext();
  const { t } = useTranslation();

  const [question, setQuestion] = useState<QuestionForDb>(questionFromParent);
  const [isEdit, setIsEdit] = useState(true);

  useEffect(() => {
    setQuestion(questionFromParent);
  }, [questionFromParent]);

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

  const handleSaveQuestion = () => {
    handleUpdateQuestionData(question);
    setIsEdit(false);
  };

  const handleEdit = () => {
    setIsEdit(true);
  };

  const isSaveDisabled =
    !question.question ||
    question.answers.some((answer) => answer.answerText.trim() === '') ||
    !question.answers.some((answer) => answer.isCorrect);

  const handleCorrectAnswerChange = (selectedDisplayOrder: number) => {
    setQuestion({
      ...question,
      answers: question.answers.map((a) => ({
        ...a,
        isCorrect: a.displayOrder === selectedDisplayOrder,
      })),
      correctAnswer: getAnswerLetter(selectedDisplayOrder),
    });
  };

  if (isEdit) {
    return (
      <Column
        className='w-full gap-4 bg-offWhite dark:bg-lightBlack p-4 rounded-lg relative'
        align='start'
      >
        <H3>{`${t('Edit Question')}: ${question.displayOrder + 1}`}</H3>
        <TextArea
          label={t('Enter question')}
          value={question.question}
          placeholder={t('Enter question')}
          onChange={(e) =>
            setQuestion({ ...question, question: e.target.value })
          }
        />
        <H3 className='-mb-4 mt-2'>
          {t('Add answers and select the correct one')}
        </H3>
        <Grid min='200px' gapSize='1rem' className='w-full'>
          {question.answers.map((answer) => (
            <div key={answer.displayOrder} className='flex items-center'>
              <input
                type='radio'
                name='correctAnswer'
                value={answer.displayOrder}
                className='flex-shrink-0 mr-2'
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
              {answer.displayOrder + 1 === question.answers.length ? (
                <Column className='gap-0'>
                  <IconButton
                    Icon={FaPlus}
                    onClick={handleAddAnswer}
                    title={t('Add answer')}
                    className='cursor-pointer text-white'
                    size={16}
                    disabled={question.answers.length >= 10}
                  />
                  <IconButton
                    Icon={FaTrashCan}
                    onClick={() => handleDeleteAnswer(answer.displayOrder)}
                    title={t('Delete answer')}
                    className='text-red'
                    size={16}
                    disabled={question.answers.length <= 1}
                  />
                </Column>
              ) : (
                <IconButton
                  Icon={FaTrashCan}
                  onClick={() => handleDeleteAnswer(answer.displayOrder)}
                  title={t('Delete answer')}
                  className='text-red'
                  size={16}
                  disabled={question.answers.length <= 1}
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
            Icon={FaTrashCan}
            onClick={() => handleDeleteQuestion(question.displayOrder)}
            disabled={questions?.length < 2}
            title={t('Delete question')}
            className='text-red'
            size={20}
          />
          <IconButton
            Icon={FaCheck}
            onClick={handleSaveQuestion}
            title={t('Save question')}
            className='text-green'
            size={20}
            disabled={isSaveDisabled}
          />
        </Row>
      </Column>
    );
  }

  return (
    <Column
      className='w-full gap-4 bg-offWhite dark:bg-lightBlack p-4 rounded-lg relative'
      align='start'
    >
      <Row>
        <H3 className='mr-2'>{`${t('Question')} ${
          question.displayOrder + 1
        }: `}</H3>
        <H3Secondary>{question.question}</H3Secondary>
      </Row>
      <H3>{t('Answers')}</H3>
      <Column className='w-full gap-2' align='start'>
        {question.answers
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((answer) => (
            <Row key={answer.displayOrder}>
              <Label className='mr-2'>{`${getAnswerLetter(
                answer.displayOrder
              )}:`}</Label>
              <LabelSecondary>{answer.answerText}</LabelSecondary>
            </Row>
          ))}
      </Column>
      <Row justify='end' className='w-full mt-4 mb-4'>
        <p>{`${t('Time Limit')}: ${question.timeLimit} ${t('seconds')}`}</p>
      </Row>
      <Row className='w-full gap-2' justify='end'>
        <IconButton
          Icon={FaTrashCan}
          onClick={() => handleDeleteQuestion(question.displayOrder)}
          disabled={questions?.length < 2}
          title={t('Delete question')}
          className='text-red'
          size={20}
        />
        <IconButton
          Icon={FaPencil}
          onClick={handleEdit}
          title={t('Edit question')}
          className='text-white'
          size={20}
        />
      </Row>
    </Column>
  );
};

export default QuestionGroup;
