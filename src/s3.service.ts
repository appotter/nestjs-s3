import { Inject, Injectable, Logger } from '@nestjs/common';
import { S3_CONFIGURATION } from './constants';
import {
  DeletedResponse,
  ListedResponse,
  Options,
  GotResponse,
  UploadedFile,
  UploadedResponse,
} from './interfaces';
import { getFileExtension, hasExtension, trimLastSlash } from './helpers';
import { v4 as uuid } from 'uuid';
import {
  CompleteMultipartUploadCommandOutput,
  DeleteObjectCommand,
  DeleteObjectCommandOutput,
  GetObjectCommand,
  GetObjectCommandOutput,
  ListObjectsCommand,
  ListObjectsCommandOutput,
  ObjectCannedACL,
  PutObjectCommandInput,
  S3Client,
  _Object,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private bucket: string;
  private acl: ObjectCannedACL;

  constructor(@Inject(S3_CONFIGURATION) private config: Options) {
    const {
      accessKeyId,
      secretAccessKey,
      region,
      bucket,
      acl,
      endpoint = null,
    } = config;

    this.client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
      endpoint,
    });
    this.bucket = bucket;
    this.acl = acl ?? 'public-read';
  }

  public getClient(): S3Client {
    return this.client;
  }

  public async put(
    file: UploadedFile,
    path?: string,
  ): Promise<UploadedResponse> {
    path = trimLastSlash(path);

    let fileName = file.originalname;

    if (path !== '') {
      fileName = `${path}/${file.originalname}`;
    }

    const putObject: PutObjectCommandInput = {
      Bucket: this.bucket,
      Key: hasExtension(path) ? path : fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: this.acl,
    };

    return await this.upload(putObject);
  }

  public async putAsUniqueName(
    file: UploadedFile,
    folder?: string,
  ): Promise<UploadedResponse> {
    folder = trimLastSlash(folder);
    const fileName = `${uuid()}.${getFileExtension(file)}`;

    const putObject: PutObjectCommandInput = {
      Bucket: this.bucket,
      Key: folder ? `${folder}/${fileName}` : fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: this.acl,
    };

    return await this.upload(putObject);
  }

  private async upload(
    putObject: PutObjectCommandInput,
  ): Promise<UploadedResponse> {
    try {
      const upload = new Upload({
        client: this.client,
        params: putObject,
      });

      const uploaded: CompleteMultipartUploadCommandOutput =
        await upload.done();

      return { url: uploaded.Location, origin: uploaded };
    } catch (error) {
      Logger.error(error);

      throw error;
    }
  }

  public async lists(folder?: string): Promise<ListedResponse> {
    folder = trimLastSlash(folder);

    const objectParams = {
      Bucket: this.bucket,
      Prefix: folder,
    };

    try {
      const data: ListObjectsCommandOutput = await this.client.send(
        new ListObjectsCommand(objectParams),
      );

      return data.Contents?.map((item: _Object) => ({
        key: item.Key,
        size: item.Size,
        lastModified: item.LastModified,
        bucket: this.bucket,
      }));
    } catch (error) {
      Logger.error(error);

      throw error;
    }
  }

  public async get(key: string): Promise<GotResponse> {
    const objectParams = {
      Bucket: this.bucket,
      Key: key,
    };

    try {
      const data: GetObjectCommandOutput = await this.client.send(
        new GetObjectCommand(objectParams),
      );

      // Convert the body stream to a Buffer
      const stream = data.Body as Readable;
      const bodyBuffer = Buffer.concat(await stream.toArray());

      return {
        key,
        contentLength: data.ContentLength || 0,
        contentType: data.ContentType || '',
        body: bodyBuffer,
      };
    } catch (error) {
      Logger.error(error);

      throw error;
    }
  }

  public async delete(key: string): Promise<DeletedResponse> {
    const objectParams = {
      Bucket: this.bucket,
      Key: key,
    };

    try {
      const data: DeleteObjectCommandOutput = await this.client.send(
        new DeleteObjectCommand(objectParams),
      );

      return { status: true, origin: data };
    } catch (error) {
      Logger.error(error);

      throw error;
    }
  }

  public async signedUrl(key: string, expiresIn: number): Promise<string> {
    const objectParams = {
      Bucket: this.bucket,
      Key: key,
    };

    try {
      return await getSignedUrl(
        this.client,
        new GetObjectCommand(objectParams),
        { expiresIn },
      );
    } catch (error) {
      Logger.error(error);

      throw error;
    }
  }
}
