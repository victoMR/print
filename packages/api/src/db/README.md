# Base de datos — PostgreSQL directo

El backend usa **`pg`** con `DATABASE_URL` (conexión TCP a PostgreSQL).

En producción (VPS): el API y Postgres corren en el mismo servidor; la DB solo escucha en `localhost`.

## Variables

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

## Repositorios

| Archivo | Tablas |
|---------|--------|
| `mrpaps-*.repository.ts` | Dominio Mr. Paps |
| `products.repository.ts` | `printful_products` (legacy) |
| `orders.repository.ts` | `printful_orders` (legacy) |
| `webhook-events.repository.ts` | `webhook_events` (legacy) |
