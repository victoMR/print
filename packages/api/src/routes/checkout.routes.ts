import { Router } from 'express';
import {
  ConfirmOrderParams,
  OrderEstimateInput,
  OrderInput,
  ShippingRatesInput,
} from '../schemas/order.schema.js';
import * as ordersService from '../services/orders.service.js';
import * as shippingService from '../services/shipping.service.js';

export const checkoutRouter: Router = Router();

/**
 * Cotización de envío (paso 1 del checkout).
 */
checkoutRouter.post('/shipping/rates', async (req, res, next) => {
  try {
    const input = ShippingRatesInput.parse(req.body);
    const rates = await shippingService.getShippingRates(input);
    res.json({ ok: true, data: rates });
  } catch (err) {
    next(err);
  }
});

/**
 * Estimación de costos Printful (paso 2).
 */
checkoutRouter.post('/orders/estimate', async (req, res, next) => {
  try {
    const input = OrderEstimateInput.parse(req.body);
    const estimate = await ordersService.estimateOrderCosts(input);
    res.json({ ok: true, data: estimate });
  } catch (err) {
    next(err);
  }
});

/**
 * Crea pedido DRAFT en Printful. No cobra al cliente.
 */
checkoutRouter.post('/orders', async (req, res, next) => {
  try {
    const input = OrderInput.parse(req.body);
    const order = await ordersService.createDraftOrder(input);
    res.status(201).json({
      ok: true,
      data: order,
      message: 'Pedido creado como borrador. Confirme después del cobro.',
    });
  } catch (err) {
    next(err);
  }
});

checkoutRouter.get('/orders/:id', async (req, res, next) => {
  try {
    const order = await ordersService.getOrder(req.params.id);
    res.json({ ok: true, data: order });
  } catch (err) {
    next(err);
  }
});

/**
 * Confirma pedido en Printful. Cobro al cliente debe ejecutarse DESPUÉS de éxito.
 * Body opcional: { chargeCustomer: true } — stub de pago, no implementado aún.
 */
checkoutRouter.post('/orders/:printfulOrderId/confirm', async (req, res, next) => {
  try {
    const { printfulOrderId } = ConfirmOrderParams.parse({
      printfulOrderId: req.params.printfulOrderId,
      internalOrderId: req.body?.internal_order_id ?? req.body?.internalOrderId,
    });

    const internalOrderId =
      (req.body?.internal_order_id as string | undefined) ??
      (req.body?.internalOrderId as string | undefined);

    if (!internalOrderId) {
      res.status(400).json({
        ok: false,
        error: 'internal_order_id es requerido (external_id del pedido)',
      });
      return;
    }

    const order = await ordersService.confirmOrder(printfulOrderId, internalOrderId);

    // Golden Rule: charge AFTER confirm succeeds — payment integration pending
    res.json({
      ok: true,
      data: order,
      message: 'Pedido confirmado en Printful. Integrar cobro post-confirm aquí.',
    });
  } catch (err) {
    next(err);
  }
});

checkoutRouter.delete('/orders/:printfulOrderId', async (req, res, next) => {
  try {
    const printfulOrderId = Number(req.params.printfulOrderId);
    const internalOrderId = req.body?.internal_order_id as string | undefined;
    if (!internalOrderId) {
      res.status(400).json({ ok: false, error: 'internal_order_id es requerido en body' });
      return;
    }
    const order = await ordersService.cancelOrder(printfulOrderId, internalOrderId);
    res.json({ ok: true, data: order });
  } catch (err) {
    next(err);
  }
});
