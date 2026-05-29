# Base de datos — Supabase (Mr. Paps)

El backend usa **Supabase** con `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (solo servidor).

## Migración actual (obligatoria)

Ejecuta en **SQL Editor** de Supabase el archivo:

**[`supabase/migrations/003_mrpaps_core.sql`](../../../supabase/migrations/003_mrpaps_core.sql)**  
**[`supabase/migrations/004_mrpaps_admin_auth.sql`](../../../supabase/migrations/004_mrpaps_admin_auth.sql)** (rol + password_hash)

Crea tablas con prefijo `mrpaps_*`:

| Tabla | Uso |
|-------|-----|
| `mrpaps_users` | Cuentas opcionales (email, teléfono, RFC) |
| `mrpaps_addresses` | Direcciones guardadas por usuario |
| `mrpaps_designs` | Archivos de diseño |
| `mrpaps_products` | Catálogo |
| `mrpaps_product_variants` | Variantes + **inventario** (stock) |
| `mrpaps_orders` | Pedidos (estados: pedido → impreso → enviado) |
| `mrpaps_order_items` | Líneas del pedido |
| `mrpaps_order_status_events` | Historial de cambios de estado |

Incluye datos de ejemplo (camiseta clásica + 5 variantes) si la tabla de productos está vacía.

Las migraciones `001_init.sql` / `002_*` (Printful) son **legacy**; ya no las usa el flujo v1.

## Variables API

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_JWT_SECRET=              # mín. 32 caracteres; firma sesiones admin

# Crear primer admin (una vez, local):
# ADMIN_SEED_EMAIL=admin@mrpaps.mx ADMIN_SEED_PASSWORD='...' pnpm --filter @print/api seed:admin
```

El panel `/admin` usa login (JWT); **no** expone `SUPABASE_SERVICE_ROLE_KEY` ni contraseñas al navegador.

## Repositorios Mr. Paps

| Archivo | Tablas |
|---------|--------|
| `mrpaps-products.repository.ts` | productos, variantes, stock |
| `mrpaps-orders.repository.ts` | pedidos, ítems, estados |
| `mrpaps-designs.repository.ts` | diseños |
| `mrpaps-users.repository.ts` | usuarios y direcciones |
