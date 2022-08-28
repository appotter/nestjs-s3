import dotenv from 'dotenv';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { S3_CONFIGURATION } from './constants';
import { S3Service } from './s3.service';
import {
  DeletedResponse,
  GotResponse,
  ListedResponse,
  Options,
  UploadedFile,
  UploadedResponse,
} from './interfaces';
import { ObjectKey } from 'aws-sdk/clients/s3';

const configService = new ConfigService(dotenv.config());

describe('S3Service', () => {
  let service: S3Service;
  let accessKeyId: string;
  let secretAccessKey: string;
  let region: string;
  let bucket: string;

  beforeEach(async () => {
    accessKeyId = configService.get<string>('S3_ACCESS_KEY_ID');
    secretAccessKey = configService.get<string>('S3_SECRET_ACCESS_KEY');
    region = configService.get<string>('S3_REGION');
    bucket = configService.get<string>('S3_BUCKET');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: S3_CONFIGURATION,
          useValue: {
            accessKeyId,
            secretAccessKey,
            region,
            bucket,
          } as Options,
        },
        S3Service,
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

  it('put a file', async () => {
    jest
      .spyOn(service, 'put')
      .mockImplementationOnce(
        (file: UploadedFile): Promise<UploadedResponse> => {
          const uploaded: UploadedResponse = {
            url: `https://test.test/${file.originalname}`,
            origin: {
              Location: `https://test.test/${file.originalname}`,
              ETag: 'qwery',
              Bucket: bucket,
              Key: file.originalname,
            },
          };

          return Promise.resolve(uploaded);
        },
      );

    const fakeFile = 'fake.jpg';
    const { url, origin } = await service.put({
      originalname: fakeFile,
    } as UploadedFile);

    expect(url).toBeDefined();
    expect(origin).toBeDefined();
    expect(origin.Key).toBe(fakeFile);
  });

  it('delete a file', async () => {
    jest
      .spyOn(service, 'delete')
      .mockImplementationOnce((_key: ObjectKey): Promise<DeletedResponse> => {
        const deleted: DeletedResponse = {
          status: true,
          origin: {},
        };

        return Promise.resolve(deleted);
      });

    const { status, origin } = await service.delete('fake.png');

    expect(status).toBeDefined();
    expect(status).toBeTruthy();
    expect(origin).toBeDefined();
  });

  it('list all files', async () => {
    jest
      .spyOn(service, 'lists')
      .mockImplementationOnce((): Promise<ListedResponse> => {
        const listed: ListedResponse = [
          {
            key: 'test.png',
            size: 12345,
            lastModified: new Date(),
            bucket: 'test-bucket',
          },
          {
            key: 'test2.png',
            size: 456,
            lastModified: new Date(),
            bucket: 'test-bucket',
          },
        ];

        return Promise.resolve(listed);
      });

    const items = await service.lists();

    expect(items.length).toBe(2);
  });

  it('get a file', async () => {
    jest
      .spyOn(service, 'get')
      .mockImplementation((objectKey: ObjectKey): Promise<GotResponse> => {
        const got: GotResponse = {
          key: objectKey,
          contentLength: 123,
          contentType: 'application/octet-stream',
          body: Buffer,
        };

        return Promise.resolve(got);
      });

    const fakeFile = 'fake.png';
    const { key, contentLength, contentType, body } = await service.get(
      fakeFile,
    );

    expect(key).toBe(fakeFile);
    expect(contentLength).toBeDefined();
    expect(contentType).toBeDefined();
    expect(body).toBeDefined();
  });
});
