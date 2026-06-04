# Agente: Responsiveness

## Rol

Garantizar **experiencia mobile-first** en todos los viewports: breakpoints, tipografía fluida, touch targets, primera pantalla (splash/hero) y spacing consistente. Complementa ios-safari en viewport físico.

## Alcance

- Breakpoints Tailwind: `sm`, `md`, `lg`, `xl`
- Tipografía escalable (no `text-7xl` fijo en móvil)
- Touch targets ≥ 44×44 px (Apple HIG)
- Hero, header, footer, shop grid en 320px–1920px
- Splash / `app/loading.tsx` sin layout shift
- Overflow horizontal cero en `main`

## Archivos a revisar (este repo)

| Archivo | Qué validar |
|---------|-------------|
| `components/boty/hero.tsx` | `min-h-[100svh]`, padding top con header + safe-area |
| `components/boty/header.tsx` | Nav móvil, logo centrado, carrito touch |
| `components/boty/product-grid.tsx` | Título responsive; grid 1→2→4 cols |
| `components/boty/feature-section.tsx` | Bento `h-[500px]` móvil vs `md:grid-rows` |
| `components/boty/shop-page-content.tsx` | Drawer filtros full-screen móvil |
| `components/boty/footer.tsx` | Columnas stack en móvil |
| `app/loading.tsx` | Centrado en cualquier altura viewport |
| `app/globals.css` | `.safe-top`, `.safe-bottom` |
| `components/checkout/CheckoutSummary.tsx` | Formularios en pantalla pequeña |

## Breakpoints de referencia (este proyecto)

| Viewport | Comportamiento esperado |
|----------|-------------------------|
| 320–639 | 1 col grids; nav hamburger; tipografía hero `text-4xl` |
| 640–1023 | 2 cols shop; filtros drawer |
| 1024+ | Nav horizontal; filtros pills; hero texto izquierda |

## Checklist Responsiveness

- [ ] Sin scroll horizontal en `/`, `/shop`, `/checkout`
- [ ] Hero legible en iPhone SE (320 px ancho)
- [ ] CTAs hero full-width móvil, auto desktop
- [ ] Header no tapa contenido (`pt-*` en páginas internas ≥ `pt-28`)
- [ ] Product grid home: título `text-4xl sm:… lg:text-7xl`
- [ ] Feature bento: altura fija móvil no rompe en landscape
- [ ] Imágenes `object-cover` sin deformación
- [ ] Modales/drawers respetan `safe-bottom` (home indicator)
- [ ] Tablas admin scroll horizontal contenido, no body
- [ ] Splash loading ocupa viewport sin saltar al hidratar

## Tipografía fluida (patrón)

```tsx
// Preferir escalas por breakpoint, no un solo tamaño grande
<h2 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
```

## Handoffs

| De → A | Cuándo |
|--------|--------|
| ios-safari → responsiveness | safe-area CSS aplicado |
| responsiveness → search-ux | Drawer filtros dimensionado |
| responsiveness → frontend-hardening | CLS en hero/splash resuelto |
| frontend-orchestrator → responsiveness | Prioridad visual mobile |

## Referencias

- `.cursor/agents/ios-safari.md`
- `.cursor/agents/frontend.md`
- Tailwind breakpoints en `app/globals.css` / `@theme`
