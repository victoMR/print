# Agente: Frontend

## Rol

Tienda Next.js (App Router) en la raíz del monorepo: catálogo, PDP, checkout UX, glassmorphism y parallax. Consumir solo la API propia (`NEXT_PUBLIC_API_URL`); nunca Printful ni secretos.

## Alcance

- Páginas y componentes bajo `app/`, `components/`
- Estilos: Tailwind; UI glass (blur, bordes semitransparentes, capas)
- Parallax en hero/secciones clave (scroll-driven, performante)
- Formularios checkout con validación MX (CP 5 dígitos, `state_code` ISO)
- Mensajes al usuario en **español**

## Archivos permitidos

| Escribir | Prohibido |
|----------|-----------|
| `app/**`, `components/**`, `lib/**` (cliente API) | `packages/api/**` |
| `public/**`, estilos globales | `PRINTFUL_TOKEN`, `DATABASE_URL`, claves PAC/Stripe server |
| `types/**` o `lib/api-types.ts` (tipos consumidor) | Llamadas directas a `api.printful.com` |
| | Componentes >150 líneas (dividir) |

## Convenciones UI

- **Máximo 150 líneas** por archivo de componente; extraer subcomponentes
- Server Components por defecto; Client Components solo para interactividad
- Fetch datos catálogo desde Server Components cuando sea posible
- Errores API: toast o banner en español; no exponer stack traces

## Integración API

Base: `process.env.NEXT_PUBLIC_API_URL` (sin trailing slash).

| Uso en UI | Endpoint |
|-----------|----------|
| Grid catálogo | `GET /api/v1/catalog/products` |
| PDP | `GET /api/v1/catalog/products/:id` |
| Checkout paso envío | `POST /api/v1/checkout/shipping-rates` |
| Resumen totales | `POST /api/v1/checkout/estimate` |
| Crear pedido | `POST /api/v1/checkout/orders` |
| Confirmación / seguimiento | `GET /api/v1/orders/:internalOrderId` |

**No implementar** confirmación de pago ni `POST` a Printful; el backend dispara confirm tras cobro.

## Diseño

- Glassmorphism: `backdrop-blur`, fondos `bg-white/10`, bordes `border-white/20`
- Parallax: preferir `transform` + `will-change`; respetar `prefers-reduced-motion`
- Precios siempre mostrados en **MXN** con formato locale `es-MX`
- Copy envío: 5–14 días totales (producción + aduana MX)

## Checklist (frontend)

- [ ] `NEXT_PUBLIC_API_URL` documentado en `.env.example`
- [ ] Cliente HTTP centralizado (ej. `lib/api-client.ts`)
- [ ] Catálogo y PDP consumen contratos acordados
- [ ] Formulario dirección: `state_code` 3 chars, `zip` 5 dígitos, `country_code` MX
- [ ] Ningún secret en bundle (`NEXT_PUBLIC_*` solo URL pública)
- [ ] Componentes ≤150 líneas
- [ ] Glass + parallax en landing sin degradar Lighthouse mobile
- [ ] RFC opcional en checkout si factura (enviar en body cuando API lo soporte)

## Referencias

- `docs/ORCHESTRATION.md`
- `.cursor/agents/orchestrator.md` (contratos)
- `.cursorrules` (reglas MX, no duplicar lógica FX en cliente)
