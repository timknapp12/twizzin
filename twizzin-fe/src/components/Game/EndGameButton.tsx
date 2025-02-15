import React, { useState, useEffect } from 'react';
import { Button, Label } from '@/components';
import { useGameContext, useAppContext } from '@/contexts';
import { toast } from 'react-toastify';

const EndGameButton = () => {
  const { t } = useAppContext();
  const { handleEndGame, canEndGame, isAdmin, gameData } = useGameContext();
  const [isEndingGame, setIsEndingGame] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!gameData || !isAdmin) return;

    // allow 30 seconds for players to submit answers
    const updateTimeRemaining = () => {
      const now = Date.now();
      const endTime = new Date(gameData.end_time).getTime();
      const bufferTime = 30000;
      const remainingMs = endTime + bufferTime - now;

      if (remainingMs > 0) {
        setTimeRemaining(Math.ceil(remainingMs / 1000));
      } else {
        setTimeRemaining(null);
      }
    };

    const timer = setInterval(updateTimeRemaining, 1000);
    updateTimeRemaining();

    return () => clearInterval(timer);
  }, [gameData, isAdmin]);

  if (!isAdmin || !gameData || gameData.status !== 'active') return null;

  const onEndGame = async () => {
    setIsEndingGame(true);
    try {
      await handleEndGame();
      toast.success(t('Game ended successfully'));
    } catch (error: any) {
      toast.error(error.message || t('Failed to end game'));
    } finally {
      setIsEndingGame(false);
    }
  };

  return (
    <div className='flex flex-col items-center gap-2'>
      <Button
        onClick={onEndGame}
        disabled={!canEndGame || isEndingGame}
        isLoading={isEndingGame}
      >
        {t('End Game')}
      </Button>
      <Label>{t('Give time for players to submit answers')}</Label>
      {timeRemaining !== null && (
        <p className='text-sm text-gray-500'>
          {`${t('Time remaining')}: ${timeRemaining}`}
        </p>
      )}
    </div>
  );
};

export default EndGameButton;
