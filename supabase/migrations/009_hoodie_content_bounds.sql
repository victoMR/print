-- Recorte de prenda (sin márgenes negros del PNG) + área pecho recalibrada

UPDATE mrpaps_garment_templates
SET views = '[
  {
    "id": "front",
    "label": "Frontal",
    "mockupUrl": "/images/plantillas/sudaderas/Sudadera1/Sudadera_Blanca_Frontal.png",
    "mockupWidth": 1402,
    "mockupHeight": 1122,
    "contentBounds": { "x": 0.2953, "y": 0.1738, "width": 0.4144, "height": 0.6346 },
    "colorMaskUrl": null,
    "printArea": { "x": 0.3989, "y": 0.3642, "width": 0.2072, "height": 0.2031 },
    "printWidthIn": 12,
    "printHeightIn": 14
  },
  {
    "id": "back",
    "label": "Espalda",
    "mockupUrl": "/images/plantillas/sudaderas/Sudadera1/Sudadera_Blanca_Espalda.png",
    "mockupWidth": 1402,
    "mockupHeight": 1122,
    "contentBounds": { "x": 0.2932, "y": 0.1756, "width": 0.4123, "height": 0.6185 },
    "colorMaskUrl": null,
    "printArea": { "x": 0.3962, "y": 0.3611, "width": 0.2061, "height": 0.1979 },
    "printWidthIn": 14,
    "printHeightIn": 16
  }
]'::jsonb,
updated_at = NOW()
WHERE slug = 'sudadera-clasica';
