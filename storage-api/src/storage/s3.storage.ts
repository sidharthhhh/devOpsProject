import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  GetObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageProvider, UploadResult } from './storage.interface';
import { config } from '../config/logger';
import { logger } from '../config/logger';

export class S3StorageProvider implements StorageProvider {
  readonly name = 's3';
  private client: S3Client;
  private bucket: string;
  private region: string;

  constructor() {
    this.client = new S3Client({
      region: config.s3.region,
      credentials: config.s3.accessKey
        ? {
            accessKeyId: config.s3.accessKey,
            secretAccessKey: config.s3.secretKey,
          }
        : undefined,
      ...(config.s3.endpoint && { endpoint: config.s3.endpoint }),
    });

    this.bucket = config.s3.bucket;
    this.region = config.s3.region;
  }

  private generateKey(filename: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now();
    const ext = filename.split('.').pop() || '';

    return `uploads/${year}/${month}/${timestamp}.${ext}`;
  }

  async upload(file: Buffer, filename: string, mimeType: string): Promise<UploadResult> {
    const key = this.generateKey(filename);

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file,
          ContentType: mimeType,
        })
      );

      const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

      logger.info({
        filename,
        storageKey: key,
        size: file.length,
      }, 'File uploaded to S3');

      return {
        key,
        url,
        size: file.length,
      };
    } catch (error) {
      logger.error({ err: error, filename }, 'Failed to upload file to S3');
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );

      logger.info({ storageKey: key }, 'File deleted from S3');
    } catch (error) {
      logger.error({ err: error, storageKey: key }, 'Failed to delete file from S3');
      throw error;
    }
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      const response: GetObjectCommandOutput = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );

      if (!response.Body) {
        return null;
      }

      const chunks: Buffer[] = [];
      const stream = response.Body as AsyncIterable<Uint8Array>;

      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }

      return Buffer.concat(chunks);
    } catch (error) {
      logger.error({ err: error, storageKey: key }, 'Failed to get file from S3');
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      return await getS3SignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      logger.error({ err: error, storageKey: key }, 'Failed to generate signed URL');
      throw error;
    }
  }

  async getStream(key: string): Promise<NodeJS.ReadableStream | null> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );

      if (!response.Body) {
        return null;
      }

      const { Readable } = await import('stream');
      return Readable.from(response.Body as AsyncIterable<Uint8Array>);
    } catch (error) {
      logger.error({ err: error, storageKey: key }, 'Failed to get file stream from S3');
      throw error;
    }
  }
}
