type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
  nonce?: string;
};

/** Renders schema.org JSON-LD in the document head (server components). */
export function JsonLd({ data, nonce }: JsonLdProps) {
  // Escape </script> to prevent XSS when product names/descriptions contain it.
  // JSON.stringify does not escape angle brackets by default.
  const safe = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
