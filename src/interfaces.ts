import {
  CompleteMultipartUploadCommandOutput,
  DeleteObjectCommandOutput,
  ObjectCannedACL,
} from '@aws-sdk/client-s3';
import { FactoryProvider, ModuleMetadata } from '@nestjs/common';

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

export type ObjectAcl = ObjectCannedACL;

export type UploadedFile = Express.Multer.File;

export type UploadedResponse = {
  url: string;
  origin: CompleteMultipartUploadCommandOutput;
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
  body: Buffer;
};

export type DeletedResponse = {
  status: boolean;
  origin: DeleteObjectCommandOutput;
};
