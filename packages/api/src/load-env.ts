import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');

// Secretos solo en packages/api/.env — el .env de la raíz es para Next.js (NEXT_PUBLIC_*).
dotenv.config({ path: path.join(packageRoot, '.env') });
