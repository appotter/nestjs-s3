export const trimLastSlash = (str: string | undefined): string => {
  if (typeof str === 'undefined') {
    return '';
  }

  return str.substring(str.length - 1) === '/'
    ? str.substring(0, str.length - 1)
    : str;
};

export const getFileName = (file: Express.Multer.File): string => {
  const index = file.originalname.lastIndexOf('.');

  return file.originalname.slice(0, index);
};

export const getFileExtension = (file: Express.Multer.File): string => {
  const index = file.originalname.lastIndexOf('.');

  return file.originalname.slice(index + 1);
};

export const hasExtension = (str: string | undefined): boolean => {
  if (typeof str === 'undefined') {
    return false;
  }

  return str.lastIndexOf('.') > 0 ? true : false;
};

export const getFileNameFromStr = (str: string | undefined): string => {
  if (typeof str === 'undefined') {
    return '';
  }

  if (!hasExtension(str)) {
    return str;
  }

  return str.slice(0, str.lastIndexOf('.'));
};

export const getFileExtensionFromStr = (str: string | undefined): string => {
  if (typeof str === 'undefined') {
    return '';
  }

  if (!hasExtension(str)) {
    return '';
  }

  return str.slice(str.lastIndexOf('.') + 1);
};
