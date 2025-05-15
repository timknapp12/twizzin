import { useAppContext } from '../../contexts/AppContext';
import { Button } from '../buttons';

interface CurrencyModalProps {
  isOpen: boolean;
  onCloseMenus: () => void;
  className?: string;
}

export const CurrencyModal: React.FC<CurrencyModalProps> = ({
  isOpen,
  onCloseMenus,
  className,
}) => {
  const { t, currency, changeCurrency } = useAppContext();

  const handleCurrencyChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newCurrency = event.target.value;

    changeCurrency(newCurrency);
    onCloseMenus();
  };

  if (!isOpen) return null;

  return (
    <div className={`modal ${className || ''}`}>
      <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center'>
        <div className='bg-surface dark:bg-lightBlack p-8 rounded-lg w-3/4 max-w-md h-3/4 max-h-[400px] flex flex-col'>
          <h2 className='text-3xl font-bold mb-8 dark:text-white'>
            {t('Select Currency')}
          </h2>
          <select
            className='w-full px-4 py-2 border border-lightPurple rounded-md focus:outline-none focus:ring-2 focus:ring-darkPurple focus:border-transparent bg-light-background dark:bg-dark-background text-lg appearance-none'
            value={currency}
            onChange={handleCurrencyChange}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%238B5CF6' viewBox='0 0 24 24'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
              backgroundPosition: 'right 0.75rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.5em 1.5em',
              paddingRight: '2.5rem',
            }}
          >
            <option value='USD'>USD ($)</option>
            <option value='EUR'>EUR (€)</option>
            <option value='GBP'>GBP (£)</option>
          </select>
          <div className='mt-auto'>
            <Button onClick={onCloseMenus} className='text-lg py-2 px-6 w-full'>
              {t('Close')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
