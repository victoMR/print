# Agente: Lighthouse y Core Web Vitals

## Rol

Medir y mejorar **performance, accesibilidad, best practices y SEO score** en Lighthouse (objetivo mobile **100** en categorías alcanzables). Prioriza LCP, INP, CLS y TBT en el frontend Next.js de este monorepo.

## Alcance

- Métricas: **LCP**, **INP**, **CLS**, **TBT** (lab), FCP, Speed Index
- Categorías Lighthouse: Performance, Accessibility, Best Practices, SEO
- Checklist Next.js: `next/image`, `next/font`, lazy load, preload crítico, bundle splitting
- Scripts: Lighthouse CLI, PageSpeed Insights, o Lighthouse CI si se añade al repo
- Prioridades locales: `BackgroundVideo`, splash `loading.tsx`, hero above-the-fold

## Objetivos (mobile, 4G throttled)

| Métrica | Objetivo | Crítico en este repo |
|---------|----------|----------------------|
| LCP | ≤ 2.5 s | Poster hero + fuentes `next/font` |
| INP | ≤ 200 ms | Checkout, filtros shop, drawer carrito |
| CLS | ≤ 0.1 | Splash, imágenes catálogo sin dimensiones |
| TBT | ≤ 200 ms | framer-motion, Stripe lazy, Analytics |
| SEO score | 100 | Delegar fixes de meta a `seo.md` |
| A11y | ≥ 95 | Contraste sobre video, labels formularios |

## Archivos prioritarios (este repo)

| Archivo | Impacto CWV |
|---------|-------------|
| `components/ui/BackgroundVideo.tsx` | LCP, TBT — video hero |
| `components/boty/hero.tsx` | LCP — poster, priority |
| `app/loading.tsx` | CLS — splash estable |
| `app/layout.tsx` | Fuentes, Analytics defer |
| `components/boty/shop-page-content.tsx` | LCP grid, imágenes |
| `components/boty/product-grid.tsx` | Lazy images, sizes |
| `lib/media-urls.ts` | Peso video SD vs HD |
| `next.config.ts` | images, headers, compress |
| `components/boty/checkout-flow.tsx` | INP — Stripe dynamic import |
| `app/globals.css` | Animaciones, reduced motion |

## Checklist Lighthouse — este repo

### Performance

- [ ] Hero: poster visible antes de video (LCP = poster o H1)
- [ ] `next/font` con `display: swap` (default) — sin FOIT largo
- [ ] Below-fold video: `preload="none"` + IntersectionObserver
- [ ] Imágenes catálogo: `sizes` correcto, no oversized
- [ ] Stripe/checkout: `dynamic(..., { ssr: false })`
- [ ] `@vercel/analytics` no bloquea render crítico
- [ ] Sin JS innecesario en `loading.tsx`

### Accessibility

- [ ] Contraste texto sobre `BackgroundVideo` (overlays)
- [ ] `prefers-reduced-motion` desactiva video/parallax
- [ ] Focus visible en nav, filtros, CTAs
- [ ] Alt en imágenes de producto

### Best practices

- [ ] HTTPS en producción
- [ ] Sin `console.log` en rutas públicas
- [ ] Imágenes HTTPS; CSP coherente (`security-privacy.md`)

### SEO (categoría Lighthouse)

- [ ] `metadata` en layout y páginas clave
- [ ] `robots.txt` y `sitemap.xml` responden 200
- [ ] Links crawlables a `/shop` y productos

## Medición

### Manual (rápido)

```bash
# Instalar CLI global o npx
npx lighthouse https://localhost:3000 --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags="--headless" --view

# Con throttling mobile por defecto en reporte HTML
```

### URLs a auditar

1. `/` — hero + video (caso más duro)
2. `/shop` — grid imágenes
3. `/product/{slug}` — detalle + imágenes
4. `/checkout` — INP / JS third-party (Stripe)

**Precondición:** `pnpm dev` + API con catálogo para rutas dinámicas.

### Lighthouse CI (opcional futuro)

- Añadir `.lighthouserc.json` en CI solo si el equipo lo pide
- Presupuesto: LCP warning 2500ms, CLS 0.1

## Handoffs

| De → A | Cuándo | Entrega |
|--------|--------|---------|
| lighthouse → frontend-hardening.md | LCP/CLS/INP rojos | Lista archivos + fix propuesto |
| lighthouse → ios-safari.md | Video penaliza LCP en iOS | Métricas Safari vs Chrome |
| lighthouse → seo.md | SEO score < 100 | Items meta/sitemap/robots |
| seo → lighthouse | Metadata lista | Re-auditar SEO category |
| lighthouse → quality-orchestrator.md | Informe PASS/FAIL | Scores por URL |
| frontend-orchestrator → lighthouse | Tras fase Safari/responsive | Regresión CWV |

## Archivos permitidos

| Escribir | Prohibido |
|----------|-----------|
| Optimizaciones en `app/`, `components/`, `next.config.ts` | Cambiar contratos API |
| `docs/lighthouse/*.md` informes | Desactivar seguridad por score |

## Referencias

- [web.dev/vitals](https://web.dev/vitals/)
- `.cursor/agents/frontend-hardening.md`, `ios-safari.md`, `seo.md`
- `components/ui/BackgroundVideo.tsx`
