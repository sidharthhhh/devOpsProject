import { z } from 'zod';

export const fileIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid file ID format' }),
});

export const listFilesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['createdAt', 'filename', 'size']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const uploadFileResponseSchema = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  url: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
});

export const fileMetadataResponseSchema = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  url: z.string().nullable().optional(),
  storageProvider: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const listFilesResponseSchema = z.object({
  files: z.array(fileMetadataResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export type FileIdParam = z.infer<typeof fileIdParamSchema>;
export type ListFilesQuery = z.infer<typeof listFilesQuerySchema>;
export type UploadFileResponse = z.infer<typeof uploadFileResponseSchema>;
export type FileMetadataResponse = z.infer<typeof fileMetadataResponseSchema>;
export type ListFilesResponse = z.infer<typeof listFilesResponseSchema>;
