/** ISO 3166-2:MX (3 letras) → código estado Envia.com (2 letras). */
export const MX_STATE_TO_ENVIA: Record<string, string> = {
  AGU: 'AG',
  BCN: 'BC',
  BCS: 'BS',
  CAM: 'CM',
  CHP: 'CS',
  CHH: 'CH',
  CMX: 'CX',
  COA: 'CO',
  COL: 'CL',
  DUR: 'DG',
  GUA: 'GT',
  GRO: 'GR',
  HID: 'HG',
  JAL: 'JA',
  MEX: 'EM',
  MIC: 'MI',
  MOR: 'MO',
  NAY: 'NA',
  NLE: 'NL',
  OAX: 'OA',
  PUE: 'PU',
  QUE: 'QE',
  ROO: 'QR',
  SLP: 'SL',
  SIN: 'SI',
  SON: 'SO',
  TAB: 'TB',
  TAM: 'TM',
  TLA: 'TL',
  VER: 'VE',
  YUC: 'YU',
  ZAC: 'ZA',
};

export function toEnviaStateCode(stateCode: string): string {
  const upper = stateCode.toUpperCase();
  if (upper.length === 2) return upper;
  return MX_STATE_TO_ENVIA[upper] ?? upper.slice(0, 2);
}
