import { useAppContext } from '@/contexts/AppContext';
import { Column, Input } from '@/components';

const CreateGame = () => {
  const { gameTitle, setGameTitle, gameTime, setGameTime } = useAppContext();
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
    </Column>
  );
};

export default CreateGame;
