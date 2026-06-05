import { z } from 'zod';

/** Debe coincidir con lib/password.ts (bcrypt 12 rounds) y el frontend lib/customer-auth-rules.ts */
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
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar los Términos y Condiciones' }),
  }),
  acceptedPrivacy: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar el Aviso de Privacidad' }),
  }),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(16, 'Token inválido'),
});

export const resendVerificationSchema = z.object({
  email: z.string().email('Correo inválido').transform((v) => v.trim().toLowerCase()),
});

export const customerLoginSchema = z.object({
  email: z.string().email('Correo inválido').transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1, 'Contraseña requerida').max(CUSTOMER_PASSWORD_MAX),
});
