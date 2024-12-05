const Dot = ({
  isSelected,
  onClick,
}: {
  isSelected: boolean;
  onClick: () => void;
}) => {
  return (
    <div
      className={`w-[10px] h-[10px] rounded-full ${
        isSelected ? 'bg-green' : 'bg-gray'
      }`}
      onClick={onClick}
    />
  );
};

export default Dot;
