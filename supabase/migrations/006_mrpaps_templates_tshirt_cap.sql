-- Plantillas camiseta/gorra — quedan INACTIVAS en migración 007 hasta mockups PNG reales.
-- No usar SVG genéricos; añadir PNG al estilo sudaderas/Sudadera1/.
INSERT INTO mrpaps_garment_templates (slug, name, garment_type, sort_order, views)
VALUES
  (
    'camiseta-clasica',
    'Camiseta clásica',
    'tshirt',
    0,
    '[
      {
        "id": "front",
        "label": "Frontal",
        "mockupUrl": "/images/plantillas/camiseta/Camiseta_Blanca_Frontal.svg",
        "colorMaskUrl": null,
        "printArea": { "x": 0.30, "y": 0.28, "width": 0.40, "height": 0.42 },
        "printWidthIn": 12,
        "printHeightIn": 14
      },
      {
        "id": "back",
        "label": "Espalda",
        "mockupUrl": "/images/plantillas/camiseta/Camiseta_Blanca_Espalda.svg",
        "colorMaskUrl": null,
        "printArea": { "x": 0.28, "y": 0.26, "width": 0.44, "height": 0.44 },
        "printWidthIn": 14,
        "printHeightIn": 16
      }
    ]'::jsonb
  ),
  (
    'gorra-clasica',
    'Gorra clásica',
    'cap',
    2,
    '[
      {
        "id": "front",
        "label": "Frontal",
        "mockupUrl": "/images/plantillas/gorras/Gorra_Blanca_Frontal.svg",
        "colorMaskUrl": null,
        "printArea": { "x": 0.32, "y": 0.38, "width": 0.36, "height": 0.28 },
        "printWidthIn": 4,
        "printHeightIn": 2.5
      }
    ]'::jsonb
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  views = EXCLUDED.views,
  updated_at = NOW();
