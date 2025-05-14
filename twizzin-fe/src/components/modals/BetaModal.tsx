import { useAppContext } from '../../contexts/AppContext';
import { Button } from '../buttons';

interface BetaModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const BetaModal: React.FC<BetaModalProps> = ({
  isOpen,
  onClose,
  className,
}) => {
  const { t } = useAppContext();

  if (!isOpen) return null;

  return (
    <div className={`modal ${className || ''}`}>
      <div
        className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center'
        onClick={onClose}
      >
        <div
          className='bg-surface p-6 rounded-lg w-full max-w-md h-auto max-h-[600px] flex flex-col font-sans shadow-lg'
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className='text-2xl font-semibold mb-4 text-center'>
            {t('Beta Version Notice')}
          </h2>

          <p className='text-base mb-4 text-center'>
            {t('This is a beta version of Twizzin running on Solana devnet')}
          </p>

          <div className='mb-4'>
            <h3 className='text-lg font-semibold mb-2'>
              {t('To participate, you need to:')}
            </h3>
            <ul className='list-disc pl-5 space-y-1 text-base ml-4'>
              <li>{t('Connect a Solana wallet set to test mode (devnet)')}</li>
              <li>{t('Have SOL in your wallet to play')}</li>
            </ul>
          </div>

          <div className='mb-4'>
            <h3 className='text-lg font-semibold mb-1'>
              {t('Get devnet SOL')}
            </h3>
            <p className='mb-2 text-base'>
              {t('You can request devnet SOL from the Solana Faucet')}
            </p>
            <a
              href='https://faucet.solana.com/'
              target='_blank'
              rel='noopener noreferrer'
              className='text-lightPurple hover:text-darkPurple underline break-all text-base'
            >
              https://faucet.solana.com/
            </a>
          </div>

          <div className='mt-4'>
            <Button onClick={onClose} className='text-base py-2 px-6 w-full'>
              {t('Close')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
