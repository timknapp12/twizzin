const RewardsCardsContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className='flex h-[70px] w-[180px] p-[14px] justify-between items-center flex-1 rounded-[14px] bg-[#F9F9FA] hover:bg-[#F5F5F7]'>
      {children}
    </div>
  );
};

export default RewardsCardsContainer;
