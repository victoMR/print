# Base de datos — PostgreSQL directo

El backend usa **`pg`** con `DATABASE_URL` (conexión TCP a PostgreSQL).

En producción (VPS): el API y Postgres corren en el mismo servidor; la DB solo escucha en `localhost`.

## Variables

Copia `packages/api/.env.example` → `packages/api/.env`. **No pongas secretos en el `.env` de la raíz** (Next.js lo carga para el frontend).

```bash
DATABASE_URL=postgres://mrpaps:TU_PASSWORD@127.0.0.1:5432/mrpaps
UPLOAD_DIR=/var/lib/mrpaps/uploads          # opcional; default ./uploads
ASSETS_PUBLIC_URL=https://api.tu-dominio.mx # URLs públicas de archivos subidos
```

## Configurar PostgreSQL en el VPS (primera vez)

```bash
sudo -u postgres psql
```

```sql
CREATE USER mrpaps WITH PASSWORD 'TU_PASSWORD_SEGURO';
CREATE DATABASE mrpaps OWNER mrpaps;
GRANT ALL PRIVILEGES ON DATABASE mrpaps TO mrpaps;
\q
```

Verifica que `postgresql.conf` tenga `listen_addresses = 'localhost'` (no expongas el puerto 5432 a internet).

## Aplicar migraciones

Desde la raíz del monorepo:

```bash
pnpm --filter @print/api migrate
```

Las migraciones están en `supabase/migrations/` (001–014). El script omite bloques de Supabase Storage (005) que no aplican en PostgreSQL puro.

## Archivos subidos (diseños, previews)

Ya no usamos Supabase Storage. Los uploads se guardan en disco (`UPLOAD_DIR`) y se sirven en `/uploads/...`.

### Estructura de carpetas

```
uploads/
  _placeholders/          # Miniatura por defecto al crear producto sin foto
  products/{productId}/
    thumbnails/           # Foto de catálogo (WebP, máx. 800px)
    previews/             # Mockups del compositor (WebP, máx. 1200px)
    exports/              # Archivos de imprenta (PNG sin pérdida)
  designs/{designId}/     # Arte fuente del diseño (WebP, máx. 4096px)
  staging/{stagingId}/    # Borradores temporales (export prototipo sin producto)
```

Las imágenes de catálogo y mockups se convierten automáticamente a **WebP** (calidad 82) para reducir peso en red. Los exports de impresión se mantienen en **PNG**.

### Limpieza

- Borrar un diseño (`DELETE /admin/designs/:id`) elimina su carpeta `designs/{id}/`.
- Borrar un archivo suelto: `DELETE /admin/uploads?path=products/{id}/previews/{file}.webp`.
- Para retirar todos los assets de un producto: borra `uploads/products/{productId}/` en disco (endpoint de producto pendiente).

Parámetros de subida (`POST /admin/uploads`, multipart):

| Campo | Descripción |
|-------|-------------|
| `kind` | `thumbnails` \| `previews` \| `exports` |
| `productId` | UUID del producto (recomendado) |
| `stagingId` | UUID temporal si aún no hay producto |

## Repositorios

| Archivo | Tablas |
|---------|--------|
| `mrpaps-*.repository.ts` | Dominio Mr. Paps |
| `products.repository.ts` | `printful_products` (legacy) |
| `orders.repository.ts` | `printful_orders` (legacy) |
| `webhook-events.repository.ts` | `webhook_events` (legacy) |
