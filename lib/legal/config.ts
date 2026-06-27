/** Versión vigente de documentos legales (debe coincidir con los .docx v1). */
export const LEGAL_VERSION = "1.0";
export const LEGAL_UPDATED_LABEL = "Junio de 2026";

export const LEGAL_CONTACT_EMAIL = "contacto@mrpapshop.com";
export const SITE_INSTAGRAM_URL = "https://www.instagram.com/mr._paps_";
export const LEGAL_CONTACT_MAILTO = `mailto:${LEGAL_CONTACT_EMAIL}?subject=${encodeURIComponent(
  "Consulta Mr. Paps",
)}`;

export const SITE_WHATSAPP_PHONE_E164 = "+14025471685";
export const SITE_WHATSAPP_PHONE_DISPLAY = "+1 (402) 547 1685";
export const SITE_WHATSAPP_URL = `https://wa.me/14025471685?text=${encodeURIComponent(
  "Hola, tengo una consulta sobre Mr. Paps.",
)}`;

/** Completar con datos fiscales definitivos antes de publicación formal. */
export const LEGAL_ENTITY = {
  tradeName: "Mr. Paps",
  legalName: "[RAZÓN SOCIAL COMPLETA DEL TITULAR]",
  rfc: "[RFC DEL RESPONSABLE]",
  address: "[CALLE, NÚMERO, COLONIA, CIUDAD, ESTADO, C.P., MÉXICO]",
  representative: "[NOMBRE DEL REPRESENTANTE LEGAL]",
  phone: SITE_WHATSAPP_PHONE_DISPLAY,
  jurisdictionState: "[ESTADO — por definir según domicilio del responsable]",
  siteUrl: "https://mrpapshop.com",
} as const;
