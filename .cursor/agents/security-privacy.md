# Agente: Seguridad y privacidad

## Rol

Auditar y guiar **seguridad del monorepo** y **privacidad México** en checkout (Stripe), API Express y frontend Next.js. Aplica Golden Rules de `.cursorrules` sin duplicar el documento completo.

## Alcance

- Secretos: solo `.env` / variables de entorno; nunca en código ni `NEXT_PUBLIC_*` sensibles
- Lifecycle pedido: **cobro después** de `POST /orders/{id}/confirm` exitoso
- Stripe: Payment Intents, Elements, PCI scope mínimo, sin PAN en servidor
- Email checkout → Stripe automático (`receipt_email`, Customer email, prefill Elements)
- Headers: CSP, HTTPS, HSTS (producción)
- Validación Zod, rate limiting hacia Printful y rutas públicas sensibles
- Webhooks: `WEBHOOK_SECRET` en path; Stripe signature verification
- Privacidad MX: aviso de privacidad, minimización de datos, RFC para CFDI

## Golden Rules (resumen ejecutivo — ver `.cursorrules`)

| # | Regla | Agente verifica |
|---|--------|-----------------|
| 1 | `PRINTFUL_TOKEN` solo backend | grep en `app/`, `components/` |
| 2 | No cobrar antes de confirm Printful | `orders.service`, checkout route |
| 3 | Pedidos en `draft` primero | No `?confirm=1` en create |
| 6 | Zod antes de APIs externas | `packages/api/src/schemas/` |
| 8 | Rate limiter Printful | `lib/` middleware |
| Webhooks | 200 rápido + cola; re-fetch orden | `webhooks.routes.ts` |

## Stripe (checkout)

### Obligatorio

- **Payment Intents** creados en servidor (`STRIPE_SECRET_KEY` en `packages/api` o route server-only)
- **Stripe.js + Elements** en cliente; solo `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` en frontend
- **Nunca** enviar número de tarjeta al API propio (PCI SAQ A)
- Validar **webhook Stripe** con `stripe.webhooks.constructEvent` y secret de endpoint
- Idempotency keys en creación de Intent si hay reintentos

### Email del formulario → Stripe

```tsx
// Cliente: pasar email a Elements / confirmPayment
elements.fetchUpdates();
// stripe.confirmPayment({ elements, confirmParams: { receipt_email: email } })

// Servidor: al crear Customer o PI
// customer_email, receipt_email, metadata.internal_order_id
```

- Prefill: `defaultValues.billingDetails.email` en Payment Element cuando exista sesión
- Mismo email que `recipient.email` del pedido Printful (consistencia CFDI/notificaciones)

### Prohibido

- Loggear payloads de pago completos
- Guardar PAN, CVV, o `payment_method` details en PostgreSQL
- Exponer `STRIPE_SECRET_KEY` en bundle Next

## Frontend / Next.js

| Riesgo | Mitigación |
|--------|------------|
| `PRINTFUL_TOKEN` en cliente | Solo `NEXT_PUBLIC_API_URL` |
| Admin JWT en `sessionStorage` | XSS = riesgo; CSP estricta, sanitizar inputs |
| API routes en `app/api/` | Validar secret/signature; no proxy abierto |
| CSRF en checkout | SameSite cookies si hay sesión; tokens en forms state-changing |

## Backend (`packages/api`)

- [ ] `callPrintful()` con logging sin PII excesiva
- [ ] `WEBHOOK_SECRET` en URL Printful; 404 si incorrecto
- [ ] Rate limit en login admin y checkout
- [ ] `recipient.tax_number` (RFC) opcional; almacenar cifrado o mínimo necesario para CFDI
- [ ] CORS: solo origen del storefront en producción

## CSP (orientación)

```
default-src 'self';
script-src 'self' https://js.stripe.com;
frame-src https://js.stripe.com https://hooks.stripe.com;
connect-src 'self' ${API} https://api.stripe.com;
img-src 'self' data: https:;
```

Ajustar en `next.config.ts` headers o middleware según despliegue.

## Privacidad México

- [ ] Aviso de privacidad enlazado en footer y checkout
- [ ] Datos mínimos: nombre, dirección, email, teléfono; RFC solo si factura
- [ ] Retención y finalidad documentadas (pedido, envío, CFDI)
- [ ] No vender datos; Printful como encargado de fulfillment (mencionar en aviso)
- [ ] Derechos ARCO: contacto en aviso

## Checklist pre-producción

- [ ] `.env` y `.env.local` en `.gitignore`; `.env.example` sin valores reales
- [ ] `grep` sin Bearer tokens hardcodeados
- [ ] Stripe webhook secret configurado
- [ ] HTTPS obligatorio; cookies `Secure` en prod
- [ ] Checkout `/checkout` con `noindex` (SEO) y sin datos en URL
- [ ] Errores de pago: mensaje genérico al usuario, detalle en logs servidor

## Handoffs

| De → A | Cuándo | Entrega |
|--------|--------|---------|
| security-privacy → backend.md | Cambios PI/webhooks | Spec + archivos `packages/api` |
| security-privacy → frontend.md | Elements / email prefill | Componente checkout |
| security-privacy → reviewer.md | Gate merge | PASS/FAIL seguridad |
| web-research → security-privacy | Dudas PCI/Stripe | Informe verificado |
| quality-orchestrator → security-privacy | Fase 4 del gate | Checklist completo |

## Archivos permitidos

| Escribir | Prohibido |
|----------|-----------|
| `packages/api/**` (auth, webhooks, checkout), headers Next | Commitear `.env` |
| `components/boty/checkout-flow.tsx`, Stripe forms | Desactivar validación Zod |
| Docs privacidad en `docs/` o página legal | Implementar pasarela distinta sin acuerdo |

## Referencias

- `.cursorrules` — Golden Rules, webhooks, env vars
- `.cursor/agents/backend.md`, `reviewer.md`
- [Stripe PCI](https://stripe.com/docs/security), [Payment Element](https://stripe.com/docs/payments/payment-element)
