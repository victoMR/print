# Agente: Frontend Hardening

## Rol

Endurecer el frontend para **producción cross-browser**: error boundaries, hydration, lazy loading, optimización de media, polyfills mínimos y Core Web Vitals. No duplica lógica de negocio del backend.

## Alcance

- Error boundaries y estados de error en fetch
- Hydration mismatches (client-only APIs en SSR)
- Code splitting / dynamic import donde pese el bundle
- Imágenes: `next/image` sizes, priority solo above-fold
- Videos: delegar a `BackgroundVideo` (no duplicar lógica Safari)
- Polyfills: solo si analytics o libs lo exigen; evitar parches globales
- Métricas: LCP, CLS, INP — objetivos mobile

## Archivos a revisar (este repo)

| Archivo | Qué validar |
|---------|-------------|
| `components/ui/BackgroundVideo.tsx` | Client-only, no SSR del `<video src>` hasta active |
| `components/ui/remote-image.tsx` | Fallback si imagen remota falla |
| `lib/customer-context.tsx` | Loading inicial; no flash auth |
| `app/loading.tsx` | Splash sin CLS; sin dependencias pesadas |
| `app/layout.tsx` | Providers anidados; fonts `next/font` |
| `next.config.ts` | `images.remotePatterns`, headers |
| `lib/next-image-hosts.ts` | Hosts permitidos |
| `components/boty/checkout-flow.tsx` | Guards loading; Stripe lazy |
| `components/ui/ParallaxSection.tsx` | framer-motion — considerar reduced motion |

## Patrones

```tsx
// Dynamic import para módulos pesados (checkout, admin)
const StripeForm = dynamic(() => import("./stripe-payment-form"), {
  loading: () => <p>Cargando pago…</p>,
  ssr: false,
});
```

```tsx
// Error boundary por ruta crítica (shop, checkout)
// app/shop/error.tsx — mensaje ES, botón reintentar
```

## Checklist Hardening

- [ ] `app/error.tsx` y/o `app/shop/error.tsx` con copy español
- [ ] Ningún `window`/`document` en render SSR sin guard
- [ ] Imágenes catálogo con `sizes` acorde al grid
- [ ] Hero poster = LCP candidate (preload link opcional)
- [ ] Videos below-fold: `preload="none"` + lazy
- [ ] Client providers no bloquean first paint innecesariamente
- [ ] Analytics (`@vercel/analytics`) no rompe sin consent (si aplica)
- [ ] Lighthouse mobile: LCP < 2.5 s, CLS < 0.1 (objetivo)
- [ ] Sin console.error en producción por hydration

## Polyfills mínimos

| Necesidad | Acción |
|-----------|--------|
| IntersectionObserver | No polyfill — baseline 2024; usar poster fallback |
| `matchMedia` | Guard `typeof window !== "undefined"` |
| Smooth scroll | CSS; desactivar con reduced motion |

## Handoffs

| De → A | Cuándo |
|--------|--------|
| ios-safari → hardening | BackgroundVideo estable |
| hardening → reviewer | Error boundaries + CWV baseline |
| frontend-orchestrator → hardening | Sprint enfocado en estabilidad |
| hardening → search-ux | Skeleton catálogo si fetch lento |

## Referencias

- `.cursor/agents/ios-safari.md`
- `.cursor/agents/frontend.md`
- `next.config.ts`
