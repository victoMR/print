import { z } from 'zod';

/** URL absoluta o ruta same-origin servida vía Next/nginx → API `/uploads/...` */
export const assetUrlSchema = z.union([
  z.string().url(),
  z.string().regex(/^\/uploads\//, 'Ruta de asset inválida'),
]);
