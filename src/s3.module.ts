import { DynamicModule, Module, Provider } from '@nestjs/common';
import { S3_CONFIGURATION } from './constants';
import { S3Service } from './s3.service';
import { Options, OptionsAsync } from './interfaces';

@Module({})
export class S3Module {
  public static register(config: Options): DynamicModule {
    return {
      module: S3Module,
      providers: [
        {
          provide: S3_CONFIGURATION,
          useValue: config,
        },
        S3Service,
      ],
      exports: [S3_CONFIGURATION, S3Service],
    };
  }

  public static async registerAsync(
    config: OptionsAsync,
  ): Promise<DynamicModule> {
    return {
      module: S3Module,
      imports: config.imports || [],
      providers: [this.createAsyncProviders(config), S3Service],
      exports: [S3_CONFIGURATION, S3Service],
    };
  }

  private static createAsyncProviders(options: OptionsAsync): Provider {
    return {
      provide: S3_CONFIGURATION,
      useFactory: options.useFactory,
      inject: options.inject || [],
    };
  }
}
