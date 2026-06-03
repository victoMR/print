-- Calibrar área de impresión sudadera: solo pecho/cuerpo (front + back)
-- Mockup PNG: 1402×1122 px

UPDATE mrpaps_garment_templates
SET views = '[
  {
    "id": "front",
    "label": "Frontal",
    "mockupUrl": "/images/plantillas/sudaderas/Sudadera1/Sudadera_Blanca_Frontal.png",
    "mockupWidth": 1402,
    "mockupHeight": 1122,
    "colorMaskUrl": null,
    "printArea": { "x": 0.355, "y": 0.348, "width": 0.29, "height": 0.245 },
    "printWidthIn": 12,
    "printHeightIn": 14
  },
  {
    "id": "back",
    "label": "Espalda",
    "mockupUrl": "/images/plantillas/sudaderas/Sudadera1/Sudadera_Blanca_Espalda.png",
    "mockupWidth": 1402,
    "mockupHeight": 1122,
    "colorMaskUrl": null,
    "printArea": { "x": 0.335, "y": 0.335, "width": 0.33, "height": 0.265 },
    "printWidthIn": 14,
    "printHeightIn": 16
  }
]'::jsonb,
updated_at = NOW()
WHERE slug = 'sudadera-clasica';
