/** Catálogo INEGI (cve_ent) ↔ ISO 3166-2:MX (3 letras) para envíos. */
export type MxStateCatalogEntry = {
  cveEnt: string;
  stateCode: string;
  name: string;
};

export const MX_STATE_CATALOG: MxStateCatalogEntry[] = [
  { cveEnt: '01', stateCode: 'AGU', name: 'Aguascalientes' },
  { cveEnt: '02', stateCode: 'BCN', name: 'Baja California' },
  { cveEnt: '03', stateCode: 'BCS', name: 'Baja California Sur' },
  { cveEnt: '04', stateCode: 'CAM', name: 'Campeche' },
  { cveEnt: '05', stateCode: 'COA', name: 'Coahuila de Zaragoza' },
  { cveEnt: '06', stateCode: 'COL', name: 'Colima' },
  { cveEnt: '07', stateCode: 'CHP', name: 'Chiapas' },
  { cveEnt: '08', stateCode: 'CHH', name: 'Chihuahua' },
  { cveEnt: '09', stateCode: 'CMX', name: 'Ciudad de México' },
  { cveEnt: '10', stateCode: 'DUR', name: 'Durango' },
  { cveEnt: '11', stateCode: 'GUA', name: 'Guanajuato' },
  { cveEnt: '12', stateCode: 'GRO', name: 'Guerrero' },
  { cveEnt: '13', stateCode: 'HID', name: 'Hidalgo' },
  { cveEnt: '14', stateCode: 'JAL', name: 'Jalisco' },
  { cveEnt: '15', stateCode: 'MEX', name: 'México' },
  { cveEnt: '16', stateCode: 'MIC', name: 'Michoacán de Ocampo' },
  { cveEnt: '17', stateCode: 'MOR', name: 'Morelos' },
  { cveEnt: '18', stateCode: 'NAY', name: 'Nayarit' },
  { cveEnt: '19', stateCode: 'NLE', name: 'Nuevo León' },
  { cveEnt: '20', stateCode: 'OAX', name: 'Oaxaca' },
  { cveEnt: '21', stateCode: 'PUE', name: 'Puebla' },
  { cveEnt: '22', stateCode: 'QUE', name: 'Querétaro' },
  { cveEnt: '23', stateCode: 'ROO', name: 'Quintana Roo' },
  { cveEnt: '24', stateCode: 'SLP', name: 'San Luis Potosí' },
  { cveEnt: '25', stateCode: 'SIN', name: 'Sinaloa' },
  { cveEnt: '26', stateCode: 'SON', name: 'Sonora' },
  { cveEnt: '27', stateCode: 'TAB', name: 'Tabasco' },
  { cveEnt: '28', stateCode: 'TAM', name: 'Tamaulipas' },
  { cveEnt: '29', stateCode: 'TLA', name: 'Tlaxcala' },
  { cveEnt: '30', stateCode: 'VER', name: 'Veracruz de Ignacio de la Llave' },
  { cveEnt: '31', stateCode: 'YUC', name: 'Yucatán' },
  { cveEnt: '32', stateCode: 'ZAC', name: 'Zacatecas' },
];

const byCveEnt = new Map(MX_STATE_CATALOG.map((s) => [s.cveEnt, s]));
const byStateCode = new Map(MX_STATE_CATALOG.map((s) => [s.stateCode, s]));

export function stateCodeFromInegiCveEnt(cveEnt: string): string | null {
  const key = cveEnt.padStart(2, '0');
  return byCveEnt.get(key)?.stateCode ?? null;
}

export function inegiCveEntFromStateCode(stateCode: string): string | null {
  return byStateCode.get(stateCode.toUpperCase())?.cveEnt ?? null;
}

export function stateNameFromCode(stateCode: string): string | null {
  return byStateCode.get(stateCode.toUpperCase())?.name ?? null;
}
