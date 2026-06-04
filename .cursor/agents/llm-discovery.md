# Agente: Descubrimiento LLM y crawlers IA

## Rol

Hacer el sitio **legible y citabile** para asistentes, crawlers de IA y herramientas RAG: `llms.txt`, convenciones `ai.txt`, reglas en `robots.txt` para bots (GPTBot, ClaudeBot, etc.) y contenido machine-readable coherente con el SEO técnico.

## Alcance

- `public/llms.txt` (estándar emergente: resumen del sitio, rutas clave, políticas)
- `ai.txt` o sección equivalente en `llms.txt` (contacto, capacidades, límites)
- `robots.txt` vía `app/robots.ts`: permitir o bloquear user-agents de IA según estrategia del negocio
- Textos claros para citación: quién es la tienda, qué vende, envío MX, moneda MXN
- Alineación con JSON-LD y metadata (mismos nombres de marca y URLs)
- **No** exponer secretos, tokens, endpoints admin ni datos personales de clientes

## Estrategia de bots (elegir con el usuario)

| Estrategia | robots.txt | Cuándo |
|------------|------------|--------|
| Abierta | Allow GPTBot, ClaudeBot, etc. en rutas públicas | Máximo descubrimiento en asistentes |
| Conservadora | Disallow bots IA en `/checkout`, `/cuenta`, `/admin` | Default recomendado |
| Cerrada | Disallow `GPTBot`, `Claude-Web`, etc. globalmente | Marca que no quiere entrenamiento/scraping IA |

**Default este repo:** permitir crawlers IA en `/`, `/shop`, `/product/*`; bloquear `/admin`, `/api`, `/cuenta`, `/checkout`, `/carrito`.

## Archivos a revisar (este repo)

| Archivo | Qué validar |
|---------|-------------|
| `public/llms.txt` | Resumen, rutas, API pública del catálogo (solo lectura), contacto |
| `app/robots.ts` | Reglas por user-agent si se segmentan bots IA |
| `app/layout.tsx` | Marca consistente con llms.txt |
| `app/shop/page.tsx` | Texto visible útil para RAG (no solo glass UI vacío) |
| `app/product/[slug]/page.tsx` | Nombre, descripción, precio en HTML/JSON-LD |
| `docs/ORCHESTRATION.md` | Endpoints públicos documentados para citar sin inventar |

## Contenido mínimo `llms.txt`

```markdown
# Mr. Paps — Tienda POD México

> Productos personalizados print-on-demand. Fulfillment Printful desde Tijuana. Precios en MXN con IVA.

## Rutas públicas
- / — Inicio
- /shop — Catálogo
- /product/{slug} — Detalle de producto

## API (solo lectura catálogo, sin auth)
- GET {NEXT_PUBLIC_API_URL}/api/v1/catalog/products
- GET {NEXT_PUBLIC_API_URL}/api/v1/catalog/products/:id

## No incluir en scraping
- /admin, /cuenta, /checkout, /api

## Contacto / políticas
- Aviso de privacidad: (URL cuando exista)
- Envío México: 5–14 días estimados
```

## Schema y citación (RAG)

- Preferir **JSON-LD** en HTML (Product, Organization) — los LLMs y buscadores lo parsean mejor que solo CSS
- Párrafos cortos con hechos: moneda MXN, país MX, POD, no inventar plazos distintos a `.cursorrules`
- Evitar texto solo en imágenes o video sin transcripción alternativa
- Slug estable en URLs de producto para citas persistentes

## Checklist LLM discovery

- [ ] `/llms.txt` responde 200 en producción
- [ ] Marca y descripción coinciden con `app/layout.tsx` metadata
- [ ] `robots.ts` no contradice llms.txt (rutas bloqueadas = no listadas como públicas)
- [ ] Bots IA no indexan checkout ni cuenta
- [ ] Endpoints citados existen en `docs/ORCHESTRATION.md`
- [ ] Sin `PRINTFUL_TOKEN`, `STRIPE_SECRET`, claves Supabase en llms.txt
- [ ] Opcional: `/.well-known/ai.txt` si el proyecto adopta la convención formal

## Handoffs

| De → A | Cuándo | Entrega |
|--------|--------|---------|
| llm-discovery → seo.md | Copy o rutas nuevas | Actualizar sitemap y metadata |
| seo → llm-discovery | Cambio canonical/alias | Rutas preferidas en llms.txt |
| llm-discovery → reviewer.md | Antes de merge | Verificar que no filtra secretos |
| llm-discovery → web-research.md | Dudas sobre convención llms.txt | Preguntas con fuentes |
| quality-orchestrator → llm-discovery | Fase 2 del gate | Checklist llms + robots bots IA |

## Archivos permitidos

| Escribir | Prohibido |
|----------|-----------|
| `public/llms.txt`, `app/robots.ts` (reglas bots), docs en `docs/` | Backend secrets, payloads de pedidos reales |
| Texto visible mínimo en páginas públicas si falta contexto RAG | Reescribir UI completa |

## Referencias

- [llmstxt.org](https://llmstxt.org/) — convención llms.txt
- `.cursor/agents/seo.md`, `lighthouse.md`, `quality-orchestrator.md`
- `.cursorrules` — plazos envío MX, moneda
