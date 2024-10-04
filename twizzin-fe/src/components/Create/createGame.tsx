import { useAppContext } from '@/contexts/AppContext';
import { Column, Input, Row, Label } from '@/components';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import QuestionGroup from './questionGroup';
import { FaPlus } from 'react-icons/fa6';
import { useTranslation } from 'react-i18next';

const CreateGame = () => {
  const { gameData, handleGameData } = useAppContext();
  const { t } = useTranslation();

  const handleDateChange = (date: Date | null) => {
    if (date) {
      handleGameData({
        target: { name: 'startTime', value: date.toISOString() },
      } as React.ChangeEvent<HTMLInputElement>);
    }
  };

  return (
    <Column className='w-full h-full flex-grow gap-12' justify='between'>
      <Column className='w-full gap-4'>
        <p className='text-2xl font-bold'>{t('Create a Twizzin game')}</p>
        <Row className='w-full gap-4'>
          <Input
            style={{ width: '30%' }}
            type='text'
            name='gameName'
            value={gameData.gameName}
            onChange={handleGameData}
            placeholder={t('Game Title')}
            label={t('Game Title')}
          />
          <Input
            style={{ width: '30%' }}
            type='number'
            name='entryFee'
            value={gameData.entryFee}
            onChange={handleGameData}
            placeholder={t('Entry Fee in SOL')}
            label={t('Entry Fee in SOL')}
          />
          <Input
            style={{ width: '30%' }}
            type='number'
            name='commission'
            value={gameData.commission}
            onChange={handleGameData}
            placeholder={t('Commission in %')}
            label={t('Commission in %')}
          />
          <Input
            style={{ width: '30%' }}
            type='number'
            name='donation'
            value={gameData.donation}
            onChange={handleGameData}
            placeholder={t('Admin donation to the pool')}
            label={`${t('Admin donation to the pool')} (SOL)`}
          />
          <Input
            style={{ width: '30%' }}
            type='number'
            name='maxWinners'
            value={gameData.maxWinners}
            onChange={handleGameData}
            placeholder={t('Number of Max Winners')}
            label={`${t('Number of Max Winners')} (1-10)`}
            max={10}
            min={1}
          />
          <Column align='start' style={{ width: '30%' }}>
            <Label>{t('Game start time')}</Label>
            <DatePicker
              name='startTime'
              selected={gameData.startTime}
              onChange={handleDateChange}
              showTimeSelect
              className='w-full px-4 py-2 border border-lightPurple rounded-md focus:outline-none focus:ring-2 focus:ring-darkPurple focus:border-transparent bg-light-background dark:bg-dark-background'
              placeholderText='Select date and time'
              dateFormat='Pp'
            />
          </Column>
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
