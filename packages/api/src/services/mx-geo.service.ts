import axios from 'axios';
import {
  MX_STATE_CATALOG,
  inegiCveEntFromStateCode,
  stateCodeFromInegiCveEnt,
  stateNameFromCode,
} from '../lib/mx-inegi-state.js';
import { NotFoundError } from '../types/errors.js';
import { logger } from '../lib/logger.js';

const INEGI_BASE = 'https://gaia.inegi.org.mx/wscatgeo/v2';
const SEPOMEX_BASE = 'https://sepomex.nitrostudio.com.mx/api/latest';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type CacheEntry<T> = { expiresAt: number; value: T };
const municipalityCache = new Map<string, CacheEntry<GeoMunicipality[]>>();

const inegiClient = axios.create({
  baseURL: INEGI_BASE,
  timeout: 12_000,
  headers: { Accept: 'application/json' },
});

const sepomexClient = axios.create({
  baseURL: SEPOMEX_BASE,
  timeout: 12_000,
  headers: { Accept: 'application/json' },
});

export type GeoStateDto = {
  cveEnt: string;
  stateCode: string;
  name: string;
};

export type GeoMunicipality = {
  cveMun: string;
  cveGeo: string;
  name: string;
};

export type GeoColonyDto = {
  name: string;
  type: string;
};

export type PostalLookupDto = {
  zip: string;
  stateCode: string;
  stateName: string;
  municipality: string;
  city: string;
  colonies: GeoColonyDto[];
};

type InegiMunicipalityRow = {
  cvegeo: string;
  cve_ent: string;
  cve_mun: string;
  nomgeo: string;
};

type SepomexPostcodeRow = {
  d_codigo: string;
  d_asenta: string;
  d_tipo_asenta: string;
  d_mnpio: string;
  d_estado: string;
  d_ciudad: string;
  c_estado: string;
};

export function listStates(): GeoStateDto[] {
  return MX_STATE_CATALOG.map((s) => ({
    cveEnt: s.cveEnt,
    stateCode: s.stateCode,
    name: s.name,
  }));
}

export async function listMunicipalitiesByStateCode(stateCode: string): Promise<GeoMunicipality[]> {
  const cveEnt = inegiCveEntFromStateCode(stateCode);
  if (!cveEnt) throw new NotFoundError('Estado no encontrado');

  const cached = municipalityCache.get(cveEnt);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  try {
    const { data } = await inegiClient.get<{ datos: InegiMunicipalityRow[] }>(`/mgem/${cveEnt}`);
    const rows = Array.isArray(data.datos) ? data.datos : [];
    const municipalities = rows
      .map((row) => ({
        cveMun: row.cve_mun,
        cveGeo: row.cvegeo,
        name: row.nomgeo,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));

    municipalityCache.set(cveEnt, { value: municipalities, expiresAt: Date.now() + CACHE_TTL_MS });
    return municipalities;
  } catch (err) {
    logger.warn({ err, stateCode, cveEnt }, 'INEGI municipios no disponibles');
    throw new NotFoundError('No se pudieron cargar los municipios. Intenta de nuevo.');
  }
}

export async function lookupPostalCode(rawZip: string): Promise<PostalLookupDto> {
  const zip = rawZip.replace(/\D/g, '').slice(0, 5);
  if (zip.length !== 5) throw new NotFoundError('Código postal inválido');

  try {
    const { data, status } = await sepomexClient.get<{
      data?: { postcodes?: SepomexPostcodeRow[] };
      error?: string | null;
    }>(`/cp/${zip}.json`);

    if (status === 404 || !data.data?.postcodes?.length) {
      throw new NotFoundError('Código postal no encontrado');
    }

    const rows = data.data.postcodes;
    const first = rows[0]!;
    const stateCode = stateCodeFromInegiCveEnt(first.c_estado.padStart(2, '0'));
    if (!stateCode) throw new NotFoundError('Estado del código postal no reconocido');

    const colonyMap = new Map<string, GeoColonyDto>();
    for (const row of rows) {
      const name = row.d_asenta.trim();
      if (!name) continue;
      colonyMap.set(name, { name, type: row.d_tipo_asenta.trim() || 'Colonia' });
    }

    const colonies = [...colonyMap.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
    const municipality = first.d_mnpio.trim();
    const city = (first.d_ciudad?.trim() || municipality) || municipality;

    return {
      zip,
      stateCode,
      stateName: stateNameFromCode(stateCode) ?? first.d_estado.trim(),
      municipality,
      city,
      colonies,
    };
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    logger.warn({ err, zip }, 'SEPOMEX lookup falló');
    throw new NotFoundError('No se pudo consultar el código postal. Verifica los 5 dígitos.');
  }
}
