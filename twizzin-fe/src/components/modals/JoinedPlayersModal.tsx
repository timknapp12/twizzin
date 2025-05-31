import { useAppContext } from '../../contexts/AppContext';
import { useGameContext } from '../../contexts/GameContext';
import { GamePlayer } from '@/utils';
import { RiCloseFill } from 'react-icons/ri';
import { useWallet } from '@solana/wallet-adapter-react';

interface JoinedPlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const JoinedPlayersModal: React.FC<JoinedPlayersModalProps> = ({
  isOpen,
  onClose,
  className,
}) => {
  const { t } = useAppContext();
  const { currentPlayers } = useGameContext();
  const { publicKey } = useWallet();

  if (!isOpen) return null;

  return (
    <div className={`modal ${className || ''}`}>
      <div
        className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center'
        onClick={onClose}
      >
        <div
          className='bg-surface p-6 rounded-lg w-full max-w-md h-auto max-h-[600px] flex flex-col font-sans shadow-lg relative'
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className='absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors'
          >
            <RiCloseFill size={24} />
          </button>

          <h2 className='text-2xl font-semibold mb-4 text-center'>
            {`${t('Joined Players')} (${currentPlayers.length})`}
          </h2>

          <div className='flex-1 overflow-y-auto'>
            {currentPlayers.length === 0 ? (
              <p className='text-base text-center text-gray-500'>
                {t('No players have joined yet')}
              </p>
            ) : (
              <div className='space-y-3'>
                {currentPlayers.map((player: GamePlayer) => (
                  <div
                    key={player.id}
                    className='flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100'
                  >
                    <div className='w-10 h-10 rounded-full bg-lightPurple flex items-center justify-center text-white font-semibold mr-2'>
                      {player.username.charAt(0)}
                    </div>
                    <div className='flex-1'>
                      <p className='text-base font-medium'>
                        {player.username}
                        {publicKey &&
                          player.wallet_address === publicKey.toString() && (
                            <span className='text-primary ml-1'>{`(${t(
                              'You'
                            )})`}</span>
                          )}
                      </p>
                      <p className='text-sm text-gray-500'>
                        {new Date(player.joined_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
