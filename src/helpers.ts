import { UploadedFile } from './interfaces';

export const trimLastSlash = (str: string | undefined): string => {
  if (typeof str === 'undefined') {
    return '';
  }

  return str.endsWith('/') ? str.substring(0, str.length - 1) : str;
};

export const getFileExtension = (file: UploadedFile): string => {
  const index = file.originalname.lastIndexOf('.');

  return file.originalname.slice(index + 1);
};

export const hasExtension = (str: string): boolean => {
  if (str.length === 0) {
    return false;
  }

  return str.lastIndexOf('.') > 0;
};
