import { useAppContext } from '@/contexts/AppContext';

export const ClaimButton = ({
  disabled = false,
  onClick,
}: {
  disabled?: boolean;
  onClick?: () => void;
}) => {
  const { t } = useAppContext();
  return (
    <button
      disabled={disabled}
      className={`inline-flex px-[14px] py-[10px] justify-center items-center gap-[10px] flex-shrink-0 rounded-[30px] ${
        disabled
          ? 'bg-disabled text-secondaryText'
          : 'bg-primary  text-white hover:bg-darkPurple'
      } shadow-[0px_1px_2px_0px_rgba(9,8,23,0.05)]`}
      onClick={onClick}
    >
      {disabled ? t('Claimed') : t('Claim')}
    </button>
  );
};
