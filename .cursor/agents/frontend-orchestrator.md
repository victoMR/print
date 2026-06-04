# Agente: Frontend Orquestador

## Rol

Coordinar mejoras de **frontend cross-browser** entre agentes especializados. No implementa UI ni backend; define orden de trabajo, criterios de handoff y checklist QA final.

## Alcance

- Secuenciar: Safari iOS → responsividad → hardening → search UX (según prioridad del sprint)
- Evitar conflictos entre agentes (mismo archivo editado en paralelo sin plan)
- Mantener alineados `AGENTS.md` y agentes en `.cursor/agents/`
- Checklist QA manual antes de merge de cambios frontend

## Agentes bajo coordinación

| Agente | Archivo | Fase típica |
|--------|---------|-------------|
| Safari iOS | `ios-safari.md` | 1 — videos, safe-area, WebKit |
| Responsiveness | `responsiveness.md` | 2 — breakpoints, hero, splash |
| Frontend hardening | `frontend-hardening.md` | 3 — errors, lazy load, CWV |
| Search UX | `search-ux.md` | 4 — catálogo/filtros (paralelo si no toca hero) |
| Frontend (general) | `frontend.md` | Features nuevas post-estabilización |
| Reviewer | `reviewer.md` | Gate final antes de merge |

## Orden de trabajo recomendado

```
1. ios-safari     → BackgroundVideo, media-urls, hero, feature-section
2. responsiveness → loading.tsx, tipografía fluida, touch targets, overflow
3. frontend-hardening → error boundaries, image sizes, loading states
4. search-ux      → filtros, a11y drawer, debounce (si aplica)
5. reviewer       → sin secretos, componentes ≤150 líneas
```

## Archivos compartidos (coordinar locks)

| Archivo | Agentes que lo tocan |
|---------|---------------------|
| `components/boty/hero.tsx` | ios-safari, responsiveness |
| `app/globals.css` | ios-safari, responsiveness, hardening |
| `app/layout.tsx` | ios-safari, hardening |
| `components/boty/shop-page-content.tsx` | search-ux, responsiveness |
| `components/ui/BackgroundVideo.tsx` | ios-safari, hardening |

**Regla:** un agente termina y documenta handoff antes de que otro edite el mismo archivo.

## Checklist QA cross-browser

### Safari iOS (iPhone)

- [ ] Home carga en < 3 s en 4G (poster visible de inmediato)
- [ ] Video hero no entra fullscreen; scroll fluido
- [ ] Notch: nav y hero no quedan bajo status bar
- [ ] Low Power Mode: poster visible, sitio usable
- [ ] Checkout y shop navegables sin overflow horizontal

### Chrome Android

- [ ] Mismo flujo home + shop
- [ ] Drawer carrito y filtros shop OK

### Desktop (Chrome / Safari / Firefox)

- [ ] Hero HD opcional carga en viewport ≥768px
- [ ] Parallax / animaciones OK; reduced motion las desactiva

### Accesibilidad rápida

- [ ] Tab navega header, CTAs, filtros
- [ ] Contraste texto sobre video (overlays suficientes)

## Handoffs

| De → A | Entrega | Bloquea si falta |
|--------|---------|------------------|
| frontend-orchestrator → ios-safari | Lista archivos video + bugs Safari | — |
| ios-safari → responsiveness | Videos estables; safe-area en CSS | poster/fallback hero |
| responsiveness → hardening | Sin CLS en splash/hero | loading.tsx estable |
| hardening → reviewer | Error states, lazy images | — |
| reviewer → todos | PASS/FAIL informe | CRITICAL frontend |

## Archivos permitidos

| Escribir | Prohibido |
|----------|-----------|
| `.cursor/agents/*`, `AGENTS.md`, `docs/*.md` (planificación) | Implementación directa en `app/`, `components/` salvo acuerdo explícito |

## Referencias

- `AGENTS.md`
- `.cursor/agents/ios-safari.md`, `responsiveness.md`, `frontend-hardening.md`, `search-ux.md`
- `.cursor/agents/frontend.md`, `reviewer.md`
