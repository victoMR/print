# Base de datos — Supabase (Mr. Paps)

El backend usa **Supabase** con `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (solo servidor).

## Migración actual (obligatoria)

Ejecuta en **SQL Editor** de Supabase el archivo:

**[`supabase/migrations/003_mrpaps_core.sql`](../../../supabase/migrations/003_mrpaps_core.sql)**  
**[`supabase/migrations/004_mrpaps_admin_auth.sql`](../../../supabase/migrations/004_mrpaps_admin_auth.sql)** (rol + password_hash)  
**[`supabase/migrations/005_mrpaps_garment_templates.sql`](../../../supabase/migrations/005_mrpaps_garment_templates.sql)** (plantillas + bucket Storage + composición)  
**[`supabase/migrations/006_mrpaps_templates_tshirt_cap.sql`](../../../supabase/migrations/006_mrpaps_templates_tshirt_cap.sql)** (camiseta/gorra — inactivas hasta PNG reales)  
**[`supabase/migrations/007_mrpaps_variant_color_and_templates.sql`](../../../supabase/migrations/007_mrpaps_variant_color_and_templates.sql)** (color por variante + desactivar SVG) — **obligatoria** para crear variantes (`garment_color_hex`)  
**008–011** — calibración hoodie / fulfillment manual  
**012–014** — pedidos manuales, Stripe, cuentas cliente

Crea tablas con prefijo `mrpaps_*`:

| Tabla | Uso |
|-------|-----|
| `mrpaps_users` | Cuentas opcionales (email, teléfono, RFC) |
| `mrpaps_addresses` | Direcciones guardadas por usuario |
| `mrpaps_designs` | Archivos de diseño (Storage `mrpaps-assets/designs/`) |
| `mrpaps_garment_templates` | Plantillas de prenda (mockup + área de impresión) |
| `mrpaps_products` | Catálogo (+ `template_id`, `composition`) |
| `mrpaps_product_variants` | Variantes (talla, color, precio, diseño opcional) |
| `mrpaps_orders` | Pedidos (pedido → solicitado imprenta → recibido → enviado) |
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
| `mrpaps-products.repository.ts` | productos, variantes |
| `mrpaps-garment-templates.repository.ts` | plantillas de prenda |
| `mrpaps-orders.repository.ts` | pedidos, ítems, estados |
| `mrpaps-designs.repository.ts` | diseños |
| `mrpaps-users.repository.ts` | usuarios y direcciones |

## Storage

La migración `005` crea el bucket público **`mrpaps-assets`** (PNG/JPG/WebP/SVG/PDF, máx. 20 MB).  
Subidas vía API: `POST /api/v1/admin/designs/upload` y `POST /api/v1/admin/uploads`.
