import { Router } from 'express';
import multer from 'multer';
import { fileController } from './file.controller';
import { config } from '../../config/logger';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.storage.maxFileSize,
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      'application/json',
      'application/zip',
      'application/x-rar-compressed',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'video/mp4',
      'video/webm',
      'video/quicktime',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  },
});

router.post('/upload', upload.single('file'), fileController.upload.bind(fileController));
router.get('/', fileController.listFiles.bind(fileController));
router.get('/:id', fileController.getFile.bind(fileController));
router.delete('/:id', fileController.deleteFile.bind(fileController));
router.get('/:id/download', fileController.downloadFile.bind(fileController));

export default router;
