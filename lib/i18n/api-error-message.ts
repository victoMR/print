import { ApiError } from "@/lib/api";
import { CustomerApiError } from "@/lib/customer-api";

/** Códigos que sí tienen traducción bajo el namespace `apiErrors` — ver messages/es.json y en.json. */
const KNOWN_API_ERROR_CODES = new Set([
  "MARKET_MISMATCH",
  "COUNTRY_CURRENCY_MISMATCH",
  "SHIPPING_MX_ONLY",
  "INVALID_CUSTOMER_SESSION",
  "EMAIL_NOT_VERIFIED",
  "LEGAL_NOT_ACCEPTED_ACCOUNT",
  "LEGAL_NOT_ACCEPTED",
  "TOTALS_MISMATCH",
  "MAX_QUANTITY_EXCEEDED",
  "INSUFFICIENT_STOCK",
  "STALE_CART_ITEM",
  "CART_PRICE_MISMATCH",
  "VARIANT_NOT_AVAILABLE_IN_USD",
  "PASSWORD_TOO_SHORT_8",
  "EMAIL_ALREADY_REGISTERED",
  "INVALID_CREDENTIALS",
  "INVALID_TRACKING_CODE",
  "ORDER_NOT_FOUND",
  "INVALID_VERIFICATION_LINK",
  "VERIFICATION_LINK_INVALID_OR_USED",
  "VERIFICATION_LINK_EXPIRED",
  "EMAIL_ALREADY_VERIFIED",
  "SHIPPING_METHOD_EXPIRED",
]);

/**
 * Resuelve el mensaje de error a mostrar al cliente, traducido cuando el backend
 * mandó un `code` conocido (ver packages/api/src/types/errors.ts) — si no, cae al
 * mensaje crudo del backend (network/genérico) y por último a `fallbackMessage`.
 *
 * `tRoot` debe ser un `useTranslations()` SIN namespace (raíz), porque las llaves
 * de `apiErrors.*` viven en la raíz de los catálogos de mensajes, no dentro del
 * namespace de cada componente. `fallbackMessage` ya debe venir resuelto (ej.
 * `t("errors.estimateFailed")` con el `t` namespaced propio del componente).
 */
export function apiErrorMessage(
  err: unknown,
  tRoot: (key: string, values?: Record<string, string | number>) => string,
  fallbackMessage: string,
): string {
  if (err instanceof ApiError || err instanceof CustomerApiError) {
    if (err.code && KNOWN_API_ERROR_CODES.has(err.code)) {
      return tRoot(`apiErrors.${err.code}`, err.details);
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return fallbackMessage;
}
