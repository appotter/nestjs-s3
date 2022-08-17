import { Inject, Injectable } from '@nestjs/common';
import { S3_CONFIGURATION } from './constants';
import {
  DeletedResponse,
  Item,
  ListedResponse,
  Options,
  GotResponse,
  UploadedFile,
  UploadedResponse,
} from './interfaces';
import S3, {
  DeleteObjectRequest,
  GetObjectRequest,
  ListObjectsRequest,
  ManagedUpload,
  ObjectCannedACL,
  ObjectKey,
  PutObjectRequest,
} from 'aws-sdk/clients/s3';
import { hasExtension, trimLastSlash, getFileExtension } from './helpers';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private readonly client: S3;
  private bucket: string;
  private acl: ObjectCannedACL;

  constructor(@Inject(S3_CONFIGURATION) private config: Options) {
    const { accessKeyId, secretAccessKey, region, bucket, acl } = config;

    this.client = new S3({ accessKeyId, secretAccessKey, region });
    this.bucket = bucket;
    this.acl = acl ?? 'public-read';
  }

  public getClient(): S3 {
    return this.client;
  }

  public async put(
    file: UploadedFile,
    path?: string,
  ): Promise<UploadedResponse> {
    path = trimLastSlash(path);

    const objectPayload: PutObjectRequest = {
      Bucket: this.bucket,
      ACL: this.acl,
      Body: file.buffer,
      Key: hasExtension(path) ? path : `${path}/${file.originalname}`,
    };

    return await this.upload(objectPayload);
  }

  public async putAsUniqueName(
    file: UploadedFile,
    folder?: string,
  ): Promise<UploadedResponse> {
    folder = trimLastSlash(folder);
    const fileName = `${uuidv4()}.${getFileExtension(file)}`;

    const objectPayload: PutObjectRequest = {
      Bucket: this.bucket,
      ACL: this.acl,
      Body: file.buffer,
      Key: folder ? `${folder}/${fileName}` : fileName,
    };

    return await this.upload(objectPayload);
  }

  private async upload(
    objectPayload: PutObjectRequest,
  ): Promise<UploadedResponse> {
    return await this.client
      .upload(objectPayload)
      .promise()
      .then<UploadedResponse>((data: ManagedUpload.SendData) => {
        return { url: data.Location, origin: data };
      })
      .catch((error) => {
        console.log('There was an error uploading your file: ', error.message);

        throw error;
      });
  }

  public async delete(key: ObjectKey): Promise<DeletedResponse> {
    const objectPayload: DeleteObjectRequest = {
      Bucket: this.bucket,
      Key: key,
    };

    return await this.client
      .deleteObject(objectPayload)
      .promise()
      .then<DeletedResponse>((data: S3.Types.DeleteObjectOutput) => {
        return { status: true, origin: data };
      })
      .catch((error) => {
        console.log('There was an error deleting your file: ', error.message);

        throw error;
      });
  }

  public async lists(folder?: string): Promise<ListedResponse> {
    folder = trimLastSlash(folder);

    const objectParams: ListObjectsRequest = {
      Bucket: this.bucket,
      Prefix: folder,
    };

    return await this.client
      .listObjects(objectParams)
      .promise()
      .then<Item[]>((data: S3.Types.ListObjectsOutput) => {
        return data.Contents.map<Item>((item: S3.Object) => ({
          key: item.Key,
          size: item.Size,
          lastModified: item.LastModified,
          bucket: data.Name,
        }));
      })
      .catch((error) => {
        console.log('There was an error gettings your files: ', error.message);

        throw error;
      });
  }

  public async get(key: ObjectKey): Promise<GotResponse> {
    const objectParams: GetObjectRequest = {
      Bucket: this.bucket,
      Key: key,
    };

    return await this.client
      .getObject(objectParams)
      .promise()
      .then<GotResponse>((data: S3.Types.GetObjectOutput) => {
        return {
          key,
          contentLength: data.ContentLength,
          contentType: data.ContentType,
          body: data.Body,
        };
      })
      .catch((error) => {
        console.log('There was an error getting your file: ', error.message);

        throw error;
      });
  }
}
