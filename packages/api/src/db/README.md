# Base de datos — Supabase

La persistencia del backend usa **Supabase** (`@supabase/supabase-js`) con la **service role key** (solo servidor).

## Variables

```bash
SUPABASE_URL=https://pqnyzlvwlkwvhgpcchxm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=   # Project Settings → API → service_role
```

## Aplicar migración inicial

### Opción A — Supabase Dashboard (recomendado)

1. Abre [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto.
2. Ve a **SQL Editor** → **New query**.
3. Pega el contenido de [`../../../supabase/migrations/001_init.sql`](../../../supabase/migrations/001_init.sql).
4. Ejecuta **Run**. Debes ver las tablas `printful_products`, `printful_orders` y `webhook_events` en **Table Editor**.

### Opción B — Supabase CLI

```bash
supabase link --project-ref pqnyzlvwlkwvhgpcchxm
supabase db push
```

## Repositorios

| Archivo | Tabla | Uso |
|---------|-------|-----|
| `orders.repository.ts` | `printful_orders` | Pedidos draft/confirmados |
| `webhook-events.repository.ts` | `webhook_events` | Auditoría de webhooks Printful |
| `products.repository.ts` | `printful_products` | Catálogo sync local |

La copia en `migrations/001_init.sql` se mantiene como referencia; la fuente canónica para Supabase es `supabase/migrations/001_init.sql`.
