import { Column, Row, TextArea, Input } from '@/components';
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
      <Row className='gap-4'>
        {answers.map((answer, index) => (
          <Row key={index} className='items-center gap-2'>
            <input type='radio' name='correctAnswer' value={index} />
            <Input placeholder={`${t('Answer')}: ${answer}`} />
          </Row>
        ))}
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
