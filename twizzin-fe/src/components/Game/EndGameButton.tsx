import React, { useState } from 'react';
import { Button, Label } from '@/components';
import { useGameContext, useAppContext } from '@/contexts';
import { toast } from 'react-toastify';

const EndGameButton = ({
  goToResults,
  bufferTimeRemaining,
}: {
  goToResults: () => void;
  bufferTimeRemaining: string;
}) => {
  const { t } = useAppContext();
  const { handleEndGame, canEndGame, isAdmin, gameData, gameState } = useGameContext();
  const [isEndingGame, setIsEndingGame] = useState(false);

  // Don't show button if game is already ended or not active
  if (!isAdmin || !gameData || gameData.status !== 'active' || gameState === 'ENDED') return null;

  const onEndGame = async () => {
    setIsEndingGame(true);
    try {
      const result = await handleEndGame();
      // If result is null, it means game was already ended
      if (result === null) {
        toast.info(t('Game was already ended'));
      } else {
        toast.success(t('Game ended successfully'));
      }
      goToResults();
    } catch (error: any) {
      toast.error(error.message || t('Failed to end game'));
    } finally {
      setIsEndingGame(false);
    }
  };

  const errorColor = 'var(--color-error)';

  return (
    <div className='flex flex-col items-center gap-2'>
      <Button
        onClick={onEndGame}
        disabled={!canEndGame || isEndingGame}
        isLoading={isEndingGame}
      >
        {t('End Game')}
      </Button>
      {bufferTimeRemaining ? (
        <>
          <Label>{t('Give time for players to submit answers')}</Label>
          {bufferTimeRemaining !== null && (
            <p className='text-sm' style={{ color: errorColor }}>
              {bufferTimeRemaining === 'Time is up!'
                ? t('Time is up!')
                : `${t('Time remaining')}: ${bufferTimeRemaining}`}
            </p>
          )}
        </>
      ) : null}
    </div>
  );
};

export default EndGameButton;
