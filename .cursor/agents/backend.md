# Agente: Backend

## Rol

Implementar API Express en `packages/api` integrando Printful, PostgreSQL, BullMQ y reglas México (Banxico, IVA, CFDI vía PAC). Exponer REST `/api/v1` al frontend; nunca exponer `PRINTFUL_TOKEN`.

## Alcance

- Cliente único Axios: `packages/api/src/lib/printful.ts`
- Servicios, rutas, schemas Zod, jobs, migraciones según `.cursorrules`
- Lifecycle de pedidos: draft → validar → cobrar (delegado a pasarela) → confirm Printful → webhooks
- Rate limiting global 120 req/min hacia Printful
- Conversión USD/EUR → MXN con Banxico + buffer 5%

## Archivos permitidos

| Escribir | Prohibido |
|----------|-----------|
| `packages/api/**` | `app/**`, `components/**`, `public/**` (Next) |
| `packages/api/src/db/migrations/**` | Hardcodear tokens |
| Tests bajo `packages/api/**/*.test.ts` | Llamadas `fetch`/`axios` a Printful fuera de `lib/printful.ts` |
| | Schemas Zod inline en routes (usar `schemas/`) |

## Estructura obligatoria (`packages/api/src/`)

```
lib/          printful.ts, banxico.ts, logger.ts
services/     catalog, orders, shipping, webhooks, invoicing
routes/       catalog.routes.ts, checkout.routes.ts, webhooks.routes.ts
jobs/         syncCatalog, retryFailed, tokenExpiry
schemas/      order.schema.ts, webhook.schema.ts, ...
db/           migrations/
types/        printful.types.ts
```

## Endpoints REST a implementar (tienda → frontend)

| Método | Ruta | Notas |
|--------|------|-------|
| GET | `/health` | Sin auth |
| GET | `/api/v1/catalog/products` | Desde DB/cache sync |
| GET | `/api/v1/catalog/products/:id` | Variantes con `sync_variant_id` |
| POST | `/api/v1/checkout/shipping-rates` | Proxy validado → Printful `/shipping/rates` |
| POST | `/api/v1/checkout/estimate` | Proxy → `/orders/estimate-costs` |
| POST | `/api/v1/checkout/orders` | Crea draft; `external_id` UUID interno |
| GET | `/api/v1/orders/:internalOrderId` | Por `external_id` o UUID local |
| POST | `/api/v1/webhooks/printful/:secret` | 200 inmediato + cola BullMQ |

## Golden Rules (backend)

1. `process.env.PRINTFUL_TOKEN` — throw at boot si falta; validar con `GET /store`
2. Pedidos siempre **draft** primero; confirm solo post-cobro exitoso
3. `variant_id` / `sync_variant_id` — nunca `product_id` en órdenes
4. `external_id` en sync products, variants y orders
5. Zod en cada entrada antes de Printful
6. `callPrintful()` en todos los servicios
7. Logs con `printful_order_id`, `internal_order_id`, `event_type`, `status_code`
8. No facturar CFDI sin RFC almacenado cuando el cliente lo pidió

## Checklist (backend)

- [ ] `packages/api/src/lib/printful.ts` — única instancia Axios + axios-retry
- [ ] Boot falla si token inválido (401 en `/store`)
- [ ] Migración `001_init.sql` aplicada (tablas `.cursorrules`)
- [ ] Schemas en `schemas/`, no en routes
- [ ] `POST /checkout/orders` crea draft sin `?confirm=1`
- [ ] Confirmación Printful solo tras webhook/callback de pago OK
- [ ] Webhook: 200 primero, procesar async; re-fetch order en refunds
- [ ] Rate limiter antes de salidas a Printful
- [ ] Precios respuesta API en MXN string `"0.00"`
- [ ] `GET /health` listo para handoff a frontend

## Variables de entorno

Usar `.env` en raíz del monorepo (ver `.env.example`). Backend lee: `PRINTFUL_*`, `DATABASE_URL`, `REDIS_URL`, `APP_URL`, `WEBHOOK_SECRET`, `BANXICO_API_TOKEN`, `PAC_*`, `STRIPE_*` / `CONEKTA_*`.

## Referencias

- `.cursorrules`
- `docs/ORCHESTRATION.md`
- Printful API: https://developers.printful.com/docs/
