import fs from 'fs';
import path from 'path';
import { createReadStream, createWriteStream, unlinkSync, existsSync, mkdirSync } from 'fs';
import { StorageProvider, UploadResult } from './storage.interface';
import { config } from '../config/logger';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

export class LocalStorageProvider implements StorageProvider {
  readonly name = 'local';
  private readonly uploadPath: string;

  constructor() {
    this.uploadPath = path.resolve(config.storage.uploadPath);
    this.ensureDirectoryExists(this.uploadPath);
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
      logger.info({ path: dirPath }, 'Created upload directory');
    }
  }

  private generateStoragePath(filename: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const uuid = uuidv4();
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);

    const dirPath = path.join(this.uploadPath, String(year), month);
    this.ensureDirectoryExists(dirPath);

    return path.join(dirPath, `${baseName}-${uuid}${ext}`);
  }

  async upload(file: Buffer, filename: string, _mimeType: string): Promise<UploadResult> {
    const storagePath = this.generateStoragePath(filename);

    return new Promise((resolve, reject) => {
      const writeStream = createWriteStream(storagePath);

      writeStream.on('finish', () => {
        const stats = fs.statSync(storagePath);
        const relativePath = path.relative(process.cwd(), storagePath);
        
        logger.info({
          filename,
          storageKey: relativePath,
          size: stats.size,
        }, 'File uploaded successfully');

        resolve({
          key: relativePath,
          size: stats.size,
        });
      });

      writeStream.on('error', (error) => {
        logger.error({ err: error, filename }, 'Failed to upload file');
        reject(error);
      });

      writeStream.write(file);
      writeStream.end();
    });
  }

  async delete(key: string): Promise<void> {
    try {
      const fullPath = path.isAbsolute(key) ? key : path.resolve(process.cwd(), key);
      
      if (existsSync(fullPath)) {
        unlinkSync(fullPath);
        logger.info({ storageKey: key }, 'File deleted successfully');
      } else {
        logger.warn({ storageKey: key }, 'File not found for deletion');
      }
    } catch (error) {
      logger.error({ err: error, storageKey: key }, 'Failed to delete file');
      throw error;
    }
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      const fullPath = path.isAbsolute(key) ? key : path.resolve(process.cwd(), key);
      
      if (!existsSync(fullPath)) {
        logger.warn({ storageKey: key }, 'File not found');
        return null;
      }

      return fs.readFileSync(fullPath);
    } catch (error) {
      logger.error({ err: error, storageKey: key }, 'Failed to get file');
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    const fullPath = path.isAbsolute(key) ? key : path.resolve(process.cwd(), key);
    return existsSync(fullPath);
  }

  async getStream(key: string): Promise<NodeJS.ReadableStream | null> {
    try {
      const fullPath = path.isAbsolute(key) ? key : path.resolve(process.cwd(), key);
      
      if (!existsSync(fullPath)) {
        logger.warn({ storageKey: key }, 'File not found for streaming');
        return null;
      }

      return createReadStream(fullPath);
    } catch (error) {
      logger.error({ err: error, storageKey: key }, 'Failed to get file stream');
      throw error;
    }
  }

  getStoragePath(): string {
    return this.uploadPath;
  }
}
