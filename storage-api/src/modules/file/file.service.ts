import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { storageProvider } from '../../storage';
import { fileRepository, CreateFileData, File } from './file.repository';
import { createChildLogger } from '../../config/logger';
import { FileNotFoundError, StorageError } from '../../types/errors';
import {
  ListFilesQuery,
  UploadFileResponse,
  FileMetadataResponse,
  ListFilesResponse,
} from './dto/file.dto';

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface UploadResult {
  file: UploadFileResponse;
}

export interface FileMetadataResult {
  file: FileMetadataResponse;
}

export interface ListFilesResult {
  files: ListFilesResponse;
}

export interface DownloadResult {
  file: File;
  stream: NodeJS.ReadableStream;
  mimeType: string;
  filename: string;
}

export class FileService {
  async uploadFile(uploadedFile: UploadedFile): Promise<UploadResult> {
    const { originalname, mimetype, size, buffer } = uploadedFile;

    const fileLogger = createChildLogger({ filename: originalname });

    const uniqueFilename = `${path.parse(originalname).name}-${uuidv4()}${path.extname(originalname)}`;

    fileLogger.info({ size, mimeType: mimetype }, 'Starting file upload');

    const uploadResult = await storageProvider.upload(buffer, uniqueFilename, mimetype);

    const fileData: CreateFileData = {
      filename: uniqueFilename,
      originalName: originalname,
      mimeType: mimetype,
      size: uploadResult.size,
      storageKey: uploadResult.key,
      storageProvider: storageProvider.name,
      url: uploadResult.url,
    };

    const file = await fileRepository.create(fileData);

    fileLogger.info({ fileId: file.id }, 'File upload completed');

    return {
      file: {
        id: file.id,
        filename: file.filename,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        url: file.url || undefined,
        createdAt: file.createdAt.toISOString(),
      },
    };
  }

  async getFileById(id: string): Promise<FileMetadataResult> {
    const fileLogger = createChildLogger({ fileId: id });

    const file = await fileRepository.findById(id);

    if (!file) {
      fileLogger.warn('File not found');
      throw new FileNotFoundError(id);
    }

    return {
      file: {
        id: file.id,
        filename: file.filename,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        url: file.url || undefined,
        storageProvider: file.storageProvider,
        createdAt: file.createdAt.toISOString(),
        updatedAt: file.updatedAt.toISOString(),
      },
    };
  }

  async listFiles(query: ListFilesQuery): Promise<ListFilesResult> {
    const { files, total } = await fileRepository.findAll(query);
    const { page, limit } = query;
    const totalPages = Math.ceil(total / limit);

    return {
      files: {
        files: files.map((file) => ({
          id: file.id,
          filename: file.filename,
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.size,
          url: file.url || undefined,
          storageProvider: file.storageProvider,
          createdAt: file.createdAt.toISOString(),
          updatedAt: file.updatedAt.toISOString(),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    };
  }

  async deleteFile(id: string): Promise<void> {
    const fileLogger = createChildLogger({ fileId: id });

    const file = await fileRepository.findById(id);

    if (!file) {
      fileLogger.warn('File not found for deletion');
      throw new FileNotFoundError(id);
    }

    await storageProvider.delete(file.storageKey);
    await fileRepository.delete(id);

    fileLogger.info('File deleted successfully');
  }

  async downloadFile(id: string): Promise<DownloadResult> {
    const fileLogger = createChildLogger({ fileId: id });

    const file = await fileRepository.findById(id);

    if (!file) {
      fileLogger.warn('File not found for download');
      throw new FileNotFoundError(id);
    }

    const stream = await storageProvider.getStream(file.storageKey);

    if (!stream) {
      fileLogger.error('Failed to get file stream from storage');
      throw new StorageError('Failed to retrieve file from storage');
    }

    return {
      file,
      stream,
      mimeType: file.mimeType,
      filename: file.originalName,
    };
  }
}

export const fileService = new FileService();
