import { randomInt } from 'node:crypto';

/** Crockford base32 sin caracteres ambiguos (0/O, 1/I/L). */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

const SEGMENT = `[${ALPHABET}]{4}`;
export const TRACKING_CODE_PATTERN = new RegExp(
  `^MRP-${SEGMENT}-${SEGMENT}-${SEGMENT}$`,
);

const LEGACY_HEX_PATTERN = /^[0-9a-f]{32}$/i;

/** Número interno secuencial (solo admin / soporte; no usar para seguimiento público). */
export const INTERNAL_ORDER_NUMBER_PATTERN = /^MRP-\d{4}-\d{5}$/;

export type GuestTrackingLookup =
  | { kind: 'public_id'; value: string }
  | { kind: 'order_number'; value: string };

function randomSegment(length: number): string {
  let segment = '';
  for (let i = 0; i < length; i++) {
    segment += ALPHABET[randomInt(ALPHABET.length)]!;
  }
  return segment;
}

/** Genera un código legible tipo MRP-K7NH-9P2W-X7M8. */
export function generateTrackingCode(): string {
  return `MRP-${randomSegment(4)}-${randomSegment(4)}-${randomSegment(4)}`;
}

/**
 * Normaliza entrada del usuario (con o sin guiones) al formato almacenado.
 * Acepta códigos legacy de 32 hex (pedidos anteriores).
 */
export function normalizeTrackingCode(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const upper = trimmed.toUpperCase();
  if (TRACKING_CODE_PATTERN.test(upper)) return upper;

  const compact = upper.replace(/[\s-]/g, '');
  if (compact.startsWith('MRP') && compact.length === 15) {
    const body = compact.slice(3);
    if (!new RegExp(`^[${ALPHABET}]{12}$`).test(body)) return null;
    return `MRP-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}`;
  }

  const legacy = trimmed.toLowerCase();
  if (LEGACY_HEX_PATTERN.test(legacy)) return legacy;

  return null;
}

/**
 * Interpreta lo que escribe el cliente en /seguimiento.
 * Prioriza código aleatorio (public_id); acepta número interno MRP-2026-00001 por compatibilidad.
 */
export function parseGuestTrackingInput(input: string): GuestTrackingLookup | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const asPublicId = normalizeTrackingCode(trimmed);
  if (asPublicId) return { kind: 'public_id', value: asPublicId };

  const upper = trimmed.toUpperCase();
  if (INTERNAL_ORDER_NUMBER_PATTERN.test(upper)) {
    return { kind: 'order_number', value: upper };
  }

  return null;
}

/** Formato legible para mostrar al cliente. */
export function formatTrackingCodeDisplay(publicId: string): string {
  const upper = publicId.toUpperCase();
  if (TRACKING_CODE_PATTERN.test(upper)) return upper;

  if (LEGACY_HEX_PATTERN.test(publicId)) {
    const hex = publicId.toUpperCase();
    return `${hex.slice(0, 8)}-${hex.slice(8, 16)}-${hex.slice(16, 24)}-${hex.slice(24)}`;
  }

  return publicId;
}
