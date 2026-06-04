import { Router } from 'express';
import * as catalogPresenter from '../../services/catalog-presenter.service.js';
import { parseProductCategoryQuery } from '../../services/mrpaps-catalog.service.js';

export const v1CatalogRouter: Router = Router();

v1CatalogRouter.get('/products', async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 24);
    const category = parseProductCategoryQuery(req.query.category);
    const result = await catalogPresenter.listPublicProducts(page, limit, category);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

v1CatalogRouter.get('/products/:id', async (req, res, next) => {
  try {
    const data = await catalogPresenter.getPublicProduct(req.params.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});
