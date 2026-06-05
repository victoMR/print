/** Versión vigente de documentos legales (debe coincidir con los .docx v1). */
export const LEGAL_VERSION = "1.0";
export const LEGAL_UPDATED_LABEL = "Junio de 2026";

export const LEGAL_CONTACT_EMAIL = "contacto@mrpapshop.com";

/** Completar con datos fiscales definitivos antes de publicación formal. */
export const LEGAL_ENTITY = {
  tradeName: "Mr. Paps",
  legalName: "[RAZÓN SOCIAL COMPLETA DEL TITULAR]",
  rfc: "[RFC DEL RESPONSABLE]",
  address: "[CALLE, NÚMERO, COLONIA, CIUDAD, ESTADO, C.P., MÉXICO]",
  representative: "[NOMBRE DEL REPRESENTANTE LEGAL]",
  phone: "[TELÉFONO DE CONTACTO]",
  jurisdictionState: "[ESTADO — por definir según domicilio del responsable]",
  siteUrl: "https://mrpapshop.com",
} as const;
