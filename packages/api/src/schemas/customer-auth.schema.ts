import { z } from 'zod';

/** Debe coincidir con customer-auth.service.ts (SALT_ROUNDS + bcrypt) y el frontend lib/customer-auth-rules.ts */
export const CUSTOMER_PASSWORD_MIN = 8;
export const CUSTOMER_PASSWORD_MAX = 128;

export const customerRegisterSchema = z.object({
  email: z.string().email('Correo inválido').transform((v) => v.trim().toLowerCase()),
  password: z
    .string()
    .min(CUSTOMER_PASSWORD_MIN, `Mínimo ${CUSTOMER_PASSWORD_MIN} caracteres`)
    .max(CUSTOMER_PASSWORD_MAX, `Máximo ${CUSTOMER_PASSWORD_MAX} caracteres`),
  fullName: z.string().trim().min(1, 'Nombre requerido').max(120),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export const customerLoginSchema = z.object({
  email: z.string().email('Correo inválido').transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1, 'Contraseña requerida').max(CUSTOMER_PASSWORD_MAX),
});
