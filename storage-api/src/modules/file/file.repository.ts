import { pool, RowDataPacket, ResultSetHeader } from '../../database/mysql';
import { ListFilesQuery } from './dto/file.dto';
import { logger } from '../../config/logger';

export interface File {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  storageProvider: string;
  url: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FileRow extends RowDataPacket {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  storage_key: string;
  storage_provider: string;
  url: string | null;
  created_at: Date;
  updated_at: Date;
}

// Helper function to map database row to File interface
const mapRowToFile = (row: FileRow): File => ({
  id: row.id,
  filename: row.filename,
  originalName: row.original_name,
  mimeType: row.mime_type,
  size: row.size,
  storageKey: row.storage_key,
  storageProvider: row.storage_provider,
  url: row.url,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export interface CreateFileData {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  storageProvider: string;
  url?: string;
}

export interface FileRepository {
  create(data: CreateFileData): Promise<File>;
  findById(id: string): Promise<File | null>;
  findByStorageKey(storageKey: string): Promise<File | null>;
  findAll(query: ListFilesQuery): Promise<{ files: File[]; total: number }>;
  delete(id: string): Promise<File>;
  count(): Promise<number>;
}

export class FileRepositoryImpl implements FileRepository {
  async create(data: CreateFileData): Promise<File> {
    try {
      const fileId = require('uuid').v4();
      
      await pool.execute<ResultSetHeader>(
        `INSERT INTO files (id, filename, original_name, mime_type, size, storage_key, storage_provider, url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          fileId,
          data.filename,
          data.originalName,
          data.mimeType,
          data.size,
          data.storageKey,
          data.storageProvider,
          data.url || null,
        ]
      );

      const [rows] = await pool.execute<FileRow[]>(
        'SELECT * FROM files WHERE id = ?',
        [fileId]
      );

      const file = mapRowToFile(rows[0]);
      logger.info({ fileId: file.id, filename: file.filename }, 'File record created');
      return file;
    } catch (error) {
      logger.error({ err: error }, 'Failed to create file record');
      throw error;
    }
  }

  async findById(id: string): Promise<File | null> {
    const [rows] = await pool.execute<FileRow[]>('SELECT * FROM files WHERE id = ?', [id]);
    return rows[0] ? mapRowToFile(rows[0]) : null;
  }

  async findByStorageKey(storageKey: string): Promise<File | null> {
    const [rows] = await pool.execute<FileRow[]>('SELECT * FROM files WHERE storage_key = ?', [
      storageKey,
    ]);
    return rows[0] ? mapRowToFile(rows[0]) : null;
  }

  async findAll(query: ListFilesQuery): Promise<{ files: File[]; total: number }> {
    const { page, limit, sortBy, sortOrder } = query;
    const offset = (page - 1) * limit;

    // Map camelCase to snake_case for database columns
    const columnMap: Record<string, string> = {
      createdAt: 'created_at',
      filename: 'filename',
      size: 'size',
    };

    const dbColumn = columnMap[sortBy] || 'created_at';
    
    // Validate sortOrder to prevent SQL injection
    const validatedSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const [countResult] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM files'
    );

    // Get files - build query with validated values
    const sqlQuery = `SELECT * FROM files ORDER BY ${dbColumn} ${validatedSortOrder} LIMIT ${limit} OFFSET ${offset}`;
    const [rows] = await pool.query<FileRow[]>(sqlQuery);

    const files = rows.map(mapRowToFile);
    return { files, total: (countResult[0] as { total: number }).total };
  }

  async delete(id: string): Promise<File> {
    try {
      const [existing] = await pool.execute<FileRow[]>('SELECT * FROM files WHERE id = ?', [id]);

      if (!existing[0]) {
        throw new Error('File not found');
      }

      await pool.execute('DELETE FROM files WHERE id = ?', [id]);

      const file = mapRowToFile(existing[0]);
      logger.info({ fileId: id, filename: file.filename }, 'File record deleted');
      return file;
    } catch (error) {
      logger.error({ err: error, fileId: id }, 'Failed to delete file record');
      throw error;
    }
  }

  async count(): Promise<number> {
    const [result] = await pool.execute<RowDataPacket[]>('SELECT COUNT(*) as total FROM files');
    return (result[0] as { total: number }).total;
  }
}

export const fileRepository = new FileRepositoryImpl();
