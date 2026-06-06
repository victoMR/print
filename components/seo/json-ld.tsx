type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

/** Renders schema.org JSON-LD in the document head (server components). */
export function JsonLd({ data }: JsonLdProps) {
  // Escape </script> to prevent XSS when product names/descriptions contain it.
  // JSON.stringify does not escape angle brackets by default.
  const safe = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
