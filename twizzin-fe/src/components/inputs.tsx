/* eslint-disable no-unused-vars */
import { Row } from './containers';
import { Label } from './texts';
import { supabase } from '@/utils/supabase/supabaseClient';
import { processImageFile } from '@/utils/supabase/imageProcessing';

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
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'onError'
  > {
  className?: string;
  style?: React.CSSProperties;
  label?: string;
  callout?: React.ReactNode;
  accept?: string;
  onFileSelect?: (file: File) => void;
  onError?: (error: string) => void;
}

export const FileInput: React.FC<FileInputProps> = ({
  className,
  style,
  label,
  id,
  callout,
  // accept,
  onFileSelect,
  onError,
  ...props
}) => {
  const validateFile = (file: File): string | null => {
    // Size validation (1MB = 1024 * 1024 bytes)
    if (file.size > 1024 * 1024) {
      return 'File size must be less than 1MB';
    }

    // Type validation
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      return 'File must be a JPG, PNG, or WebP image';
    }

    return null; // no error
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const error = validateFile(file);
    if (error) {
      onError?.(error);
      e.target.value = ''; // Reset input
      return;
    }

    // Validate dimensions
    const img = new Image();
    const imageUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(imageUrl);
      if (img.width > 800 || img.height > 800) {
        onError?.('Image dimensions must be 800x800 pixels or smaller');
        e.target.value = ''; // Reset input
        return;
      }
      onFileSelect?.(file);
    };

    img.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      onError?.('Error reading image file');
      e.target.value = ''; // Reset input
    };

    img.src = imageUrl;
  };

  return (
    <div className='w-full' style={style}>
      <Row justify='between'>
        {label && <Label htmlFor={id}>{label}</Label>}
        {callout ? callout : null}
      </Row>
      <input
        type='file'
        id={id}
        accept='image/jpeg,image/png,image/webp'
        className={`w-full px-4 py-1 border border-disabledText rounded-md focus:outline-none focus:ring-2 focus:ring-secondaryText focus:border-transparent file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-secondaryText file:text-white hover:file:bg-secondaryText/90 ${
          className || ''
        }`}
        onChange={handleFileChange}
        {...props}
      />
    </div>
  );
};
