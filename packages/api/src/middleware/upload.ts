import multer from 'multer';
import type { Request, RequestHandler } from 'express';
import { BadRequestError } from '../types/errors.js';

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  // image/gif excluded: rejected by the storage service (sharp can't transcode animations
  // reliably) and not useful for print assets.
  // image/svg+xml excluded: SVGs can contain <script> tags → stored XSS.
  'application/pdf',
]);

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestError(`Tipo de archivo no permitido: ${file.mimetype}. Solo se aceptan imágenes y PDF.`));
    }
  },
});

export const uploadSingle: RequestHandler = upload.single('file');

export function requireUploadedFile(req: Request) {
  if (!req.file) {
    throw new BadRequestError('Se requiere un archivo en el campo "file".');
  }
  return req.file;
}
