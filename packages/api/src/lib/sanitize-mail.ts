/** Evita inyección de cabeceras en Subject/From display names. */
export function sanitizeMailHeaderValue(value: string): string {
  return value.replace(/[\r\n\0]/g, ' ').trim();
}
