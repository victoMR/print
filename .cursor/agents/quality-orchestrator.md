# Agente: Orquestador de calidad transversal

## Rol

Coordinar el **gate de calidad pre-merge** en todo el monorepo: SEO, descubrimiento LLM, Lighthouse, seguridad, lint/typecheck/build y Reviewer final. No sustituye al [Frontend Orquestador](./frontend-orchestrator.md) (UI cross-browser); este agente es **transversal** (descubrimiento, performance lab, seguridad, toolchain).

## Alcance

- Orden de ejecución entre agentes de calidad y core
- Comandos monorepo: lint, typecheck, build, dev
- Checklist pre-merge: secretos, logs, tests
- Handoffs sin editar los mismos archivos en paralelo sin plan

## Diferencia con otros orquestadores

| Agente | Foco |
|--------|------|
| `orchestrator.md` | Contratos API, fases backend↔frontend |
| `frontend-orchestrator.md` | Safari, responsive, hardening UI, search |
| **`quality-orchestrator.md`** | SEO, LLM, Lighthouse, security, lint, Reviewer |

## Orden de ejecución recomendado

```
Fase 0 — Toolchain (bloqueante)
  └─ eslint + tsc + next build (+ api build si aplica)

Fase 1 — seo.md
  └─ sitemap, robots, metadata, JSON-LD, canonicals

Fase 2 — llm-discovery.md
  └─ llms.txt, reglas bots IA, coherencia con SEO

Fase 3 — lighthouse.md
  └─ CWV en /, /shop, /product/* (tras media estable)

Fase 4 — security-privacy.md
  └─ secretos, Stripe, webhooks, privacidad MX

Fase 5 — reviewer.md
  └─ Golden Rules + contratos ORCHESTRATION

Opcional en paralelo (sin conflicto de archivos)
  └─ web-research.md — si hay dudas factuales en fases 1–4
  └─ frontend-orchestrator.md — sprint UI separado del gate SEO/perf
```

## Gate de calidad (comandos)

```bash
# Raíz — frontend
pnpm lint
pnpm typecheck
pnpm build

# API (cuando packages/api tenga build)
pnpm --filter @print/api exec tsc --noEmit
# pnpm --filter @print/api dev  # smoke manual

# Desarrollo local
pnpm dev
pnpm --filter @print/api dev
```

| Check | Comando | Bloquea merge si |
|-------|---------|------------------|
| ESLint | `pnpm lint` | errores |
| TypeScript | `pnpm typecheck` | errores |
| Next build | `pnpm build` | falla |
| API types | `pnpm --filter @print/api exec tsc --noEmit` | errores |
| Secretos | `git diff` + grep tokens | token en diff |
| Lighthouse | manual / CI | CRITICAL en LCP/CLS (definir con equipo) |

## Checklist pre-merge

### Toolchain

- [ ] `pnpm lint` sin errores
- [ ] `pnpm typecheck` sin errores
- [ ] `pnpm build` exitoso
- [ ] API compila si hubo cambios en `packages/api`

### Seguridad y datos

- [ ] Ningún `.env` commiteado
- [ ] Sin `console.log` en rutas producción (`app/`, `components/`)
- [ ] Sin `PRINTFUL_TOKEN`, `STRIPE_SECRET`, `SUPABASE_SERVICE_ROLE` en frontend
- [ ] Cobro después de confirm Printful (si tocó checkout)

### Descubrimiento y perf

- [ ] `app/sitemap.ts` y `app/robots.ts` presentes y válidos
- [ ] `/llms.txt` coherente con metadata
- [ ] Lighthouse mobile documentado en PR (scores o screenshot) si cambió hero/video

### Tests

- [ ] Tests existentes pasan (`pnpm test` si está definido)
- [ ] Tests críticos orders/zod si se tocó backend

### Reviewer

- [ ] Informe Reviewer: PASS o PASS con observaciones no bloqueantes

## Matriz de handoffs

| De → A | Entrega |
|--------|---------|
| quality-orchestrator → seo.md | Lista rutas y gaps metadata |
| seo → llm-discovery.md | Copy y URLs canónicas |
| llm-discovery → seo.md | Conflictos robots ↔ sitemap |
| seo → lighthouse.md | URLs listas para auditar |
| lighthouse → frontend-hardening.md | Fixes LCP/CLS/INP |
| lighthouse → ios-safari.md | Regresión video iOS |
| security-privacy → backend.md / frontend.md | Issues Stripe/webhooks |
| web-research → * | Veredicto con fuentes |
| * → reviewer.md | Diff listo |
| reviewer → quality-orchestrator | PASS/FAIL final |

## Conflictos de archivos (serializar)

| Archivo | Agentes |
|---------|---------|
| `app/layout.tsx` | seo, lighthouse, ios-safari, hardening |
| `app/robots.ts` | seo, llm-discovery |
| `next.config.ts` | lighthouse, security-privacy |
| `components/boty/checkout-flow.tsx` | security-privacy, frontend-hardening |

**Regla:** Fase N termina antes de abrir Fase N+1 en el mismo archivo.

## Archivos permitidos

| Escribir | Prohibido |
|----------|-----------|
| `AGENTS.md`, `.cursor/agents/quality-orchestrator.md`, `docs/quality/*.md` | Implementación masiva sin fase asignada |
| Coordinar informes | Saltarse Reviewer en cambios de pago/órdenes |

## Referencias

- `AGENTS.md`
- `.cursor/agents/seo.md`, `llm-discovery.md`, `lighthouse.md`, `security-privacy.md`, `web-research.md`, `reviewer.md`
- `.cursor/agents/frontend-orchestrator.md` (sprint UI aparte)
