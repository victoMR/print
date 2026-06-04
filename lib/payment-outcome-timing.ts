/** Tiempo mínimo visible del modal de éxito/error antes de continuar. */
export const PAYMENT_OUTCOME_VISIBLE_MS = 2800;

/** Texto del modal tras pago exitoso (incluye aviso de correo). */
export function paymentSuccessDescription(email?: string | null): string {
  const trimmed = email?.trim();
  if (trimmed) {
    return `Tu pedido quedó registrado. Te enviamos la confirmación de pago y los detalles del pedido a ${trimmed}. Revisa también tu bandeja de spam.`;
  }
  return "Tu pedido quedó registrado. Te enviamos la confirmación de pago al correo que indicaste en la compra. Revisa también tu bandeja de spam.";
}
