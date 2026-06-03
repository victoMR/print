import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');
const monorepoRoot = path.resolve(packageRoot, '../..');
const apiEnvPath = path.join(packageRoot, '.env');

// packages/api/.env tiene prioridad. La raíz solo como respaldo (mover PG* al API .env).
dotenv.config({ path: path.join(monorepoRoot, '.env') });
dotenv.config({ path: apiEnvPath });
