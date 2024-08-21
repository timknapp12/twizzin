import Image from 'next/image';

interface TwizzinLogoProps {
  size?: number;
}

export const TwizzinLogo: React.FC<TwizzinLogoProps> = ({ size = 300 }) => {
  return (
    <Image
      src='/twizzin-laptop.png'
      alt='Twizzin Logo'
      width={size}
      height={size}
      priority
    />
  );
};
