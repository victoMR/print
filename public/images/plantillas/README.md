# Plantillas de mockup

Usa **PNG fotorrealistas** o ilustraciones técnicas en el mismo estilo que la sudadera de referencia:

```
sudaderas/Sudadera1/
  Sudadera_Blanca_Frontal.png
  Sudadera_Blanca_Espalda.png
```

## Añadir camiseta o gorra

1. Coloca los PNG en carpetas como `camisetas/Camiseta1/` o `gorras/Gorra1/`.
2. Registra la plantilla en PostgreSQL (`mrpaps_garment_templates`) — las migraciones en `supabase/migrations/` incluyen seeds; también puedes insertar vía SQL o panel admin.
   - `mockupUrl`: ruta pública bajo `/images/plantillas/...`
   - `printArea`: rectángulo normalizado `{ x, y, width, height }` sobre el mockup
   - `printWidthIn` / `printHeightIn`: tamaño real de impresión en pulgadas
3. Marca `status = 'active'`.

No uses SVG genéricos: el compositor espera mockups que se vean como producto real (como los PNG de sudadera).
