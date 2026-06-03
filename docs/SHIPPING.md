# Cotización de envíos (México)

## Resumen de costos de API

| Proveedor | Cotizar (`/ship/rate/`) | Generar guía | Notas |
|-----------|-------------------------|--------------|--------|
| **Envia.com** | Sin cargo por consulta en cuenta activa | Se cobra al crear etiqueta | DHL, Estafeta, FedEx, Paquetexpress, etc. Sandbox gratis para desarrollo. |
| **Tabla local** | Gratis | N/A | Fallback fijo (99/179 MXN + piezas) si no hay token. |

No hay API pública gratuita oficial de DHL México solo para cotizar; los agregadores (Envia, Skydropx, Pakke) unifican varias paqueterías con una sola integración.

## Variables de entorno (`packages/api` / raíz `.env`)

```bash
# Proveedor: envia | local (default: envia si hay token, si no local)
SHIPPING_PROVIDER=envia

# Envia.com — token en ship-test.envia.com (sandbox) o envia.com (producción)
ENVIA_API_TOKEN=
ENVIA_SANDBOX=true
ENVIA_CARRIERS=estafeta,dhl,fedex,paquetexpress

# Origen del paquete (tu bodega / imprenta)
SHIP_ORIGIN_NAME=Mr. Paps
SHIP_ORIGIN_PHONE=+526641234567
SHIP_ORIGIN_STREET=Calle ejemplo 123
SHIP_ORIGIN_CITY=Tijuana
SHIP_ORIGIN_STATE=BCN
SHIP_ORIGIN_ZIP=22000

# Paquete tipo (sudadera ~0.5 kg)
SHIP_PACKAGE_WEIGHT_KG=0.45
SHIP_PACKAGE_WEIGHT_KG_PER_ITEM=0.35
SHIP_PACKAGE_LENGTH_CM=35
SHIP_PACKAGE_WIDTH_CM=28
SHIP_PACKAGE_HEIGHT_CM=8

# Checkout: margen sobre costo real (ej. 12%)
SHIPPING_CUSTOMER_MARKUP_PERCENT=12
```

## Panel admin

**Pedidos → Cotizador de envío**: muestra tu **costo** sin margen (lo que pagarías al imprimir la guía).

## Checkout (cliente)

Usa las mismas cotizaciones + `SHIPPING_CUSTOMER_MARKUP_PERCENT`. Si Envia falla, vuelve a tarifas locales estimadas.

## Endpoints

- `POST /api/v1/checkout/shipping-rates` — cliente (con margen)
- `POST /api/v1/admin/shipping/quote` — admin (costo real)
