import imageCompression from 'browser-image-compression';

interface ImageProcessingOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
  maxIteration?: number;
}

const defaultOptions: ImageProcessingOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 800,
  useWebWorker: true,
  maxIteration: 4,
};

export async function processImageFile(
  file: File,
  customOptions?: Partial<ImageProcessingOptions>
) {
  try {
    const options = { ...defaultOptions, ...customOptions };

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}
