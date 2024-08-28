import { useAppContext } from '@/contexts/AppContext';
import { Column, Input } from '@/components';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const CreateGame = () => {
  const { gameTitle, setGameTitle, gameTime, setGameTime } = useAppContext();

  const handleDateChange = (date: Date | null) => {
    setGameTime(date);
  };

  const handleDateSelect = (date: Date) => {
    setGameTime(date);
  };

  return (
    <Column className='w-full gap-4'>
      <p className='text-2xl font-bold'>Create a Twizzin game</p>
      <Input
        type='text'
        value={gameTitle}
        onChange={(e: { target: { value: string } }) =>
          setGameTitle(e.target.value)
        }
        placeholder='Game Title'
      />
      <DatePicker
        selected={gameTime}
        onChange={handleDateChange}
        onSelect={handleDateSelect}
        showTimeSelect
      />
    </Column>
  );
};

export default CreateGame;
