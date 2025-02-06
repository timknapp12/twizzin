import Image from 'next/image';
import { Button, Column, Row, Label } from '@/components';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TbListDetails } from 'react-icons/tb';
import { useAppContext } from '@/contexts';
import { PartialGame } from '@/types';

const JoinGameDetails = ({
  partialGameData,
}: {
  partialGameData: PartialGame;
}) => {
  const { t } = useAppContext();

  const {
    id,
    game_code,
    name: game_name,
    entry_fee,
    commission_bps: commission,
    donation_amount,
    max_winners,
    start_time,
    end_time,
    question_count,
    all_are_winners,
    even_split,
    img_url,
  } = partialGameData || {};
  console.log('id', id ? id : 'no id');

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString();
  };

  const calculateTotalTime = (end_time: string, start_time: string) => {
    const diffInMilliseconds = Date.parse(end_time) - Date.parse(start_time);
    const diffInSeconds = Math.floor(diffInMilliseconds / 1000);
    return diffInSeconds;
  };

  const totalTime =
    end_time && start_time ? calculateTotalTime(end_time, start_time) : 0;

  const primaryColor = 'var(--color-primaryText)';
  return (
    <Column className='gap-4 w-full h-full flex-1' justify='between'>
      <div className='flex px-[10px] py-[6px] md:px-[14px] md:py-[10px] justify-center items-center self-stretch rounded-lg  bg-[#FBF9E9] gap-4 w-full max-w-small mx-auto  text-[16px] active:opacity-80'>
        <Row className='gap-2'>
          <TbListDetails size={28} color='var(--color-tertiary)' />
          <Label style={{ marginBottom: -4 }}>{t('Game Code')}:</Label>
          <Label style={{ color: primaryColor, marginBottom: -4 }}>
            {game_code}
          </Label>
        </Row>
      </div>
      {img_url && (
        <div className='relative w-full max-w-[200px] min-w-[120px] aspect-square mx-auto'>
          <Image
            src={img_url}
            alt='game image'
            fill
            className='object-contain'
            sizes='100vw'
            style={{ borderRadius: '10px' }}
          />
        </div>
      )}
      <Column className='gap-2 w-full p-4 bg-surface rounded-lg'>
        <Row className='gap-2'>
          <Label>{t('Game Title')}:</Label>
          <Label style={{ color: primaryColor }}>{game_name}</Label>
        </Row>
        <Row className='gap-2'>
          <Label>{t('Entry Fee')}:</Label>
          <Label style={{ color: primaryColor }}>
            {entry_fee ? entry_fee / LAMPORTS_PER_SOL : '-'} SOL
          </Label>
        </Row>
        <Row className='gap-2'>
          <Label>{t('Commission to game host')}:</Label>
          <Label style={{ color: primaryColor }}>
            {commission ? commission / 100 : '0 '}%
          </Label>
        </Row>
        <Row className='gap-2'>
          <Label>{t('Admin donation to the pool')}:</Label>
          <Label style={{ color: primaryColor }}>
            {donation_amount ? donation_amount / LAMPORTS_PER_SOL : '0 '}
            SOL
          </Label>
        </Row>
        <Row className='gap-2'>
          <Label>{t('Maximum number of winners')}:</Label>
          <Label style={{ color: primaryColor }}>
            {all_are_winners ? 'All' : max_winners}
          </Label>
        </Row>
        <Row className='gap-2'>
          <Label>{t('Game start time')}:</Label>
          <Label style={{ color: primaryColor }}>
            {start_time ? formatDate(start_time) : '-'}
          </Label>
        </Row>
        <Row className='gap-2'>
          <Label>{t('Number of questions')}:</Label>
          <Label style={{ color: primaryColor }}>{question_count}</Label>
        </Row>
        <Row className='gap-2'>
          <Label>{t('Total game time in seconds')}:</Label>
          <Label style={{ color: primaryColor }}>{totalTime}</Label>
        </Row>
        <Row className='gap-2'>
          <Label>{t('Split')}:</Label>
          <Label style={{ color: primaryColor }}>
            {even_split ? 'Evenly split among all winners' : 'Tiered'}
          </Label>
        </Row>
      </Column>
      <Button>{t('Join game')}</Button>
    </Column>
  );
};

export default JoinGameDetails;
