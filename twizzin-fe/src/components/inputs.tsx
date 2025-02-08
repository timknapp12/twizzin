'use client';

/* eslint-disable no-unused-vars */
import { Row } from './containers';
import { Label } from './texts';
import { processImageFile } from '@/utils';
import { useState } from 'react';

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
  onFileSelect?: (file: File) => void;
  onError?: (error: string) => void;
  onUploadComplete?: (processedFile: File) => void;
  fileSizeError?: string;
  fileTypeError?: string;
}

export const FileInput: React.FC<FileInputProps> = ({
  className,
  style,
  label,
  id,
  callout,
  onFileSelect,
  onError,
  onUploadComplete,
  fileSizeError,
  fileTypeError,
  ...props
}) => {
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  const validateFile = (file: File) => {
    // Increase to 5MB (5 * 1024 * 1024 bytes)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;

    if (file.size > MAX_FILE_SIZE) {
      return fileSizeError;
    }

    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      return fileTypeError;
    }

    return null;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      onError?.(error);
      e.target.value = '';
      setSelectedFileName('');
      return;
    }

    try {
      // Call onFileSelect with the original file first
      onFileSelect?.(file);

      // Process the file
      const processedFile = await processImageFile(file);

      // Update UI
      setSelectedFileName(file.name);

      // Call onUploadComplete with the processed file
      if (processedFile) {
        onUploadComplete?.(processedFile);
        console.log('Processed file:', processedFile); // Debug log
      }
    } catch (error) {
      console.error('Error processing file:', error); // Debug log
      onError?.(
        error instanceof Error ? error.message : 'Error processing file'
      );
      e.target.value = '';
      setSelectedFileName('');
    }
  };

  return (
    <div className={className} style={style}>
      {label && (
        <Row className='gap-2 items-center w-full justify-between'>
          <Label>{label}</Label>
          {callout}
        </Row>
      )}
      <div className='relative w-full'>
        <input
          type='file'
          onChange={handleFileChange}
          className='w-full px-4 py-1 border border-disabledText rounded-md focus:outline-none focus:ring-2 focus:ring-secondaryText focus:border-transparent bg-light-background dark:bg-dark-background'
          accept='image/jpeg,image/png,image/webp'
          {...props}
        />
        {selectedFileName && (
          <div className='mt-2 text-sm text-gray-600'>
            Selected: {selectedFileName}
          </div>
        )}
      </div>
    </div>
  );
};

interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  className?: string;
  style?: React.CSSProperties;
  label?: string;
  callout?: React.ReactNode;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  className,
  style,
  label,
  id,
  callout,
  ...props
}) => {
  return (
    <div className='w-full' style={style}>
      <Row justify='between' className='items-center'>
        <div className='flex items-center gap-2'>
          <input
            type='checkbox'
            id={id}
            className={`w-4 h-4 border border-disabledText rounded focus:outline-none focus:border-transparent accent-primary ${
              className || ''
            }`}
            {...props}
          />
          {label && <Label htmlFor={id}>{label}</Label>}
        </div>
        {callout ? callout : null}
      </Row>
    </div>
  );
};
