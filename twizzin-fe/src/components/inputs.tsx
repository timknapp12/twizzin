import { Label } from './texts';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}

export const Input: React.FC<InputProps> = ({
  className,
  style,
  label,
  id,
  ...props
}) => {
  return (
    <div className='w-full' style={style}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <input
        id={id}
        className={`w-full px-4 py-2 border border-lightPurple rounded-md focus:outline-none focus:ring-2 focus:ring-darkPurple focus:border-transparent bg-light-background dark:bg-dark-background ${
          className || ''
        }`}
        {...props}
      />
    </div>
  );
};

interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  className,
  style,
  label,
  id,
  ...props
}) => {
  return (
    <div className='flex flex-col w-full'>
      {label && <Label htmlFor={id}>{label}</Label>}
      <textarea
        id={id}
        className={`w-full px-4 py-2 border border-lightPurple rounded-md focus:outline-none focus:ring-2 focus:ring-darkPurple focus:border-transparent bg-light-background dark:bg-dark-background resize-y ${
          className || ''
        }`}
        style={style}
        {...props}
      />
    </div>
  );
};
