import { StorageProvider, StorageProviderType } from './storage.interface';
import { LocalStorageProvider } from './local.storage';
import { S3StorageProvider } from './s3.storage';
import { config } from '../config/logger';
import { logger } from '../config/logger';

class StorageFactory {
  private static instance: StorageProvider | null = null;

  static getProvider(): StorageProvider {
    if (this.instance) {
      return this.instance;
    }

    const providerType: StorageProviderType = config.storage.provider;

    logger.info({ providerType }, 'Initializing storage provider');

    switch (providerType) {
      case 's3':
        this.instance = new S3StorageProvider();
        break;
      case 'r2':
        logger.warn('R2 storage provider not implemented, falling back to local');
        this.instance = new LocalStorageProvider();
        break;
      case 'local':
      default:
        this.instance = new LocalStorageProvider();
        break;
    }

    return this.instance;
  }

  static resetProvider(): void {
    this.instance = null;
  }
}

export const storageProvider = StorageFactory.getProvider();
