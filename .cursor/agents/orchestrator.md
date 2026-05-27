# Agente: Orquestador

## Rol

Coordinar el trabajo entre **backend**, **frontend** y **reviewer**. No implementar lógica de negocio ni UI. Definir orden de integración, contratos REST públicos y criterios de handoff.

## Alcance

- Planificar secuencia: scaffold API → endpoints catalog/checkout → consumo frontend → revisión.
- Mantener alineados `docs/ORCHESTRATION.md`, contratos en esta sección y `.cursorrules`.
- Desbloquear dependencias entre agentes (tipos, env vars, rutas base).
- Resolver conflictos de estructura de carpetas sin escribir código de producto.

## Archivos permitidos (lectura/escritura)

| Acción | Rutas |
|--------|--------|
| Escribir | `.cursor/agents/*`, `docs/ORCHESTRATION.md`, `AGENTS.md`, `pnpm-workspace.yaml` (si aplica), `.env.example` (raíz) |
| Leer | Todo el repo |
| Prohibido | `packages/api/src/**`, `app/**`, `components/**`, `src/**` (implementación) |

## Contratos API (fuente de verdad para integración)

Base URL backend: `{API_URL}` (ej. `http://localhost:4000`). Prefijo público: `/api/v1`.

| Método | Ruta | Descripción | Agente dueño |
|--------|------|-------------|--------------|
| GET | `/health` | `{ "status": "ok" }` | backend |
| GET | `/api/v1/catalog/products` | Lista productos sync (MXN, paginado) | backend |
| GET | `/api/v1/catalog/products/:slugOrId` | Detalle + variantes | backend |
| POST | `/api/v1/checkout/shipping-rates` | Cotización envío (body: items + address MX) | backend |
| POST | `/api/v1/checkout/estimate` | Totales MXN (subtotal, shipping, tax, total) | backend |
| POST | `/api/v1/checkout/orders` | Crear pedido **draft** (retorna `internalOrderId`) | backend |
| GET | `/api/v1/orders/:internalOrderId` | Estado local + tracking si existe | backend |
| POST | `/api/v1/webhooks/printful/:secret` | Solo backend (Printful); frontend no llama | backend |

**Reglas de contrato**

- Precios al cliente siempre en **MXN** (strings `"1234.56"`).
- `state_code`: 3 letras ISO MX (`JAL`, `CMX`, …).
- Checkout frontend **nunca** llama a Printful directamente.
- Cobro al cliente solo después de confirmación Printful (backend orquesta).

Ver payloads detallados en `docs/ORCHESTRATION.md`.

## Orden de integración

1. Backend: `packages/api` boot + `GET /health` + estructura `src/` según `.cursorrules`.
2. Backend: catalog + checkout (draft) + webhooks stub.
3. Frontend: `NEXT_PUBLIC_API_URL` + hooks/fetch contra contratos.
4. Reviewer: Golden Rules + lifecycle + Zod + estructura.

## Handoffs

| De → A | Entrega | Bloquea si falta |
|--------|---------|------------------|
| Orquestador → Backend | Contratos + `.env.example` | — |
| Backend → Frontend | API corriendo + OpenAPI/README de endpoints | `/health` 200, catalog list 200 |
| Frontend → Reviewer | UI consume catalog + checkout estimate | tipos/errores acordados |
| Reviewer → Todos | Informe pass/fail | violaciones críticas (tokens, confirm antes de charge) |

## Checklist (orquestador)

- [ ] `.cursorrules` leído por todos los agentes antes de codificar
- [ ] `docs/ORCHESTRATION.md` refleja monorepo actual
- [ ] `.env.example` incluye `NEXT_PUBLIC_API_URL` y vars Printful/DB/Redis
- [ ] Contratos `/api/v1/*` documentados antes de que frontend implemente fetch
- [ ] Secuencia draft → charge → confirm acordada (no invertir)
- [ ] Reviewer ejecutado antes de merge a main

## Comandos de referencia

```bash
# Raíz (frontend)
pnpm dev

# API (cuando backend implemente)
pnpm --filter @print/api dev
```

## Referencias

- Reglas: `.cursorrules`
- Flujo detallado: `docs/ORCHESTRATION.md`
- Agentes: `.cursor/agents/backend.md`, `frontend.md`, `reviewer.md`
