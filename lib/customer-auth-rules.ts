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

type AuthErrorTranslator = (key: string, values?: Record<string, number>) => string;

/** Validación previa al POST /api/v1/auth/register */
export function validateRegisterForm(form: RegisterFormInput, t?: AuthErrorTranslator): string | null {
  const email = form.email.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return t ? t("emailInvalid") : "Ingresa un correo electrónico válido.";
  }

  const fullName = form.fullName.trim();
  if (!fullName) return t ? t("nameRequired") : "El nombre completo es obligatorio.";
  if (fullName.length > CUSTOMER_FULL_NAME_MAX) {
    return t
      ? t("nameTooLong", { max: CUSTOMER_FULL_NAME_MAX })
      : `El nombre no puede superar ${CUSTOMER_FULL_NAME_MAX} caracteres.`;
  }

  if (form.password.length < CUSTOMER_PASSWORD_MIN) {
    return t
      ? t("passwordTooShort", { min: CUSTOMER_PASSWORD_MIN })
      : `La contraseña debe tener al menos ${CUSTOMER_PASSWORD_MIN} caracteres.`;
  }
  if (form.password.length > CUSTOMER_PASSWORD_MAX) {
    return t
      ? t("passwordTooLong", { max: CUSTOMER_PASSWORD_MAX })
      : `La contraseña no puede superar ${CUSTOMER_PASSWORD_MAX} caracteres.`;
  }
  if (form.password !== form.confirmPassword) {
    return t ? t("passwordMismatch") : "Las contraseñas no coinciden.";
  }

  const phone = form.phone.trim();
  if (phone && phone.length < 10) {
    return t ? t("phoneTooShort") : "Si agregas teléfono, debe tener al menos 10 dígitos.";
  }

  if (!form.acceptedLegal) {
    return t ? t("legalRequired") : "Debes aceptar los Términos y Condiciones y el Aviso de Privacidad.";
  }

  return null;
}

export function validateLoginForm(email: string, password: string, t?: AuthErrorTranslator): string | null {
  if (!email.trim()) return t ? t("emailRequired") : "Ingresa tu correo electrónico.";
  if (!password) return t ? t("passwordRequired") : "Ingresa tu contraseña.";
  return null;
}
