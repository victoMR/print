/**
 * Admin API — SIN AUTENTICACIÓN (MVP).
 * TODO: proteger con auth (JWT/session) antes de producción.
 * Endpoints expuestos solo para operación interna en desarrollo.
 */
import { Router } from 'express';
import {
  syncProductBodySchema,
  syncProductUpdateBodySchema,
} from '../../schemas/api.schema.js';
import { SyncProductInput } from '../../schemas/order.schema.js';
import * as catalogService from '../../services/catalog.service.js';
import { syncCatalogJob } from '../../jobs/syncCatalog.job.js';

export const v1AdminRouter: Router = Router();

v1AdminRouter.get('/sync-products', async (_req, res, next) => {
  try {
    const data = await catalogService.listStoreProducts();
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

v1AdminRouter.get('/sync-products/:syncProductId', async (req, res, next) => {
  try {
    const id = Number(req.params.syncProductId);
    if (!Number.isFinite(id) || id < 1) {
      res.status(400).json({ error: 'syncProductId inválido' });
      return;
    }
    const data = await catalogService.getStoreProduct(id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

v1AdminRouter.put('/sync-products/:syncProductId', async (req, res, next) => {
  try {
    const id = Number(req.params.syncProductId);
    if (!Number.isFinite(id) || id < 1) {
      res.status(400).json({ error: 'syncProductId inválido' });
      return;
    }
    const body = syncProductUpdateBodySchema.parse(req.body);
    const data = await catalogService.updateSyncProduct(id, {
      name: body.name,
      thumbnail: body.thumbnail,
      variants: body.variants?.map((v) => ({
        syncVariantId: v.syncVariantId,
        externalId: v.externalId,
        retailPrice: v.retailPrice,
        files: v.files,
      })),
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

v1AdminRouter.delete('/sync-products/:syncProductId', async (req, res, next) => {
  try {
    const id = Number(req.params.syncProductId);
    if (!Number.isFinite(id) || id < 1) {
      res.status(400).json({ error: 'syncProductId inválido' });
      return;
    }
    await catalogService.deleteSyncProduct(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

v1AdminRouter.get('/catalog', async (req, res, next) => {
  try {
    const categoryId = typeof req.query.category_id === 'string'
      ? req.query.category_id
      : undefined;
    const data = await catalogService.listCatalogProducts(categoryId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

v1AdminRouter.get('/catalog/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = await catalogService.getCatalogProduct(id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

v1AdminRouter.post('/sync-products', async (req, res, next) => {
  try {
    const body = syncProductBodySchema.parse(req.body);
    const parsed = SyncProductInput.parse({
      external_id: body.externalId,
      name: body.name,
      thumbnail: body.thumbnail,
      variants: body.variants.map((v) => ({
        external_id: v.externalId,
        variant_id: v.variantId,
        retail_price: v.retailPrice,
        sku: v.sku,
        files: v.files,
      })),
    });
    const data = await catalogService.createSyncProduct(parsed);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

v1AdminRouter.post('/sync-catalog', async (_req, res, next) => {
  try {
    await syncCatalogJob();
    res.json({ data: { message: 'Catálogo sincronizado a Supabase' } });
  } catch (err) {
    next(err);
  }
});
