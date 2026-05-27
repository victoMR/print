# Revisión de arquitectura / QA — Print (Printful MX)

**Fecha:** 2026-05-26  
**Referencia:** `.cursorrules` (Golden Rules + Hard Constraints)  
**Alcance auditado:** `packages/api/`, `app/`, `components/`, `.cursor/agents/`  
**Revisor:** agente reviewer (subagent)

---

## Resumen ejecutivo

| Área | Estado |
|------|--------|
| **Backend (`packages/api`)** | Scaffold parcial (~40% estructura). Fundamentos correctos (`printful.ts`, `callPrintful`, schemas Zod, migración SQL, Banxico con buffer 5%). Faltan boot Express, rutas, servicios de pedidos/envío/webhooks, rate limiter y jobs. |
| **Frontend (`app/`)** | Plantilla Next.js por defecto; sin integración Printful/API. Componentes ≤150 líneas: **cumple**. |
| **`components/`** | No existe — **pendiente**. |
| **Monorepo** | `pnpm-workspace.yaml` no declaraba `packages/*` → **corregido** en esta revisión. |
| **Tokens hardcodeados** | **Ninguno** detectado en código fuente. |
| **Violaciones críticas en runtime** | Ninguna en código existente (no hay checkout/cobro/webhooks implementados aún). |

**Veredicto para orchestrator:** **PASS condicional** — seguir con backend (boot + rutas + lifecycle) antes de merge a `main`. Re-ejecutar esta checklist cuando existan `index.ts`, `routes/*`, `orders.service.ts` y `webhooks.routes.ts`.

---

## Leyenda

| Símbolo | Significado |
|---------|-------------|
| ✅ | Cumple |
| ⚠️ | Parcial / pendiente de implementación |
| ❌ | Violación |
| ⏳ | Pendiente (código no existe aún) |

---

## 1. Golden Rules (1–10)

| # | Regla | Estado | Evidencia / notas |
|---|--------|--------|-------------------|
| 1 | No hardcodear tokens; `process.env.PRINTFUL_TOKEN`; throw at boot | ⚠️ | `packages/api/src/lib/printful.ts:4-6` ✅ throw si falta token. ⏳ Falta `src/index.ts` con `dotenv` + `GET /store` al arranque (`.cursorrules:38`). |
| 2 | No cobrar antes de confirmar Printful | ⏳ | Sin pasarela ni `orders.service` — validar en implementación de checkout. |
| 3 | Pedidos siempre `draft` primero; sin `?confirm=1` en creación | ⏳ | Sin `POST /orders` — revisar `orders.service.ts` cuando exista. |
| 4 | `variant_id` / `sync_variant_id`, no `product_id` en órdenes | ✅ | `schemas/order.schema.ts:28` usa `sync_variant_id`. `catalog.service.ts:29` usa `variant_id` en sync variants. `getCatalogProduct` usa `productId` solo para `GET /products/{id}` (catálogo) — OK. |
| 5 | `external_id` en sync products, variants y orders | ⚠️ | Schemas: `order.schema.ts:13`, `SyncProductInput:53-58` ✅. ⏳ Creación de órdenes aún no implementada. |
| 6 | Validar payloads con Zod antes de Printful | ⚠️ | `schemas/order.schema.ts`, `schemas/webhook.schema.ts` ✅. ⏳ Rutas que parseen body aún no existen. |
| 7 | Log en cada llamada Printful con IDs y status | ⚠️ | `services/printful.helper.ts:28-51` ✅ estructura de logs. Servicios deben pasar `printfulOrderId` / `eventType` en contexto real. |
| 8 | Rate limiter 120 req/min (y 10/60s en PUT sync) | ⏳ | No hay middleware/limiter — **bloqueante antes de producción**. |
| 9 | No confiar precios Printful como MXN; Banxico + buffer | ⚠️ | `lib/banxico.ts:3-4,37` ✅ TTL 4h + 5%. ⚠️ Stub `17.5` si no hay `BANXICO_API_TOKEN` (`:14,34`) — aceptable en dev, documentar en prod. |
| 10 | CFDI vía PAC; Printful no factura en MX | ⏳ | Sin `invoicing.service.ts`. Vars en `.env.example:22-25` ✅. |

---

## 2. Hard Constraints

| No hacer | Estado | Ubicación | Fix sugerido |
|----------|--------|-----------|--------------|
| Hardcode `Bearer pk_...` | ✅ | — | — |
| `product_id` en órdenes | ⏳ | — | Al implementar items de orden, solo `sync_variant_id`. |
| `?confirm=1` al crear | ⏳ | — | `POST /orders` sin query; confirm en paso separado. |
| Cobrar antes de confirm Printful | ⏳ | — | Orden: draft → validar → cobro → `POST .../confirm`. |
| Mostrar USD al cliente | ⏳ | Frontend + API | API debe devolver MXN strings; frontend sin precios aún. |
| Confiar webhook para refunds | ⏳ | — | Re-fetch `GET /orders/{id}` en handler de refund/fail. |
| Loop `PUT /store/products` | ⏳ | — | Batch + throttle 10/min al sync catálogo. |
| Joyería / labels custom | ⏳ | — | No catalogar jewelry; `template_type: "native"` en labels. |
| `fetch`/`axios` a Printful fuera de `lib/printful.ts` | ✅ | Solo `printful.ts` + servicios vía instancia exportada. `banxico.ts:53` usa `fetch` a Banxico — **permitido**. |
| Zod inline en routes | ⏳ | — | Importar desde `schemas/` en cada route. |
| Omitir `external_id` | ⚠️ | Schemas OK; servicios de órdenes pendientes. | — |

---

## 3. Patrones obligatorios (verificación focal)

### 3.1 Cliente Printful único

| Check | Estado | Referencia |
|-------|--------|------------|
| Una instancia Axios + axios-retry | ✅ | `packages/api/src/lib/printful.ts:8-25` |
| `Authorization` desde env | ✅ | `printful.ts:12` |
| `X-PF-Store-Id` condicional | ✅ | `printful.ts:15` |
| `X-PF-Language: es_ES` | ✅ | `printful.ts:13` |

### 3.2 `callPrintful()`

| Check | Estado | Referencia |
|-------|--------|------------|
| Helper implementado | ✅ | `packages/api/src/services/printful.helper.ts:19-61` |
| Servicios usan helper (no bare calls) | ⚠️ | `catalog.service.ts` ✅ usa `callPrintful`. ⏳ `orders`, `shipping`, `webhooks` services. |
| Errores 401/429/404/5xx mapeados | ✅ | `printful.helper.ts:53-58` |

### 3.3 Schemas Zod en `schemas/`

| Archivo | Estado | Notas |
|---------|--------|-------|
| `schemas/order.schema.ts` | ✅ | Alineado con `.cursorrules`; `mxStateCodeSchema` ✅; `SyncProductInput` max 100 variantes. |
| `schemas/webhook.schema.ts` | ✅ | Tipos de evento alineados con `.cursorrules:260-271`. |
| Schemas inline en routes | ⏳ | Sin `routes/` aún. |

### 3.4 Webhook 200-first

| Check | Estado | Referencia |
|-------|--------|------------|
| Responder 200 antes de procesar | ⏳ | `lib/queue.ts:21-29` prepara cola; falta `routes/webhooks.routes.ts`. |
| Secret en path → 404 si inválido | ⏳ | Patrón en `.cursorrules:278-281`. |
| Procesamiento async (BullMQ) | ⚠️ | Queue definida; falta worker + route. |

### 3.5 Order lifecycle (draft → confirm)

| Paso | Estado |
|------|--------|
| POST `/shipping/rates` | ⏳ |
| POST `/orders/estimate-costs` | ⏳ |
| POST `/orders` (draft) | ⏳ |
| Cobro cliente | ⏳ |
| POST `/orders/{id}/confirm` | ⏳ |
| Webhooks | ⏳ |

Migración local: `printful_orders.status` default `'draft'` ✅ — `db/migrations/001_init.sql:23`.

### 3.6 Estructura de carpetas (`packages/api/src/`)

| Carpeta / archivo | Esperado (.cursorrules) | Estado |
|-------------------|-------------------------|--------|
| `lib/printful.ts` | ✅ | ✅ |
| `lib/banxico.ts` | ✅ | ✅ |
| `lib/logger.ts` | ✅ | ✅ |
| `lib/queue.ts` | (BullMQ) | ✅ |
| `services/catalog.service.ts` | ✅ | ✅ |
| `services/orders.service.ts` | ⏳ | — |
| `services/shipping.service.ts` | ⏳ | — |
| `services/webhooks.service.ts` | ⏳ | — |
| `services/invoicing.service.ts` | ⏳ | — |
| `services/printful.helper.ts` | ✅ | ✅ |
| `routes/*.ts` | ⏳ | — |
| `jobs/*.ts` | ⏳ | — |
| `schemas/*.ts` | ✅ | ✅ |
| `db/migrations/` | ✅ | `001_init.sql` coincide con `.cursorrules` |
| `types/` | ✅ | `errors.ts`, `printful.types.ts` |
| `index.ts` (boot) | ⏳ | — |

### 3.7 Frontend — componentes ≤150 líneas

| Archivo | Líneas | Estado |
|---------|--------|--------|
| `app/layout.tsx` | 33 | ✅ |
| `app/page.tsx` | 65 | ✅ |
| `components/**` | — | ⏳ Carpeta no existe |

**Otros (frontend):**

| Check | Estado | Notas |
|-------|--------|-------|
| No llamar Printful desde browser | ✅ | Sin fetch a `api.printful.com` |
| `lang="es"` | ✅ | `app/layout.tsx:27` |
| Contenido tienda / checkout MX | ⏳ | Boilerplate Next.js en inglés |

---

## 4. Autenticación y entorno

| Check | Estado | Referencia |
|-------|--------|------------|
| `.env.example` sin secretos | ✅ | `packages/api/.env.example` |
| Vars alineadas con `.cursorrules` | ✅ | Printful, webhook, Banxico, DB, Redis, PAC, Stripe/Conekta |
| `.env` en git | ✅ | No commiteado (buscar antes de cada release) |
| `dotenv` al inicio del proceso | ⏳ | Añadir `import 'dotenv/config'` en `src/index.ts` **antes** de importar `printful.ts` |
| Validación token `GET /store` at boot | ⏳ | — |
| Job `tokenExpiry` (aviso 30 días) | ⏳ | — |
| `NEXT_PUBLIC_API_URL` (orchestrator) | ⏳ | Falta en `.env.example` raíz — añadir cuando exista frontend integrado |

---

## 5. Monorepo y agentes

| Check | Estado | Notas |
|-------|--------|-------|
| `pnpm-workspace.yaml` declara `packages/*` | ✅ | **Corregido** en esta revisión (antes solo `allowBuilds`) |
| `@print/api` en workspace | ⚠️ | Ejecutar `pnpm install` en raíz tras fix workspace |
| `.cursor/agents/orchestrator.md` | ✅ | Contratos `/api/v1` documentados |
| `.cursor/agents/backend.md` | ✅ | Checklist alineado |
| `.cursor/agents/frontend.md` / `reviewer.md` | ⏳ | Referenciados en orchestrator pero no presentes |
| `docs/ORCHESTRATION.md` | ⏳ | Referenciado; no encontrado en repo |

---

## 6. Stack obligatorio vs `package.json`

| Dependencia (.cursorrules) | `@print/api` |
|----------------------------|--------------|
| Node 20+ | ✅ `engines` |
| Express | ✅ dep; ⏳ no wired |
| Axios + axios-retry | ✅ |
| PostgreSQL | ⏳ sin cliente `pg` / migrator en deps |
| BullMQ + Redis | ✅ `bullmq`, `ioredis`, `queue.ts` |
| Zod | ✅ |
| Pino | ✅ |

---

## 7. Correcciones aplicadas en esta revisión

| Cambio | Motivo |
|--------|--------|
| `pnpm-workspace.yaml`: añadido `packages: ['packages/*']` | Sin esto, `@print/api` no participa en el workspace pnpm y `pnpm --filter @print/api` falla. |

**No aplicadas (requieren feature, no fix de 1 línea):** boot Express, rate limiter, rutas, servicios de pedidos, webhook route, jobs cron.

---

## 8. Checklist para re-revisión (cuando backend esté completo)

Copiar y marcar en el siguiente pase del reviewer:

- [ ] `src/index.ts`: `dotenv/config` → validar `GET /store` → montar Express + `pino-http`
- [ ] Rate limiter global hacia Printful (120/min) + respeto 10/min en `PUT /store/products`
- [ ] `routes/webhooks.routes.ts`: secret → 404; **`res.status(200)` antes de `await webhookQueue.add`**
- [ ] `orders.service.ts`: `POST /orders` draft; confirm separado; logs con `printful_order_id` + `internal_order_id`
- [ ] Cobro (Stripe/Conekta) **solo después** de draft válido y **antes** de confirm — orden documentada en orchestrator
- [ ] Handlers refund/fail: `GET /orders/{id}` re-fetch, no confiar solo en payload webhook
- [ ] Todos los servicios: solo `callPrintful()`, nunca `printful.*` fuera de helper
- [ ] Rutas: `OrderInput.parse()` / equivalente antes de cada llamada Printful
- [ ] Respuestas REST al frontend: precios MXN como strings `"0.00"`
- [ ] `jobs/tokenExpiry.job.ts`, `syncCatalog.job.ts`
- [ ] Frontend: `components/` ≤150 líneas; sin token Printful en cliente
- [ ] `docs/ORCHESTRATION.md` y `.env.example` raíz con `NEXT_PUBLIC_API_URL`

---

## 9. Comandos útiles para el orchestrator

```bash
# Desde raíz, tras pnpm install
pnpm --filter @print/api typecheck

# Buscar violaciones rápidas
rg -n "confirm=1|Bearer pk_|sk_live|product_id" packages/api app --glob '!node_modules'
rg -n "printful\.(get|post)" packages/api/src/services --glob '!printful.helper.ts'
wc -l app/**/*.tsx components/**/*.tsx 2>/dev/null
```

---

## 10. Historial

| Versión | Fecha | Notas |
|---------|-------|-------|
| 1.0 | 2026-05-26 | Auditoría inicial; backend en scaffold; fix `pnpm-workspace.yaml`. |
