import { Column, Row, TextArea, Input, Grid } from '@/components';
import { FaTrashCan } from 'react-icons/fa6';
import { useTranslation } from 'react-i18next';

const answers = ['A', 'B', 'C', 'D'];

const QuestionGroup = ({ index }: { index: number }) => {
  const { t } = useTranslation();
  return (
    <Column className='w-full gap-4 bg-offWhite dark:bg-lightBlack p-4 rounded-lg relative'>
      <TextArea label={`${t('Create Question')}: ${index + 1}`} />
      <p className='text-xl font-bold'>
        {t('Add 4 answers and select the correct one')}
      </p>
      <Grid gapSize='4' className='w-full'>
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
              className='w-full min-w-0 max-w-[200px]'
            />
          </div>
        ))}
      </Grid>
      <Row justify='end' className='w-full'>
        <Input
          style={{ width: 150 }}
          label={t('Time Limit in seconds')}
          type='number'
          name='questionTime'
          value={index}
        />
      </Row>
      <Row className='w-full' justify='end'>
        <FaTrashCan
          title={t('Delete question')}
          className='cursor-pointer text-red'
          size={20}
        />
      </Row>
    </Column>
  );
};

export default QuestionGroup;
