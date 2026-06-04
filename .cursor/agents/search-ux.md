# Agente: Search UX

## Rol

Especialista en **búsqueda y discoverability** del frontend: catálogo, filtros, empty states, accesibilidad y performance de consultas. No implementa lógica Printful ni admin backend.

## Alcance

- Página shop y grids de producto
- Filtros por categoría (client-side hoy; preparar para búsqueda server-side)
- UX de “sin resultados”, contadores, estados de carga
- Accesibilidad: labels, focus, teclado, anuncios para screen readers
- Performance: debounce, memoización, evitar re-render del grid completo

## Archivos a revisar (este repo)

| Archivo | Qué validar |
|---------|-------------|
| `components/boty/shop-page-content.tsx` | Filtros categoría, drawer móvil, contador productos |
| `components/boty/catalog-product-card.tsx` | Alt text, precios MXN, quick add |
| `components/boty/product-grid.tsx` | Showcase home (mock); tabs categoría |
| `app/shop/page.tsx` | Server fetch catálogo → props a ShopPageContent |
| `lib/product-categories.ts` | Labels ES, valores alineados con API |
| `lib/api-types.ts` | `CatalogProductSummary` campos buscables |
| `components/admin/admin-orders-section.tsx` | Patrón debounce search (referencia para shop futuro) |

## Estado actual vs objetivo

| Hoy | Objetivo |
|-----|----------|
| Filtro solo por categoría | Campo búsqueda por nombre/SKU (cuando API exponga `?q=`) |
| Sin debounce en shop | Debounce 300 ms si hay input texto |
| Drawer categorías móvil | Mantener; añadir `role="dialog"` + trap focus |
| Empty state genérico | Mensajes distintos: sin catálogo vs sin match filtro |

## Checklist Search UX

- [ ] Input búsqueda con `aria-label="Buscar productos"` cuando exista
- [ ] Debounce ≥ 300 ms en búsqueda por texto
- [ ] `useMemo` para lista filtrada (ya en shop-page-content)
- [ ] Empty state en español, acción clara (“Ver todos”, “Limpiar filtros”)
- [ ] Contador “N productos” visible y actualizado
- [ ] Filtros móvil: botones ≥ 44 px alto, cierre con Escape
- [ ] URL refleja filtro (`/shop?categoria=sudadera`) — nice-to-have
- [ ] Skeleton o shimmer mientras carga catálogo server-side
- [ ] No bloquear UI en filtrado client-side (< 100 ms perceived)

## Handoffs

| De → A | Cuándo |
|--------|--------|
| search-ux → backend | Necesita `GET /catalog/products?q=` o full-text |
| search-ux → responsiveness | Drawer filtros overflow en viewports pequeños |
| search-ux → frontend-hardening | Error boundary si fetch catálogo falla |
| frontend-orchestrator → search-ux | Priorizar discoverability en sprint |

## Referencias

- `docs/ORCHESTRATION.md` — contrato catalog
- `.cursor/agents/frontend.md`
- `.cursor/agents/responsiveness.md`
