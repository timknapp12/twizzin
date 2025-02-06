import { Column } from '@/components';

const GameDetailsSkeleton = () => {
  return (
    <Column className='gap-12 w-full h-full flex-1' justify='start'>
      <div className='flex h-[60px] mt-4 justify-center items-center self-stretch rounded-lg bg-[#FBF9E9] gap-4 w-full max-w-small mx-auto text-[16px] active:opacity-80'></div>
      <div className='relative w-full max-w-[200px] min-w-[120px] aspect-square mx-auto'>
        <div className='bg-gray animate-pulse w-[200px] h-[200px] rounded-lg' />
      </div>
      <Column className='gap-2 w-full bg-surface rounded-lg'>
        <div className='h-[300px] w-full bg-gray animate-pulse rounded-lg' />
      </Column>
    </Column>
  );
};

export default GameDetailsSkeleton;
