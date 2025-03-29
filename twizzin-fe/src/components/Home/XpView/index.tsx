import {
  Column,
  IconButton,
  Label,
  PrimaryText,
  Row,
  Card,
} from '@/components';
import { XPCard } from '@/components/RewardsCards';
import { useAppContext } from '@/contexts';
import { FaArrowLeft } from 'react-icons/fa6';
import { formatSupabaseDateShort, XP_PER_PLAYER } from '@/utils';

interface XpViewProps {
  // eslint-disable-next-line no-unused-vars
  onSetView: (view: string) => void;
}

const XpView = ({ onSetView }: XpViewProps) => {
  const { t, userXP, level, nextLevelXP, progress, gameHistory } =
    useAppContext();

  const progressPercentage = progress ? Number(progress * 100) : 0;
  const primaryColor = 'var(--color-primaryText)';
  console.log('gameHistory', gameHistory);
  return (
    <Column className='gap-4 w-full h-full' align='start'>
      <Row onClick={() => onSetView('home')} className='cursor-pointer'>
        <IconButton
          title='Back'
          Icon={FaArrowLeft}
          onClick={() => onSetView('home')}
          className='text-gray active:text-black/10'
        />
        <PrimaryText style={{ fontSize: 16 }}>{t('Back')}</PrimaryText>
      </Row>
      <XPCard
        progressPercentage={progressPercentage}
        xp={userXP}
        onClick={() => {}}
        level={level}
      />
      <Row className='gap-2 w-full p-2' justify='between'>
        <Row className='gap-2'>
          <Label>{t('Total XP')}:</Label>
          <Label style={{ color: primaryColor }}>{userXP}</Label>
        </Row>
        <Row className='gap-2'>
          <Label>{t('Next level')}:</Label>
          <Label style={{ color: primaryColor }}>{nextLevelXP}</Label>
        </Row>
      </Row>
      <Column className='gap-2 w-full flex-1 overflow-y-auto' align='center'>
        {gameHistory && gameHistory.length > 0 ? (
          gameHistory.map((game) => (
            <Card key={game.gameId}>
              <Row className='gap-2 w-full' justify='between'>
                <Column align='start'>
                  <Label>{t('Game Title')}</Label>
                  <Label style={{ color: primaryColor }}>{game.gameName}</Label>
                </Column>
                {!game.isAdmin && (
                  <Column align='center'>
                    <Label>{t('Rank')}</Label>
                    <Label style={{ color: primaryColor }}>
                      {game.finalRank}
                    </Label>
                  </Column>
                )}
                <Column align='center'>
                  <Label>{t('Date')}</Label>
                  <Label style={{ color: primaryColor }}>
                    {formatSupabaseDateShort(game.gameDate)}
                  </Label>
                </Column>
                {!game.isAdmin ? (
                  <Column align='center'>
                    <Label>{t('Correct')}</Label>
                    <Label
                      style={{ color: primaryColor }}
                    >{`${game.questionsCorrect}/${game.totalQuestions}`}</Label>
                  </Column>
                ) : (
                  <Column align='center'>
                    <Label>{t('# of players of your game')}</Label>
                    <Label style={{ color: primaryColor }}>
                      {game.xpEarned / XP_PER_PLAYER}
                    </Label>
                  </Column>
                )}
                <Column align='end' className='rounded-full bg-tertiary p-4'>
                  <Label style={{ color: primaryColor, marginBottom: -2 }}>
                    {game.xpEarned}
                  </Label>
                </Column>
              </Row>
            </Card>
          ))
        ) : (
          <Label>{t('No game history')}</Label>
        )}
      </Column>
    </Column>
  );
};

export default XpView;
