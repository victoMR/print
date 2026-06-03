import multer from 'multer';
import type { Request, RequestHandler } from 'express';
import { BadRequestError } from '../types/errors.js';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
});

export const uploadSingle: RequestHandler = upload.single('file');

export function requireUploadedFile(req: Request) {
  if (!req.file) {
    throw new BadRequestError('Se requiere un archivo en el campo "file".');
  }
  return req.file;
}
