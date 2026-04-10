export interface UploadResult {
  key: string;
  url?: string;
  size: number;
}

export interface StorageProvider {
  readonly name: string;

  upload(file: Buffer, filename: string, mimeType: string): Promise<UploadResult>;
  delete(key: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  exists(key: string): Promise<boolean>;
  getSignedUrl?(key: string, expiresIn?: number): Promise<string>;
  getStream(key: string): Promise<NodeJS.ReadableStream | null>;
}

export type StorageProviderType = 'local' | 's3' | 'r2';
