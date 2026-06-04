# Agente: SEO técnico

## Rol

Optimizar **descubrimiento orgánico** en el frontend Next.js: metadata, sitemap, robots, canonical, Open Graph, Twitter Cards y JSON-LD. No implementa checkout ni lógica Printful; coordina con agentes de performance y descubrimiento LLM.

## Alcance

- Next.js App Router: `metadata`, `generateMetadata`, `app/sitemap.ts`, `app/robots.ts`
- URLs canónicas y `metadataBase` (evitar duplicados `/product` vs `/producto`)
- Meta: `title`, `description`, `keywords`, `robots`, OG, Twitter
- Structured data (JSON-LD): `Organization`, `Product`, `BreadcrumbList`, `WebSite` + `SearchAction` si aplica
- `hreflang`: solo si el sitio publica variantes de idioma/región (MX `es-MX` por defecto en `lang="es"`)
- Rutas **no indexables**: `/admin`, `/api`, `/cuenta/*`, `/login`, `/registro`, estados de pedido privados

## Archivos a revisar (este repo)

| Archivo | Qué validar |
|---------|-------------|
| `app/layout.tsx` | `metadataBase`, OG/Twitter por defecto, `lang="es"` |
| `app/sitemap.ts` | Rutas públicas + productos dinámicos |
| `app/robots.ts` | Allow/disallow alineado con privacidad |
| `app/page.tsx` | Home: título único, descripción, JSON-LD Organization |
| `app/shop/page.tsx` | Metadata catálogo; canonical `/shop` |
| `app/catalogo/page.tsx` | Redirect o canonical si duplica `/shop` |
| `app/product/[slug]/page.tsx` | `generateMetadata` + Product JSON-LD |
| `app/producto/[slug]/page.tsx` | Canonical hacia ruta preferida (evitar contenido duplicado) |
| `app/checkout/page.tsx` | `robots: { index: false }` |
| `app/carrito/page.tsx` | `noindex` si aplica |
| `public/llms.txt` | Coherente con títulos/descripciones del sitio |
| `.env.local.example` | `NEXT_PUBLIC_SITE_URL` para URLs absolutas |

## Convenciones Next.js (obligatorias)

```tsx
// layout.tsx — base para OG absolutas
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Mr. Paps — Tienda POD", template: "%s — Mr. Paps" },
  description: "...",
  openGraph: { locale: "es_MX", type: "website", siteName: "Mr. Paps" },
  twitter: { card: "summary_large_image" },
};
```

```tsx
// product/[slug]/page.tsx — Product schema
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: product.name,
  description: product.description,
  offers: { "@type": "Offer", priceCurrency: "MXN", price: "..." },
};
```

- Usar **`generateMetadata`** en rutas dinámicas; no duplicar `<head>` manual en client components
- **`alternates.canonical`** en páginas con alias (`/producto` → canonical `/product`)
- Imágenes OG: `next/image` o URL absoluta del CDN; mínimo 1200×630 cuando sea posible

## Checklist SEO — este repo

### Infraestructura

- [ ] `NEXT_PUBLIC_SITE_URL` definida en producción (sin barra final)
- [ ] `app/sitemap.ts` incluye `/`, `/shop`, productos activos (`slug` desde API)
- [ ] `app/robots.ts` bloquea `/admin`, `/api`, `/cuenta`, auth
- [ ] `public/llms.txt` accesible en `/llms.txt`

### Por ruta

| Ruta | Index | Canonical | JSON-LD | Notas |
|------|-------|-----------|---------|-------|
| `/` | sí | `/` | Organization, WebSite | Hero no debe ocultar H1 |
| `/shop` | sí | `/shop` | ItemList (opcional) | Título/descripción únicos |
| `/product/[slug]` | sí | `/product/{slug}` | Product, BreadcrumbList | Precio MXN en Offer |
| `/producto/[slug]` | noindex o redirect | → `/product/{slug}` | — | Evitar duplicado |
| `/checkout` | no | — | — | `robots: noindex, nofollow` |
| `/carrito` | no | — | — | Funnel, no SEO |
| `/admin`, `/cuenta/*` | no | — | — | En robots disallow |

### Calidad

- [ ] Títulos ≤ 60 caracteres; descripciones 150–160 caracteres
- [ ] Un solo `<h1>` por página pública
- [ ] Enlaces internos: home → shop → producto
- [ ] Sin parámetros de tracking en canonical (`?utm_*` ignorados)
- [ ] `hreflang` solo si hay rutas `/en` u otra locale documentada

## Handoffs

| De → A | Cuándo | Entrega |
|--------|--------|---------|
| seo → lighthouse.md | Tras metadata/sitemap | URLs a auditar en Lighthouse SEO category |
| seo → llm-discovery.md | Tras copy estable | Títulos/descripciones para `llms.txt` |
| llm-discovery → seo | Cambio en robots para bots IA | Reglas no conflictivas con Googlebot |
| lighthouse → seo | Score SEO < 100 | Lista fixes (meta faltante, links, tap targets) |
| seo → frontend.md | JSON-LD en componentes | Patrón `<script type="application/ld+json">` |
| seo → reviewer.md | Pre-merge | Sin secretos en metadata; noindex admin OK |

## Archivos permitidos

| Escribir | Prohibido |
|----------|-----------|
| `app/**/metadata`, `app/sitemap.ts`, `app/robots.ts`, `public/llms.txt`, componentes JSON-LD | `packages/api/**`, tokens, lógica de precios sin validar API |
| `AGENTS.md`, `.cursor/agents/seo.md` | Cambiar contratos REST |

## Referencias

- [Next.js Metadata](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Next.js sitemap.js](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
- `.cursor/agents/lighthouse.md`, `llm-discovery.md`, `quality-orchestrator.md`
- `docs/ORCHESTRATION.md` (rutas de catálogo)
