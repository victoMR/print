import { Router } from 'express';
import * as catalogPresenter from '../../services/catalog-presenter.service.js';
import {
  parseCatalogProductsQuery,
  parseProductCategoryQuery,
  syncCartLineItems,
} from '../../services/mrpaps-catalog.service.js';
import { cartSyncBodySchema } from '../../schemas/mrpaps.schema.js';
import type { Market } from '../../lib/market.js';

export const v1CatalogRouter: Router = Router();

function parseMarketQuery(value: unknown): Market {
  return value === 'us' ? 'us' : 'mx';
}

v1CatalogRouter.get('/products', async (req, res, next) => {
  try {
    const { page, limit, q } = parseCatalogProductsQuery(
      req.query as Record<string, unknown>,
    );
    const category = parseProductCategoryQuery(req.query.category);
    const result = await catalogPresenter.listPublicProducts(
      page ?? 1,
      limit ?? 24,
      category,
      q,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

v1CatalogRouter.get('/products/:id', async (req, res, next) => {
  try {
    const market = parseMarketQuery(req.query.market);
    const data = await catalogPresenter.getPublicProduct(req.params.id, market);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

/** Precios, stock y metadatos de catálogo para hidratar localStorage del carrito. */
v1CatalogRouter.post('/cart/sync', async (req, res, next) => {
  try {
    const body = cartSyncBodySchema.parse(req.body);
    const market = parseMarketQuery(req.query.market);
    const data = await syncCartLineItems(body.items, market);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});
