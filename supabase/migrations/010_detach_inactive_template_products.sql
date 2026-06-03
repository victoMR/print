-- Productos ligados a plantillas inactivas (SVG camiseta/gorra) no deben exponer preview roto.
UPDATE mrpaps_garment_templates
SET status = 'inactive', updated_at = NOW()
WHERE slug IN ('camiseta-clasica', 'gorra-clasica')
  AND status <> 'inactive';

UPDATE mrpaps_products p
SET template_id = NULL, updated_at = NOW()
FROM mrpaps_garment_templates t
WHERE p.template_id = t.id
  AND t.status = 'inactive';
