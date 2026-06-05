/**
 * Reglas de validación alineadas con packages/api/src/routes/v1/auth.routes.ts
 * y lib/password.ts (bcrypt, 12 rounds). El API hashea; el navegador envía texto plano.
 */

export const CUSTOMER_PASSWORD_MIN = 8;
export const CUSTOMER_PASSWORD_MAX = 128;
export const CUSTOMER_FULL_NAME_MAX = 120;

export type RegisterFormInput = {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phone: string;
  acceptedLegal: boolean;
};

export function normalizeRegisterPayload(form: RegisterFormInput) {
  return {
    email: form.email.trim().toLowerCase(),
    password: form.password,
    fullName: form.fullName.trim(),
    phone: form.phone.trim() || undefined,
    acceptedTerms: true as const,
    acceptedPrivacy: true as const,
  };
}

/** Validación previa al POST /api/v1/auth/register */
export function validateRegisterForm(form: RegisterFormInput): string | null {
  const email = form.email.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Ingresa un correo electrónico válido.";
  }

  const fullName = form.fullName.trim();
  if (!fullName) return "El nombre completo es obligatorio.";
  if (fullName.length > CUSTOMER_FULL_NAME_MAX) {
    return `El nombre no puede superar ${CUSTOMER_FULL_NAME_MAX} caracteres.`;
  }

  if (form.password.length < CUSTOMER_PASSWORD_MIN) {
    return `La contraseña debe tener al menos ${CUSTOMER_PASSWORD_MIN} caracteres.`;
  }
  if (form.password.length > CUSTOMER_PASSWORD_MAX) {
    return `La contraseña no puede superar ${CUSTOMER_PASSWORD_MAX} caracteres.`;
  }
  if (form.password !== form.confirmPassword) {
    return "Las contraseñas no coinciden.";
  }

  const phone = form.phone.trim();
  if (phone && phone.length < 10) {
    return "Si agregas teléfono, debe tener al menos 10 dígitos.";
  }

  if (!form.acceptedLegal) {
    return "Debes aceptar los Términos y Condiciones y el Aviso de Privacidad.";
  }

  return null;
}

export function validateLoginForm(email: string, password: string): string | null {
  if (!email.trim()) return "Ingresa tu correo electrónico.";
  if (!password) return "Ingresa tu contraseña.";
  return null;
}
