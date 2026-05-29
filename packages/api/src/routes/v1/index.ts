import { Router } from 'express';
import { v1CatalogRouter } from './catalog.routes.js';
import { v1CheckoutRouter } from './checkout.routes.js';
import { v1OrdersRouter } from './orders.routes.js';
import { v1MrpapsAdminRouter } from './mrpaps-admin.routes.js';

export const v1Router: Router = Router();

v1Router.use('/catalog', v1CatalogRouter);
v1Router.use('/checkout', v1CheckoutRouter);
v1Router.use('/orders', v1OrdersRouter);
v1Router.use('/admin', v1MrpapsAdminRouter);
