import { Row } from './containers';
import { Label } from './texts';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  style?: React.CSSProperties;
  label?: string;
  callout?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  className,
  style,
  label,
  id,
  callout,
  ...props
}) => {
  return (
    <div className='w-full' style={style}>
      <Row justify='between'>
        {label && <Label htmlFor={id}>{label}</Label>}
        {callout ? callout : null}
      </Row>
      <input
        id={id}
        className={`w-full px-4 py-1 border border-disabledText rounded-md focus:outline-none focus:ring-2 focus:ring-secondaryText focus:border-transparent ${
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
        className={`w-full px-4 py-1 border border-disabledText rounded-md focus:outline-none focus:ring-2 focus:ring-secondaryText focus:border-transparent resize-y ${
          className || ''
        }`}
        style={style}
        {...props}
      />
    </div>
  );
};

interface FileInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  className?: string;
  style?: React.CSSProperties;
  label?: string;
  callout?: React.ReactNode;
  accept?: string;
}

export const FileInput: React.FC<FileInputProps> = ({
  className,
  style,
  label,
  id,
  callout,
  accept,
  ...props
}) => {
  return (
    <div className='w-full' style={style}>
      <Row justify='between'>
        {label && <Label htmlFor={id}>{label}</Label>}
        {callout ? callout : null}
      </Row>
      <input
        type='file'
        id={id}
        accept={accept}
        className={`w-full px-4 py-1 border border-disabledText rounded-md focus:outline-none focus:ring-2 focus:ring-secondaryText focus:border-transparent file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-secondaryText file:text-white hover:file:bg-secondaryText/90 ${
          className || ''
        }`}
        {...props}
      />
    </div>
  );
};
