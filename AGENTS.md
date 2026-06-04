# Agentes — Print (Printful México)

Guía rápida para agentes de IA y desarrolladores. **Leer primero:** [`.cursorrules`](./.cursorrules).

## Definiciones de agentes

### Core (monorepo / API)

| Agente | Archivo | Responsabilidad |
|--------|---------|-----------------|
| Orquestador | [`.cursor/agents/orchestrator.md`](./.cursor/agents/orchestrator.md) | Contratos, orden de integración, handoffs |
| Backend | [`.cursor/agents/backend.md`](./.cursor/agents/backend.md) | `packages/api` — Express, Printful, DB, jobs |
| Frontend | [`.cursor/agents/frontend.md`](./.cursor/agents/frontend.md) | Next.js App Router, UI glass/parallax |
| Reviewer | [`.cursor/agents/reviewer.md`](./.cursor/agents/reviewer.md) | Golden Rules, Zod, lifecycle, estructura |

### Frontend especializado (cross-browser / UX)

| Agente | Archivo | Cuándo usarlo |
|--------|---------|---------------|
| Frontend Orquestador | [`.cursor/agents/frontend-orchestrator.md`](./.cursor/agents/frontend-orchestrator.md) | Planificar sprint de mejoras UI; orden entre agentes; checklist QA cross-browser |
| Safari iOS | [`.cursor/agents/ios-safari.md`](./.cursor/agents/ios-safari.md) | Videos trabados, autoplay, WebKit, safe-area, reduced motion en iPhone/iPad |
| Responsiveness | [`.cursor/agents/responsiveness.md`](./.cursor/agents/responsiveness.md) | Mobile-first, breakpoints, hero/splash, overflow, touch targets |
| Frontend Hardening | [`.cursor/agents/frontend-hardening.md`](./.cursor/agents/frontend-hardening.md) | Error boundaries, hydration, lazy load, imágenes/video, Core Web Vitals |
| Search UX | [`.cursor/agents/search-ux.md`](./.cursor/agents/search-ux.md) | Catálogo, filtros, búsqueda, empty states, a11y en `/shop` |

### Calidad y descubrimiento (transversal)

| Agente | Archivo | Cuándo usarlo |
|--------|---------|---------------|
| Orquestador de calidad | [`.cursor/agents/quality-orchestrator.md`](./.cursor/agents/quality-orchestrator.md) | Gate pre-merge: lint, build, orden SEO → LLM → Lighthouse → seguridad → Reviewer |
| SEO técnico | [`.cursor/agents/seo.md`](./.cursor/agents/seo.md) | Sitemap, robots, metadata, JSON-LD, canonical en `/`, `/shop`, productos |
| Descubrimiento LLM | [`.cursor/agents/llm-discovery.md`](./.cursor/agents/llm-discovery.md) | `llms.txt`, bots IA en robots, contenido citabile para asistentes |
| Investigación web | [`.cursor/agents/web-research.md`](./.cursor/agents/web-research.md) | Verificar docs Printful/Stripe/Next.js; veredicto con fuentes |
| Lighthouse / CWV | [`.cursor/agents/lighthouse.md`](./.cursor/agents/lighthouse.md) | Performance, a11y, SEO score; prioridad hero/video y shop |
| Seguridad y privacidad | [`.cursor/agents/security-privacy.md`](./.cursor/agents/security-privacy.md) | Secretos, Stripe, webhooks, CSP, privacidad MX, Golden Rules checkout |

## Documentación

- **[`docs/ORCHESTRATION.md`](./docs/ORCHESTRATION.md)** — Monorepo, contratos REST `/api/v1`, secuencia de fases, diagramas
- **[`.env.local.example`](./.env.local.example)** — Frontend (solo `NEXT_PUBLIC_*`)
- **[`packages/api/.env.example`](./packages/api/.env.example)** — Backend (secretos)

## Monorepo

| Parte | Ubicación | Paquete |
|-------|-----------|---------|
| Frontend | Raíz (`app/`, `components/`) | `print` |
| Backend | `packages/api/` | `@print/api` |

**Persistencia:** PostgreSQL directo (`DATABASE_URL` + `pg`). Migraciones en `supabase/migrations/`; ver `packages/api/src/db/README.md`.

## Admin

Frontend admin: login en `/admin` (JWT en sessionStorage, no expone claves de Supabase).

- Panel: `/admin` — email + contraseña de usuario con `role = admin`
- Endpoints: `POST /api/v1/admin/auth/login`, `GET /api/v1/admin/auth/me`, luego `/admin/orders`, etc.

## Contratos API (resumen)

Base: `${NEXT_PUBLIC_API_URL}/api/v1`

- `GET /health` — liveness
- `GET /catalog/products` — listado
- `GET /catalog/products/:id` — detalle
- `POST /checkout/shipping-rates` — cotización envío
- `POST /checkout/estimate` — totales MXN
- `POST /checkout/orders` — pedido draft
- `GET /orders/:internalOrderId` — estado

Detalle de payloads: [`docs/ORCHESTRATION.md`](./docs/ORCHESTRATION.md).

## Orden de trabajo

1. Orquestador fija contratos (hecho en scaffold inicial).
2. Backend implementa API según `.cursorrules`.
3. Frontend consume REST (sin secretos Printful).
4. Reviewer valida antes de merge.

**Mejoras frontend / Safari:** usar [Frontend Orquestador](./.cursor/agents/frontend-orchestrator.md) → ios-safari → responsiveness → hardening (search-ux en paralelo si no compite por archivos).

**Calidad pre-merge (transversal):** [Orquestador de calidad](./.cursor/agents/quality-orchestrator.md):

```
pnpm lint && pnpm typecheck && pnpm build
  → seo → llm-discovery → lighthouse → security-privacy → reviewer
```

`web-research.md` en cualquier fase si hay dudas sobre APIs o convenciones externas. El **Frontend Orquestador** sigue siendo solo UI cross-browser; no duplica este flujo.

**SEO mínimo en repo:** `app/sitemap.ts`, `app/robots.ts`, `public/llms.txt`, `NEXT_PUBLIC_SITE_URL` en [`.env.local.example`](./.env.local.example).

## Comandos

```bash
# Frontend (raíz)
pnpm dev
pnpm lint
pnpm typecheck
pnpm build

# API (cuando exista src/index.ts y dependencias)
pnpm --filter @print/api dev
pnpm --filter @print/api exec tsc --noEmit
```
