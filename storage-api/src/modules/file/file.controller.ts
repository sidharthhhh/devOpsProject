import { Request, Response, NextFunction } from 'express';
import { fileService } from './file.service';
import { fileIdParamSchema, listFilesQuerySchema } from './dto/file.dto';
import { logger } from '../../config/logger';
import { ApiResponse } from '../../utils/response';
import { FileNotFoundError } from '../../types/errors';
import { ZodError } from 'zod';

export class FileController {
  async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = req.file;

      if (!file) {
        res.status(400).json(
          ApiResponse.error('No file uploaded')
        );
        return;
      }

      const result = await fileService.uploadFile({
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      });

      logger.info({ fileId: result.file.id, filename: file.originalname }, 'File uploaded via API');

      res.status(201).json(
        ApiResponse.success(result.file)
      );
    } catch (error) {
      next(error);
    }
  }

  async getFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = fileIdParamSchema.parse(req.params);
      const result = await fileService.getFileById(id);

      res.json(ApiResponse.success(result.file));
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(
          ApiResponse.error('Invalid file ID format', error.errors)
        );
        return;
      }
      if (error instanceof FileNotFoundError) {
        res.status(404).json(
          ApiResponse.error(error.message)
        );
        return;
      }
      next(error);
    }
  }

  async listFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = listFilesQuerySchema.parse(req.query);
      const result = await fileService.listFiles(query);

      res.json(ApiResponse.success(result.files));
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(
          ApiResponse.error('Invalid query parameters', error.errors)
        );
        return;
      }
      next(error);
    }
  }

  async deleteFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = fileIdParamSchema.parse(req.params);
      await fileService.deleteFile(id);

      logger.info({ fileId: id }, 'File deleted via API');

      res.status(204).send();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(
          ApiResponse.error('Invalid file ID format', error.errors)
        );
        return;
      }
      if (error instanceof FileNotFoundError) {
        res.status(404).json(
          ApiResponse.error(error.message)
        );
        return;
      }
      next(error);
    }
  }

  async downloadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = fileIdParamSchema.parse(req.params);
      const result = await fileService.downloadFile(id);

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.filename)}"`);
      res.setHeader('Content-Length', result.file.size);

      logger.info({ fileId: id, filename: result.filename }, 'File downloaded via API');

      result.stream.pipe(res);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(
          ApiResponse.error('Invalid file ID format', error.errors)
        );
        return;
      }
      if (error instanceof FileNotFoundError) {
        res.status(404).json(
          ApiResponse.error(error.message)
        );
        return;
      }
      next(error);
    }
  }
}

export const fileController = new FileController();
