import { useState } from 'react';
import { Column, Row, TextArea, Input, Grid } from '@/components';
import { QuestionForDb } from '@/types';
import { FaTrash, FaCheck, FaPencilAlt, FaSpinner } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import IconButton from '@/components/IconButton';

const answers = ['A', 'B', 'C', 'D'];

const QuestionGroup = ({ displayOrder }: { displayOrder: number }) => {
  const [question, setQuestion] = useState<QuestionForDb>({
    displayOrder,
    question: '',
    answers: [],
    correctAnswer: '',
    timeLimit: 10,
  });

  const { t } = useTranslation();

  const [isEdit, setIsEdit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  return (
    <Column className='w-full gap-4 bg-offWhite dark:bg-lightBlack p-4 rounded-lg relative'>
      <TextArea
        label={`${t('Create Question')}: ${displayOrder + 1}`}
        value={question.question}
        onChange={(e) => setQuestion({ ...question, question: e.target.value })}
      />
      <p className='text-xl font-bold'>
        {t('Add 4 answers and select the correct one')}
      </p>
      <Grid min='200px' gapSize='1rem' className='w-full'>
        {answers.map((answer, index) => (
          <div key={index} className='flex items-center gap-2'>
            <input
              type='radio'
              name='correctAnswer'
              value={index}
              className='flex-shrink-0'
            />
            <Input
              placeholder={`${t('Answer')}: ${answer}`}
              className='w-full min-w-0'
              value={question.answers[index]}
              onChange={(e) =>
                setQuestion({
                  ...question,
                  answers: question.answers.map((answer, i) =>
                    i === index ? e.target.value : answer
                  ),
                })
              }
            />
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
          {isEdit ? (
            <IconButton
              Icon={FaCheck}
              onClick={handleSave}
              title={t('Save question')}
              className='text-green'
              size={20}
            />
          ) : isSaving ? (
            <FaSpinner className='text-gray animate-spin' size={20} />
          ) : (
            <IconButton
              Icon={FaPencilAlt}
              onClick={handleEdit}
              title={t('Edit question')}
              className='text-blue'
              size={20}
            />
          )}
        </div>
      </Row>
    </Column>
  );
};

export default QuestionGroup;
