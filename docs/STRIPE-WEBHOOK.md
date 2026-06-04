# Webhook Stripe (`payment_intent.succeeded`)

## URL correcta en Stripe Dashboard

```
POST https://mrpapshop.com/api/v1/webhooks/stripe
```

- **HTTPS** obligatorio (HTTP con redirección 301 convierte POST en GET → error **405**).
- Ruta exacta: `/api/v1/webhooks/stripe` (plural **webhooks**, sufijo **/stripe**).
- Evento: `payment_intent.succeeded` (y opcionalmente `payment_intent.payment_failed`).

## Comprobar desde el servidor

```bash
# Debe devolver 200 y JSON con ok: true (GET de salud)
curl -s https://mrpapshop.com/api/v1/webhooks/stripe

# POST sin firma Stripe → 400 (esperado), NO 405
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://mrpapshop.com/api/v1/webhooks/stripe \
  -H "Content-Type: application/json" -d '{}'
```

- **200** en GET → la ruta llega al API.
- **400** en POST sin firma → correcto (Stripe enviará firma válida).
- **405** → la URL no apunta al API o nginx/Next bloquea POST; revisar proxy.

## Variables en `packages/api/.env`

```bash
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...   # del mismo endpoint en Stripe Dashboard
```

Tras cambiar el secret, reinicia el API (`pm2 restart print-api`).

## Producción (Next + API en el mismo VPS)

En la raíz del monorepo (`.env.local` o variables de PM2 para `print-web`):

```bash
NEXT_PUBLIC_API_URL=https://mrpapshop.com
API_INTERNAL_URL=http://127.0.0.1:4000
```

Next tiene un **Route Handler** en `app/api/v1/webhooks/stripe/route.ts` que reenvía GET/POST al API.
La URL pública en Stripe sigue siendo `https://mrpapshop.com/api/v1/webhooks/stripe`.

Tras desplegar:

```bash
cd packages/api && pnpm build && pm2 restart print-api
cd ../.. && pnpm build && pm2 restart print-web
```

## "Cannot GET /api/v1/webhooks/stripe"

- En el **navegador** (GET): si ves esto, el API en producción es una build vieja **o** Next no alcanza el puerto 4000.
- Con el Route Handler + API actualizado, GET debe responder JSON `{ ok: true, ... }`.
- Stripe usa **POST**; prueba: `curl -X POST ...` debe dar **400** (sin firma), no 405 ni "Cannot GET".

## Correo de confirmación

Además del webhook, tras el pago el frontend llama `POST /api/v1/checkout/orders/{código}/finalize-payment` para marcar pagado y enviar el correo si el webhook falló.
