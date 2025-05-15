import Image from 'next/image';

interface LanguageIconButtonProps {
  imageSrc: string;
  alt?: string;
  disabled?: boolean;
  className?: string;
}

export const LanguageIconButton = ({
  imageSrc,
  alt = 'language',
  disabled = false,
  className,
}: LanguageIconButtonProps) => (
  <div
    className={`flex items-center bg-languageIcon ${
      !disabled ? 'hover:bg-languageIconHover cursor-pointer' : ''
    } rounded-lg transition-colors duration-200 ${className}`}
  >
    <div className='px-[10px] py-[6px]'>
      <Image src={imageSrc} alt={alt} width={24} height={24} />
    </div>
  </div>
);
