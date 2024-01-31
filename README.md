<div align="center">
  <a href="http://nestjs.com/" target="_blank">
    <img src="https://nestjs.com/img/logo_text.svg" width="150" alt="Nest Logo" />
  </a>
</div>

<h3 align="center">NestJS S3</h3>

<div align="center">
  <a href="https://nestjs.com" target="_blank">
    <img src="https://img.shields.io/badge/built%20with-NestJs-red.svg" alt="Built with NestJS">
  </a>
</div>

### Introduction

This is a simple wrapper of [Aws S3](https://github.com/aws/aws-sdk-js) client library for NestJS.

### Installation (AWS-SDK V3)

```bash
npm install --save @appotter/nestjs-s3 @aws-sdk/client-s3 @aws-sdk/lib-storage @aws-sdk/s3-request-presigner uuid multer
```

### Installation (AWS-SDK V2) (Not recommended)

```bash
npm install --save @appotter/nestjs-s3@2.0.0 aws-sdk uuid multer
```

### Usage

#### Importing module

```typescript
import { S3Module, S3Service } from '@appotter/nestjs-s3';

@Module({
  imports: [
    S3Module.register({
      accessKeyId: 'Random key',
      secretAccessKey: 'Random secret',
      region: 'Region',
      bucket: 'Bucket name',
      acl: 'ACL', // optional, default is public-read
      endpoint: '', // optional
    }),
  ],
  providers: [S3Service],
  exports: [S3Service],
})
export class S3ProviderModule {}
```

#### Importing module Async

```typescript
import { S3Module, S3Service } from '@appotter/nestjs-S3';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    S3Module.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        accessKeyId: configService.get('S3_ACCESS_KEY_ID'),
        secretAccessKey: configService.get('S3_SECRET_ACCESS_KEY'),
        region: configService.get('S3_REGION'),
        bucket: configService.get('S3_BUCKET'),
      }),
    }),
  ],
  providers: [S3Service],
  exports: [S3Service],
})
export class S3ProviderModule {}
```

#### Calling Method

```typescript
import { S3Service, S3ModuleUploadedFile } from '@appotter/nestjs-S3';

@Injectable()
export class YourService {
  constructor(private s3Service: S3Service) {}

  async put(file: S3ModuleUploadedFile): Promise<void> {
    await this.s3Service.put(file, 'path-or-custom-file-name');
  }

  async putAsUniqueName(file: S3ModuleUploadedFile): Promise<void> {
    const { url } = await this.s3Service.putAsUniqueName(file);

    console.log(url);
    // https://bucket-name.s3.region.amazonaws.com/71d07956-26bb-4554-bb37-d00a7865ae29.png
  }

  async listAllFiles(): Promise<void> {
    const items = await this.s3Service.lists();

    console.log(items);
    // [
    //   {
    //     key: 'file.png',
    //     size: 123,
    //     lastModified: 2022-08-08T07:28:40.000Z,
    //     bucket: 'test',
    //   },
    //   {
    //     key: 'file2.png',
    //     size: 456,
    //     lastModified: 2022-08-08T07:45:46.000Z,
    //     bucket: 'test',
    //   },
    // ]
  }

  async getFile(file: string): Promise<void> {
    const item = await this.s3Service.get(file);

    console.log(item);
    // {
    //   key: 'file.jpg',
    //   contentLength: 123,
    //   contentType: 'application/octet-stream',
    //   body: '<Buffer ff d8 ff e0 00 ... 74938 more bytes>',
    // }
  }

  async deleteFile(file: string): Promise<boolean> {
    const { status } = await this.s3Service.delete(file);

    return status;
  }

  // Also available with all S3 instance methods
  // this.s3Service.getClient().[all-method-of-S3-instance]();

  // Signed Url (support V3 only)
  async signedUrl(file: string): Promise<string> {
    // expires in 1 hour
    const signed = await this.s3Service.signedUrl(file, 60*60);

    console.log(signed);
    // https://test.s3.ap-southeast-1.amazonaws.com/fake.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=test%2F20240131%2Fap-southeast-1%2Fs3%2Faws4_request&X-Amz-Date=20240131T110201Z&X-Amz-Expires=60&X-Amz-Signature=25875526097b1f0182b27009005e70f9e92cd67294fb60583de9bd0b5f1cc5a7&X-Amz-SignedHeaders=host&x-id=GetObject
  }
}
```

## Contributing

Contributions welcome!

## Author

**Phitsanu Chuamuangphan ([GitHub](https://github.com/appotter))**

## LICENSE

MIT
