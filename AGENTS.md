# Agentes — Print (Printful México)

Guía rápida para agentes de IA y desarrolladores. **Leer primero:** [`.cursorrules`](./.cursorrules).

## Definiciones de agentes

| Agente | Archivo | Responsabilidad |
|--------|---------|-----------------|
| Orquestador | [`.cursor/agents/orchestrator.md`](./.cursor/agents/orchestrator.md) | Contratos, orden de integración, handoffs |
| Backend | [`.cursor/agents/backend.md`](./.cursor/agents/backend.md) | `packages/api` — Express, Printful, DB, jobs |
| Frontend | [`.cursor/agents/frontend.md`](./.cursor/agents/frontend.md) | Next.js App Router, UI glass/parallax |
| Reviewer | [`.cursor/agents/reviewer.md`](./.cursor/agents/reviewer.md) | Golden Rules, Zod, lifecycle, estructura |

## Documentación

- **[`docs/ORCHESTRATION.md`](./docs/ORCHESTRATION.md)** — Monorepo, contratos REST `/api/v1`, secuencia de fases, diagramas
- **[`.env.example`](./.env.example)** — Variables unificadas (frontend + backend)

## Monorepo

| Parte | Ubicación | Paquete |
|-------|-----------|---------|
| Frontend | Raíz (`app/`, `components/`) | `print` |
| Backend | `packages/api/` | `@print/api` |

**Persistencia:** Supabase (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`). Migración Mr. Paps: `supabase/migrations/003_mrpaps_core.sql`; ver `packages/api/src/db/README.md`.

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

## Comandos

```bash
# Frontend (raíz)
pnpm dev

# API (cuando exista src/index.ts y dependencias)
pnpm --filter @print/api dev
```
