import { Router } from 'express';
import * as catalogPresenter from '../../services/catalog-presenter.service.js';

export const v1CatalogRouter: Router = Router();

v1CatalogRouter.get('/products', async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 24);
    const result = await catalogPresenter.listPublicProducts(page, limit);
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
