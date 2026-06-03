import { Router } from 'express';
import * as customerAuth from '../../services/customer-auth.service.js';
import * as bootstrapAuth from '../../services/bootstrap-auth.service.js';
import { requireCustomerAuth } from '../../middleware/customer-auth.js';
import * as usersRepo from '../../db/mrpaps-users.repository.js';
import { customerLoginSchema, customerRegisterSchema } from '../../schemas/customer-auth.schema.js';
import { bootstrapPasswordSchema } from '../../schemas/mrpaps.schema.js';

export const v1AuthRouter: Router = Router();

/**
 * Temporal — restablecer contraseña tras migración desde Supabase.
 * Requiere ADMIN_BOOTSTRAP_SECRET en packages/api/.env. Quitar el secret en producción estable.
 */
v1AuthRouter.post('/bootstrap-password', async (req, res, next) => {
  try {
    const body = bootstrapPasswordSchema.parse(req.body);
    const data = await bootstrapAuth.bootstrapUserPassword(body);
    res.json({ data, message: 'Contraseña actualizada. Inicia sesión con la nueva clave.' });
  } catch (err) {
    next(err);
  }
});

v1AuthRouter.post('/register', async (req, res, next) => {
  try {
    const body = customerRegisterSchema.parse(req.body);
    const result = await customerAuth.registerCustomer(body);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
});

v1AuthRouter.post('/login', async (req, res, next) => {
  try {
    const body = customerLoginSchema.parse(req.body);
    const result = await customerAuth.loginCustomer(body.email, body.password);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

v1AuthRouter.get('/me', requireCustomerAuth, async (req, res, next) => {
  try {
    const user = await usersRepo.findUserByEmail(req.customerUser!.email);
    if (!user) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
    res.json({ data: customerAuth.publicCustomer(user) });
  } catch (err) {
    next(err);
  }
});
