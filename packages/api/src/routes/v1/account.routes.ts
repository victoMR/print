import { Router } from 'express';
import { z } from 'zod';
import { requireCustomerAuth } from '../../middleware/customer-auth.js';
import * as usersRepo from '../../db/mrpaps-users.repository.js';
import { publicCustomer } from '../../services/customer-auth.service.js';
import { mxStateCodeSchema } from '../../schemas/order.schema.js';
import { getCustomerOrderDetail } from '../../services/mrpaps-order-tracking.service.js';
import { formatTrackingCodeDisplay } from '../../lib/order-tracking-code.js';
const ORDER_STATUS_LABELS: Record<string, string> = {
  pendiente_pago: 'Pago pendiente',
  pedido: 'Pedido recibido',
  solicitado_imprenta: 'Solicitado a imprenta',
  recibido_imprenta: 'Recibido de imprenta',
  enviado: 'Enviado al cliente',
  cancelado: 'Cancelado',
};

export const v1AccountRouter: Router = Router();

v1AccountRouter.use(requireCustomerAuth);

// ── Perfil ──────────────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(120).optional(),
  phone: z.string().optional().nullable(),
});

v1AccountRouter.get('/profile', async (req, res, next) => {
  try {
    const user = await usersRepo.findUserByEmail(req.customerUser!.email);
    if (!user) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
    res.json({ data: publicCustomer(user) });
  } catch (err) { next(err); }
});

v1AccountRouter.patch('/profile', async (req, res, next) => {
  try {
    const body = updateProfileSchema.parse(req.body);
    const updated = await usersRepo.updateCustomer(req.customerUser!.id, {
      full_name: body.fullName,
      phone: body.phone,
    });
    res.json({ data: publicCustomer(updated) });
  } catch (err) { next(err); }
});

// ── Direcciones ─────────────────────────────────────────────────────────────

const addressSchema = z.object({
  label: z.string().min(1).max(60).default('Casa'),
  recipientName: z.string().min(1),
  phone: z.string().min(10),
  address1: z.string().min(1),
  address2: z.string().optional().nullable(),
  city: z.string().min(1),
  stateCode: mxStateCodeSchema,
  zip: z.string().regex(/^\d{5}$/),
  isDefault: z.boolean().optional(),
});

function mapAddress(a: Awaited<ReturnType<typeof usersRepo.listAddresses>>[number]) {
  return {
    id: a.id,
    label: a.label,
    recipientName: a.recipient_name,
    phone: a.phone,
    address1: a.address1,
    address2: a.address2,
    city: a.city,
    stateCode: a.state_code,
    zip: a.zip,
    isDefault: a.is_default,
  };
}

v1AccountRouter.get('/addresses', async (req, res, next) => {
  try {
    const addresses = await usersRepo.listAddresses(req.customerUser!.id);
    res.json({ data: addresses.map(mapAddress) });
  } catch (err) { next(err); }
});

v1AccountRouter.post('/addresses', async (req, res, next) => {
  try {
    const body = addressSchema.parse(req.body);
    const address = await usersRepo.saveAddress({
      user_id: req.customerUser!.id,
      label: body.label,
      recipient_name: body.recipientName,
      phone: body.phone,
      address1: body.address1,
      address2: body.address2 ?? null,
      city: body.city,
      state_code: body.stateCode,
      country_code: 'MX',
      zip: body.zip,
      is_default: body.isDefault ?? false,
    });
    res.status(201).json({ data: mapAddress(address) });
  } catch (err) { next(err); }
});

v1AccountRouter.patch('/addresses/:addressId', async (req, res, next) => {
  try {
    const body = addressSchema.partial().parse(req.body);
    const updated = await usersRepo.updateAddress(req.params.addressId, req.customerUser!.id, {
      label: body.label,
      recipient_name: body.recipientName,
      phone: body.phone,
      address1: body.address1,
      address2: body.address2,
      city: body.city,
      state_code: body.stateCode,
      zip: body.zip,
      is_default: body.isDefault,
    });
    res.json({ data: mapAddress(updated) });
  } catch (err) { next(err); }
});

v1AccountRouter.delete('/addresses/:addressId', async (req, res, next) => {
  try {
    await usersRepo.deleteAddress(req.params.addressId, req.customerUser!.id);
    res.json({ data: { deleted: true } });
  } catch (err) { next(err); }
});

// ── Pedidos ──────────────────────────────────────────────────────────────────

v1AccountRouter.get('/orders', async (req, res, next) => {
  try {
    const orders = await usersRepo.listOrdersByUser(req.customerUser!.id, req.customerUser!.email);
    res.json({
      data: orders.map((o) => ({
        publicId: o.public_id,
        trackingCode: formatTrackingCodeDisplay(o.public_id),
        orderNumber: o.order_number,
        status: o.status,
        statusLabel: (ORDER_STATUS_LABELS as Record<string, string>)[o.status] ?? o.status,
        totalMxn: Number(o.total_mxn).toFixed(2),
        orderedAt: o.ordered_at,
        itemCount: o.item_count,
      })),
    });
  } catch (err) { next(err); }
});

v1AccountRouter.get('/orders/:publicId', async (req, res, next) => {
  try {
    const data = await getCustomerOrderDetail(
      req.params.publicId,
      req.customerUser!.id,
      req.customerUser!.email,
    );
    res.json({ data });
  } catch (err) { next(err); }
});
