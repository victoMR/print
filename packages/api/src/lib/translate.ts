import { logger } from './logger.js';

// DeepL free-tier API keys are suffixed with ":fx" and must hit the free host;
// paid keys hit api.deepl.com. Detected automatically so no extra env var is
// needed for the common case, but DEEPL_API_URL can override it either way.
function resolveApiUrl(apiKey: string): string {
  if (process.env.DEEPL_API_URL) return process.env.DEEPL_API_URL;
  return apiKey.endsWith(':fx')
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate';
}

export function isTranslationConfigured(): boolean {
  return Boolean(process.env.DEEPL_API_KEY?.trim());
}

async function translateText(text: string, targetLang: 'EN-US'): Promise<string | null> {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    logger.debug('DEEPL_API_KEY not set; skipping auto-translation');
    return null;
  }
  if (!text.trim()) return '';

  try {
    const res = await fetch(resolveApiUrl(apiKey), {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        source_lang: 'ES',
        target_lang: targetLang,
      }),
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, 'DeepL translation request failed');
      return null;
    }

    const json = (await res.json()) as { translations?: Array<{ text?: string }> };
    return json.translations?.[0]?.text ?? null;
  } catch (err) {
    logger.warn({ err }, 'DeepL translation request errored');
    return null;
  }
}

/**
 * Best-effort ES -> EN translation of product name/description for the public
 * catalog. Never throws — a translation-API outage must not block a product
 * save; callers get nulls back and the row keeps showing Spanish until the
 * next successful attempt (or a manual admin override).
 */
export async function translateProductContent(input: {
  name: string;
  description: string;
}): Promise<{ name_en: string | null; description_en: string | null }> {
  if (!isTranslationConfigured()) {
    return { name_en: null, description_en: null };
  }

  const [name_en, description_en] = await Promise.all([
    translateText(input.name, 'EN-US'),
    translateText(input.description, 'EN-US'),
  ]);

  return { name_en, description_en };
}
