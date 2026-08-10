import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Locale } from "@/lib/i18n/locale";

export async function loadLegalText(filename: string): Promise<string> {
  const filePath = path.join(process.cwd(), "lib/legal", filename);
  return readFile(filePath, "utf-8");
}

const LEGAL_DOC_BY_MARKET: Record<"terminos" | "privacidad", Record<Locale, string>> = {
  terminos: {
    mx: "MrPaps_Terminos_Condiciones_v1.txt",
    us: "MrPaps_Terms_Conditions_US_v1.txt",
  },
  privacidad: {
    mx: "MrPaps_Aviso_Privacidad_v1.txt",
    us: "MrPaps_Privacy_Notice_US_v1.txt",
  },
};

/** Loads the terms/privacy text for the given market — MX (LFPDPPP-based) vs US (English). */
export async function loadLegalTextForMarket(
  doc: "terminos" | "privacidad",
  market: Locale,
): Promise<string> {
  return loadLegalText(LEGAL_DOC_BY_MARKET[doc][market]);
}
