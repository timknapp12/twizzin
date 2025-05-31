import { Column } from '@/components/containers';
import { Card } from '@/components/containers';
import { useGameContext } from '@/contexts/GameContext';
import { useAppContext } from '@/contexts';
import { useEffect, useState } from 'react';
import { fetchPlayerData } from '@/utils/supabase/fetchGamePlayers';
import { GamePlayer } from '@/utils';

interface PlayerWithDetails extends GamePlayer {
  xp?: number;
}

const PlayersList = ({ gameCode }: { gameCode: string }) => {
  const { t } = useAppContext();
  const { currentPlayers } = useGameContext();
  const [playersWithDetails, setPlayersWithDetails] = useState<
    PlayerWithDetails[]
  >([]);

  useEffect(() => {
    const fetchPlayerDetails = async () => {
      const players = await Promise.all(
        currentPlayers.map(async (player) => {
          const details = await fetchPlayerData(
            gameCode,
            player.wallet_address
          );
          return {
            ...player,
            xp: details?.xp,
            level: details?.level,
          };
        })
      );
      setPlayersWithDetails(players);
    };

    if (currentPlayers.length > 0) {
      fetchPlayerDetails();
    }
  }, [currentPlayers, gameCode]);

  return (
    <Column className='w-full p-4'>
      <h2 className='text-xl font-semibold mb-4'>{t('Players')}</h2>
      {currentPlayers.length === 0 ? (
        <div className='text-center text-gray-500'>
          {t('No players have joined yet')}
        </div>
      ) : (
        <div className='space-y-3'>
          {playersWithDetails.map((player) => (
            <Card key={player.id}>
              <div className='flex items-center w-full'>
                <div className='w-12 h-12 rounded-full bg-lightPurple flex items-center justify-center text-white font-semibold text-lg mr-4'>
                  {player.username.charAt(0)}
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center justify-between'>
                    <span className='truncate font-medium text-base'>
                      {player.username}
                    </span>

                    <span className='text-sm font-bold text-primary'>
                      {player.xp ?? 0} XP
                    </span>
                  </div>
                  <div className='flex items-center justify-between mt-1'>
                    <span className='text-sm text-gray-500 truncate'>
                      {new Date(player.joined_at).toLocaleString()}
                    </span>
                    <span className='text-xs text-gray-400 ml-2'>
                      {player.wallet_address.slice(0, 4)}...
                      {player.wallet_address.slice(-4)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Column>
  );
};

export default PlayersList;
