import { Router } from 'express';
import { SyncProductInput } from '../schemas/order.schema.js';
import * as catalogService from '../services/catalog.service.js';
import { usdToMxn } from '../lib/banxico.js';

export const catalogRouter: Router = Router();

catalogRouter.get('/products', async (_req, res, next) => {
  try {
    const products = await catalogService.listStoreProducts();
    res.json({ ok: true, data: products });
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/products/catalog', async (req, res, next) => {
  try {
    const categoryId = typeof req.query.category_id === 'string'
      ? req.query.category_id
      : undefined;
    const products = await catalogService.listCatalogProducts(categoryId);
    res.json({ ok: true, data: products });
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/products/catalog/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const product = await catalogService.getCatalogProduct(id);
    res.json({ ok: true, data: product });
  } catch (err) {
    next(err);
  }
});

catalogRouter.post('/products/sync', async (req, res, next) => {
  try {
    const parsed = SyncProductInput.parse(req.body);
    const result = await catalogService.createSyncProduct(parsed);
    res.status(201).json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/fx/usd-mxn', async (_req, res, next) => {
  try {
    const sampleUsd = 10;
    const mxn = await usdToMxn(sampleUsd);
    res.json({
      ok: true,
      data: { sampleUsd, mxn, note: 'Incluye buffer 5% sobre tipo de cambio' },
    });
  } catch (err) {
    next(err);
  }
});
