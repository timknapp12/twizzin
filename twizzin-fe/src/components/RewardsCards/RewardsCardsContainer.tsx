interface RewardsCardsContainerProps {
  children: React.ReactNode;
  onClick?: () => void;
}

const RewardsCardsContainer = ({
  children,
  onClick,
}: RewardsCardsContainerProps) => {
  return (
    <div
      onClick={onClick}
      className='flex h-[70px] w-full p-[14px] justify-between items-center flex-1 rounded-[14px] bg-surface hover:bg-[#F5F5F7] cursor-pointer'
    >
      {children}
    </div>
  );
};

export default RewardsCardsContainer;
