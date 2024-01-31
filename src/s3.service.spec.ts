import dotenv from 'dotenv';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { S3_CONFIGURATION } from './constants';
import { S3Service } from './s3.service';
import { Options, UploadedFile } from './interfaces';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { mockClient } from 'aws-sdk-client-mock';
import { Logger } from '@nestjs/common';
import { Readable } from 'stream';
import { sdkStreamMixin } from '@smithy/util-stream';

const configService = new ConfigService(dotenv.config());

const fakeS3Client = mockClient(S3Client);

const mockedFile = {
  fieldname: 'file',
  originalname: 'file.png',
  encoding: '7bit',
  mimetype: 'image/png',
  buffer: Buffer.from('fake-file.png'),
  size: 256,
} as UploadedFile;

describe('S3Service', () => {
  let service: S3Service;
  let accessKeyId: string;
  let secretAccessKey: string;
  let region: string;
  let bucket: string;
  let endpoint: string;

  beforeEach(async () => {
    accessKeyId = configService.get<string>('S3_ACCESS_KEY_ID');
    secretAccessKey = configService.get<string>('S3_SECRET_ACCESS_KEY');
    region = configService.get<string>('S3_REGION');
    bucket = configService.get<string>('S3_BUCKET');
    endpoint = configService.get<string>('S3_ENDPOINT');

    fakeS3Client.reset();

    Logger.error = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Service,
        {
          provide: S3_CONFIGURATION,
          useValue: {
            accessKeyId,
            secretAccessKey,
            region,
            bucket,
            endpoint,
          } as Options,
        },
      ],
    }).compile();

    service = module.get(S3Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('call getClient should be object', () => {
    const client = service.getClient();

    expect(client).toBeDefined();
    expect(typeof client === 'object').toBeTruthy();
  });

  it('should be ok when put a file', async () => {
    const { url, origin } = await service.put(mockedFile);

    expect(url).toBeDefined();
    expect(origin).toBeDefined();
    expect(origin.Key).toBe(mockedFile.originalname);
  });

  it('should be ok when put a file with a path that has an extension', async () => {
    const { url, origin } = await service.put(mockedFile, 'avatars/file.png');

    expect(url).toBeDefined();
    expect(origin).toBeDefined();
    expect(origin.Key).toBe('avatars/file.png');
  });

  it('should be ok when put a file with a path that ending with slash', async () => {
    const { url, origin } = await service.put(mockedFile, 'avatars/');

    expect(url).toBeDefined();
    expect(origin).toBeDefined();
    expect(origin.Key).toBe('avatars/file.png');
  });

  it('should throws exception if cannot put a file', async () => {
    fakeS3Client.on(PutObjectCommand).rejects(new Error('cannot put a file'));

    try {
      await service.put(mockedFile);
    } catch (error) {
      expect(error.message).toBe('cannot put a file');
    }

    expect(Logger.error).toHaveBeenCalled();
  });

  it('put a file as unique name', async () => {
    const { url, origin } = await service.putAsUniqueName(mockedFile);

    expect(url).toBeDefined();
    expect(origin).toBeDefined();
    expect(origin.Key).toBeDefined();
  });

  it('put a file as unique name with folder', async () => {
    const { url, origin } = await service.putAsUniqueName(
      mockedFile,
      'avatars',
    );

    expect(url).toBeDefined();
    expect(origin).toBeDefined();
    expect(origin.Key).toContain('avatars');
  });

  it('list all files', async () => {
    fakeS3Client.on(ListObjectsCommand).resolves({
      Name: bucket,
      Contents: [
        {
          Key: 'file1.png',
          Size: 1024,
          LastModified: new Date(),
        },
        {
          Key: 'file2.jpg',
          Size: 1024,
          LastModified: new Date(),
        },
      ],
    });

    const items = await service.lists();

    expect(items.length).toBe(2);
    expect(items[0].key).toBe('file1.png');
    expect(items[1].key).toBe('file2.jpg');
  });

  it('should throws exception if cannot list all files', async () => {
    fakeS3Client
      .on(ListObjectsCommand)
      .rejects(new Error('cannot list all files'));

    try {
      await service.lists();
    } catch (error) {
      expect(error.message).toBe('cannot list all files');
    }

    expect(Logger.error).toHaveBeenCalled();
  });

  it('get a file', async () => {
    // create Stream from string
    const stream = new Readable();
    stream.push('hello world');
    stream.push(null); // end of stream

    // wrap the Stream with SDK mixin
    const sdkStream = sdkStreamMixin(stream);

    fakeS3Client.on(GetObjectCommand).resolves({
      Body: sdkStream,
    });

    const { key, contentLength, contentType, body } =
      await service.get('fake.png');

    expect(key).toBe('fake.png');
    expect(contentLength).toBeDefined();
    expect(contentType).toBeDefined();
    expect(body).toBeInstanceOf(Buffer);
  });

  it('should throws exception if cannot get a file', async () => {
    fakeS3Client.on(GetObjectCommand).rejects(new Error('cannot get a file'));

    try {
      await service.get('fake.png');
    } catch (error) {
      expect(error.message).toBe('cannot get a file');
    }

    expect(Logger.error).toHaveBeenCalled();
  });

  it('delete a file', async () => {
    fakeS3Client.on(DeleteObjectCommand).resolves({
      DeleteMarker: true,
      VersionId: randomUUID(),
    });

    const { status, origin } = await service.delete('fake.png');

    expect(status).toBeDefined();
    expect(status).toBeTruthy();
    expect(origin).toBeDefined();
  });

  it('should throws exception if cannot delete a file', async () => {
    fakeS3Client
      .on(DeleteObjectCommand)
      .rejects(new Error('cannot delete a file'));

    try {
      await service.delete('fake.png');
    } catch (error) {
      expect(error.message).toBe('cannot delete a file');
    }

    expect(Logger.error).toHaveBeenCalled();
  });

  it('signed url with 60 second', async () => {
    const data = await service.signedUrl('fake.png', 60);

    expect(data).toContain('X-Amz-Algorithm');
    expect(data).toContain('X-Amz-Signature');
  });

  it('should throws exception if cannot signed url', async () => {
    fakeS3Client.on(GetObjectCommand).rejects(new Error('cannot signed url'));

    try {
      await service.signedUrl('fake.png', 60);
    } catch (error) {
      console.log(error);

      expect(error.message).toBe('cannot signed url');
    }
  });
});
