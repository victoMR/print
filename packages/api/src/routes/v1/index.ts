import { Router } from 'express';
import { v1CatalogRouter } from './catalog.routes.js';
import { v1CheckoutRouter } from './checkout.routes.js';
import { v1OrdersRouter } from './orders.routes.js';
import { v1MrpapsAdminRouter } from './mrpaps-admin.routes.js';
import { v1AuthRouter } from './auth.routes.js';
import { v1AccountRouter } from './account.routes.js';
import { v1PaymentRouter } from './payment.routes.js';
import { v1GeoRouter } from './geo.routes.js';

export const v1Router: Router = Router();

v1Router.use('/catalog', v1CatalogRouter);
v1Router.use('/geo', v1GeoRouter);
v1Router.use('/checkout', v1CheckoutRouter);
v1Router.use('/orders', v1OrdersRouter);
v1Router.use('/admin', v1MrpapsAdminRouter);
v1Router.use('/auth', v1AuthRouter);
v1Router.use('/account', v1AccountRouter);
v1Router.use('/checkout', v1PaymentRouter);
// Stripe webhook: montado en app.ts (body raw, antes de express.json)
