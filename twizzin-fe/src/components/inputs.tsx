export const Input = ({ ...props }) => {
  return (
    <input
      className='w-full px-4 py-2 border border-lightPurple rounded-md focus:outline-none focus:ring-2 focus:ring-darkPurple focus:border-transparent bg-light-background dark:bg-dark-background'
      {...props}
    />
  );
};
