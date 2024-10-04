import { useAppContext } from '@/contexts/AppContext';
import {
  Column,
  Input,
  Grid,
  Label,
  Row,
  LabelSecondary,
  IconButton,
} from '@/components';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import QuestionGroup from './questionGroup';
import { FaPlus } from 'react-icons/fa6';
import { useTranslation } from 'react-i18next';

const CreateGame = () => {
  const { gameData, handleGameData, questions, handleAddBlankQuestion } =
    useAppContext();
  const { t } = useTranslation();

  const handleDateChange = (date: Date | null) => {
    if (date) {
      handleGameData({
        target: { name: 'startTime', value: date.toISOString() },
      } as React.ChangeEvent<HTMLInputElement>);
    }
  };

  const totalTime = questions.reduce(
    (acc, question) => acc + question.timeLimit,
    0
  );
  return (
    <Column className='w-full h-full flex-grow gap-12' justify='between'>
      <Column className='w-full gap-4'>
        <p className='text-2xl font-bold'>{t('Create a Twizzin game')}</p>
        <Grid min='400px' gapSize='1rem' className='w-full p-4'>
          <Input
            type='text'
            name='gameName'
            value={gameData.gameName}
            onChange={handleGameData}
            placeholder={t('Game Title')}
            label={t('Game Title')}
          />
          <Input
            type='number'
            name='entryFee'
            value={gameData.entryFee}
            onChange={handleGameData}
            placeholder={`${t('Entry Fee')} (SOL)`}
            label={`${t('Entry Fee')} (SOL)`}
          />
          <Input
            type='number'
            name='commission'
            value={gameData.commission}
            onChange={handleGameData}
            placeholder={t('Commission in %')}
            label={t('Commission in %')}
          />
          <Input
            type='number'
            name='donation'
            value={gameData.donation}
            onChange={handleGameData}
            placeholder={t('Admin donation to the pool')}
            label={`${t('Admin donation to the pool')} (SOL)`}
          />
          <Input
            type='number'
            name='maxWinners'
            value={gameData.maxWinners}
            onChange={handleGameData}
            placeholder={t('Number of Max Winners')}
            label={`${t('Number of Max Winners')} (1-10)`}
            max={10}
            min={1}
          />
          <Column className='w-full' align='start'>
            <Label>{t('Game start time')}</Label>
            <div className='w-full'>
              <DatePicker
                name='startTime'
                selected={gameData.startTime}
                onChange={handleDateChange}
                showTimeSelect
                className='w-full min-w-[200px] px-4 py-2 border border-lightPurple rounded-md focus:outline-none focus:ring-2 focus:ring-darkPurple focus:border-transparent bg-light-background dark:bg-dark-background'
                placeholderText='Select date and time'
                dateFormat='Pp'
                wrapperClassName='w-full'
              />
            </div>
          </Column>
        </Grid>

        <div className='h-4' />
        <Row justify='end' className='w-full pr-4'>
          <Label className='mr-2'>{`${t(
            'Total game time in seconds'
          )}:`}</Label>
          <LabelSecondary>{totalTime}</LabelSecondary>
        </Row>
        <Column className='w-full gap-6'>
          {questions
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((question) => (
              <QuestionGroup
                key={question.displayOrder}
                questionFromParent={question}
              />
            ))}
        </Column>
      </Column>
      <Row className='w-full p-4' justify='end'>
        <IconButton
          Icon={FaPlus}
          onClick={handleAddBlankQuestion}
          title={t('Add question')}
          className='cursor-pointer text-blue'
          size={32}
        />
      </Row>
    </Column>
  );
};

export default CreateGame;
