import { useAppContext } from '@/contexts/AppContext';
import { Column, Input, Row } from '@/components';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import QuestionGroup from './questionGroup';
import { FaPlus } from 'react-icons/fa6';

const CreateGame = () => {
  const { gameTitle, setGameTitle, gameTime, setGameTime } = useAppContext();

  const handleDateChange = (date: Date | null) => {
    setGameTime(date);
  };

  return (
    <Column className='w-full h-full flex-grow gap-12' justify='between'>
      <Column className='w-full gap-4'>
        <p className='text-2xl font-bold'>Create a Twizzin game</p>
        <Row className='w-full gap-4'>
          <Input
            style={{ width: '48%' }}
            type='text'
            value={gameTitle}
            onChange={(e: { target: { value: string } }) =>
              setGameTitle(e.target.value)
            }
            placeholder='Game Title'
            label='Game Title'
          />
          <Input
            style={{ width: '48%' }}
            type='text'
            value={'0.1'}
            onChange={(e: { target: { value: string } }) =>
              setGameTitle(e.target.value)
            }
            placeholder='Commission in %'
            label='Entry Fee in SOL'
          />
          <Input
            style={{ width: '48%' }}
            type='text'
            value={'5'}
            onChange={(e: { target: { value: string } }) =>
              setGameTitle(e.target.value)
            }
            placeholder='Commission in %'
            label='Commission in %'
          />
          <Input
            style={{ width: '48%' }}
            type='text'
            value={'3'}
            onChange={(e: { target: { value: string } }) =>
              setGameTitle(e.target.value)
            }
            placeholder='Number of Max Winners'
            label='Number of Max Winners'
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
        <FaPlus className='cursor-pointer text-blue' size={28} />
      </Row>
    </Column>
  );
};

export default CreateGame;
