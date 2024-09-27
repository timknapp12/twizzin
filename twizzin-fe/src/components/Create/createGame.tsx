import { useAppContext } from '@/contexts/AppContext';
import { Column, Input, Row } from '@/components';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import QuestionGroup from './questionGroup';
import { FaPlus } from 'react-icons/fa6';
import { useTranslation } from 'react-i18next';

const CreateGame = () => {
  const { gameTitle, setGameTitle, gameTime, setGameTime } = useAppContext();

  const { t } = useTranslation();

  const handleDateChange = (date: Date | null) => {
    setGameTime(date);
  };

  return (
    <Column className='w-full h-full flex-grow gap-12' justify='between'>
      <Column className='w-full gap-4'>
        <p className='text-2xl font-bold'>{t('Create a Twizzin game')}</p>
        <Row className='w-full gap-4'>
          <Input
            style={{ width: '48%' }}
            type='text'
            value={gameTitle}
            onChange={(e: { target: { value: string } }) =>
              setGameTitle(e.target.value)
            }
            placeholder={t('Game Title')}
            label={t('Game Title')}
          />
          <Input
            style={{ width: '48%' }}
            type='text'
            value={''}
            onChange={(e: { target: { value: string } }) =>
              setGameTitle(e.target.value)
            }
            placeholder={t('Entry Fee in SOL')}
            label={t('Entry Fee in SOL')}
          />
          <Input
            style={{ width: '48%' }}
            type='text'
            value={''}
            onChange={(e: { target: { value: string } }) =>
              setGameTitle(e.target.value)
            }
            placeholder={t('Commission in %')}
            label={t('Commission in %')}
          />
          <Input
            style={{ width: '48%' }}
            type='text'
            value={''}
            onChange={(e: { target: { value: string } }) =>
              setGameTitle(e.target.value)
            }
            placeholder={t('Number of Max Winners')}
            label={t('Number of Max Winners')}
          />
          {/* <DatePicker
            selected={gameTime}
            onChange={handleDateChange}
            showTimeSelect
            className='w-full px-4 py-2 border border-lightPurple rounded-md focus:outline-none focus:ring-2 focus:ring-darkPurple focus:border-transparent bg-light-background dark:bg-dark-background'
            placeholderText='Select date and time'
            dateFormat='Pp'
          /> */}
        </Row>
        <div className='h-4' />
        <Column className='w-full gap-6'>
          <QuestionGroup index={0} />
          <QuestionGroup index={1} />
        </Column>
      </Column>
      <Row className='w-full p-4' justify='end'>
        <FaPlus
          title={t('Add question')}
          className='cursor-pointer text-blue'
          size={28}
        />
      </Row>
    </Column>
  );
};

export default CreateGame;
