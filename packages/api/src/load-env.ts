import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');
const monorepoRoot = path.resolve(packageRoot, '../..');

// Monorepo: .env en raíz; opcional override en packages/api/.env
dotenv.config({ path: path.join(monorepoRoot, '.env') });
dotenv.config({ path: path.join(packageRoot, '.env') });
