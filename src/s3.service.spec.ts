import dotenv from 'dotenv';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { S3_CONFIGURATION } from './constants';
import { S3Service } from './s3.service';
import { Options, UploadedFile } from './interfaces';
import {
  DeleteObjectOutput,
  GetObjectOutput,
  ListObjectsOutput,
  ManagedUpload,
} from 'aws-sdk/clients/s3';
import { randomUUID } from 'crypto';

const configService = new ConfigService(dotenv.config());

const fakeS3Instance = {
  upload: jest.fn().mockReturnThis(),
  deleteObject: jest.fn().mockReturnThis(),
  listObjects: jest.fn().mockReturnThis(),
  getObject: jest.fn().mockReturnThis(),
  promise: jest.fn(),
};

jest.mock(
  'aws-sdk/clients/s3',
  () =>
    function () {
      return fakeS3Instance;
    },
);

const mockedFile = {
  fieldname: 'file',
  originalname: 'file.png',
  encoding: '7bit',
  mimetype: 'image/png',
  buffer: Buffer.from('fake-file.png'),
  size: 1024,
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
    jest.spyOn(fakeS3Instance, 'promise').mockResolvedValue({
      Location: `https://test.test/${mockedFile.originalname}`,
      ETag: randomUUID(),
      Bucket: bucket,
      Key: mockedFile.originalname,
    } as ManagedUpload.SendData);

    const { url, origin } = await service.put(mockedFile);

    expect(url).toBeDefined();
    expect(origin).toBeDefined();
    expect(origin.Key).toBe(mockedFile.originalname);
  });

  it('should be ok when put a file with a path that has an extension', async () => {
    jest.spyOn(fakeS3Instance, 'promise').mockResolvedValue({
      Location: 'https://test.test/avatars/file.png',
      ETag: randomUUID(),
      Bucket: bucket,
      Key: 'avatars/file.png',
    } as ManagedUpload.SendData);

    const { url, origin } = await service.put(mockedFile, 'avatars/file.png');

    expect(url).toBeDefined();
    expect(origin).toBeDefined();
    expect(origin.Key).toBe('avatars/file.png');
  });

  it('should throws exception if cannot put a file', async () => {
    jest.spyOn(fakeS3Instance, 'promise').mockRejectedValue(new Error('cannot put a file'));

    try {
      await service.put(mockedFile);
    } catch (error) {
      expect(error.message).toBe('cannot put a file');
    }
  });

  it('put a file as unique name', async () => {
    const uuid: string = randomUUID();

    jest.spyOn(fakeS3Instance, 'promise').mockResolvedValue({
      Location: `https://test.test/${uuid}.png`,
      ETag: uuid,
      Bucket: bucket,
      Key: `${uuid}.png`,
    } as ManagedUpload.SendData);

    const { url, origin } = await service.putAsUniqueName(mockedFile);

    expect(url).toBeDefined();
    expect(origin).toBeDefined();
    expect(origin.Key).toBe(`${uuid}.png`);
  });

  it('put a file as unique name with folder', async () => {
    const uuid: string = randomUUID();

    jest.spyOn(fakeS3Instance, 'promise').mockResolvedValue({
      Location: `https://test.test/avatars/${uuid}.png`,
      ETag: uuid,
      Bucket: bucket,
      Key: `avatars/${uuid}.png`,
    } as ManagedUpload.SendData);

    const { url, origin } = await service.putAsUniqueName(
      mockedFile,
      'avatars',
    );

    expect(url).toBeDefined();
    expect(origin).toBeDefined();
    expect(origin.Key).toBe(`avatars/${uuid}.png`);
  });

  it('delete a file', async () => {
    jest
      .spyOn(fakeS3Instance, 'promise')
      .mockResolvedValue({ DeleteMarker: true } as DeleteObjectOutput);

    const { status, origin } = await service.delete('fake.png');

    expect(status).toBeDefined();
    expect(status).toBeTruthy();
    expect(origin).toBeDefined();
  });

  it('should throws exception if cannot delete a file', async () => {
    jest
      .spyOn(fakeS3Instance, 'promise')
      .mockRejectedValue(new Error('cannot delete a file'));

    try {
      await service.delete('fake.png');
    } catch (error) {
      expect(error.message).toBe('cannot delete a file');
    }
  });

  it('list all files', async () => {
    jest.spyOn(fakeS3Instance, 'promise').mockResolvedValue({
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
    } as ListObjectsOutput);

    const items = await service.lists();

    expect(items.length).toBe(2);
    expect(items[0].key).toBe('file1.png');
    expect(items[1].key).toBe('file2.jpg');
  });

  it('should throws exception if cannot list all files', async () => {
    jest
      .spyOn(fakeS3Instance, 'promise')
      .mockRejectedValue(new Error('cannot list all files'));

    try {
      await service.lists();
    } catch (error) {
      expect(error.message).toBe('cannot list all files');
    }
  });

  it('get a file', async () => {
    jest.spyOn(fakeS3Instance, 'promise').mockResolvedValue({
      ContentLength: 1024,
      ContentType: 'image/png',
      Body: Buffer.from('fake.png'),
    } as GetObjectOutput);

    const { key, contentLength, contentType, body } = await service.get(
      'fake.png',
    );

    expect(key).toBe('fake.png');
    expect(contentLength).toBeDefined();
    expect(contentType).toBeDefined();
    expect(body).toBeDefined();
  });

  it('should throws exception if cannot get a file', async () => {
    jest
      .spyOn(fakeS3Instance, 'promise')
      .mockRejectedValue(new Error('cannot get a file'));

    try {
      await service.get('fake.png');
    } catch (error) {
      expect(error.message).toBe('cannot get a file');
    }
  });
});
