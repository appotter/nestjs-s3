import { FactoryProvider, ModuleMetadata } from '@nestjs/common';
import S3, { Body, ManagedUpload, ObjectCannedACL } from 'aws-sdk/clients/s3';

export type Options = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  acl?: ObjectCannedACL;
  endpoint?: string;
};
export type OptionsAsync = {
  useFactory: (...args: any[]) => Options | Promise<Options>;
} & Pick<ModuleMetadata, 'imports'> &
  Pick<FactoryProvider, 'inject'>;

export type UploadedFile = Express.Multer.File;
export type UploadedResponse = {
  url: string;
  origin: ManagedUpload.SendData;
};
export type DeletedResponse = {
  status: boolean;
  origin: S3.Types.DeleteObjectOutput;
};
export type Item = {
  key: string;
  size: number;
  lastModified: Date;
  bucket: string;
};
export type ListedResponse = Item[];
export type GotResponse = {
  key: string;
  contentLength: number;
  contentType: string;
  body: Body;
};
