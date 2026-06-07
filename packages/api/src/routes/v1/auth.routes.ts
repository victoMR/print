import { Router } from 'express';
import * as customerAuth from '../../services/customer-auth.service.js';
import { refreshCustomerSession, resolveCustomerSession } from '../../services/customer-auth.service.js';
import {
  clearCustomerSessionCookie,
  setCustomerSessionCookie,
} from '../../lib/session-cookie.js';
import * as bootstrapAuth from '../../services/bootstrap-auth.service.js';
import { extractCustomerToken, revokeCustomerSession } from '../../middleware/customer-auth.js';
import { authRateLimit } from '../../middleware/rate-limit.js';
import * as usersRepo from '../../db/mrpaps-users.repository.js';
import {
  customerLoginSchema,
  customerRegisterSchema,
  resendVerificationSchema,
  verificationStatusQuerySchema,
  verifyEmailSchema,
} from '../../schemas/customer-auth.schema.js';
import {
  getEmailVerificationStatus,
  resendEmailVerification,
  verifyEmailByToken,
} from '../../services/email-verification.service.js';
import { bootstrapPasswordSchema } from '../../schemas/mrpaps.schema.js';

export const v1AuthRouter: Router = Router();

/**
 * Temporal — restablecer contraseña tras migración desde Supabase.
 * Requiere ADMIN_BOOTSTRAP_SECRET en packages/api/.env. Quitar el secret en producción estable.
 * Rate-limited to prevent brute-force of ADMIN_BOOTSTRAP_SECRET.
 */
v1AuthRouter.post('/bootstrap-password', authRateLimit, async (req, res, next) => {
  // Always disabled in production — this is a one-time migration helper only for dev/staging.
  // The previous guard was inverted: it only blocked when the secret was ABSENT, meaning
  // a correctly-configured production server would have the endpoint active.
  if (process.env.NODE_ENV === 'production') {
    res.status(404).end();
    return;
  }
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
    res.status(201).json({
      data: result,
      message: 'Revisa tu correo para verificar tu cuenta antes de iniciar sesión.',
    });
  } catch (err) {
    next(err);
  }
});

v1AuthRouter.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = verifyEmailSchema.parse(req.body);
    const data = await verifyEmailByToken(token);
    res.json({ data, message: 'Correo verificado. Ya puedes iniciar sesión.' });
  } catch (err) {
    next(err);
  }
});

v1AuthRouter.get('/verification-status', async (req, res, next) => {
  try {
    const { email } = verificationStatusQuerySchema.parse({ email: req.query.email });
    const data = await getEmailVerificationStatus(email);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

v1AuthRouter.post('/resend-verification', authRateLimit, async (req, res, next) => {
  try {
    const { email } = resendVerificationSchema.parse(req.body);
    // Suppress the "already verified" error to prevent account enumeration.
    try {
      await resendEmailVerification(email);
    } catch { /* swallow — always return generic message */ }
    res.json({ message: 'Si el correo está registrado y pendiente de verificación, enviamos un nuevo enlace.' });
  } catch (err) {
    next(err);
  }
});

v1AuthRouter.post('/login', authRateLimit, async (req, res, next) => {
  try {
    const body = customerLoginSchema.parse(req.body);
    const result = await customerAuth.loginCustomer(body.email, body.password, body.rememberMe);

    setCustomerSessionCookie(res, result.token, result.rememberMe);

    res.json({ data: { user: result.user } });
  } catch (err) {
    next(err);
  }
});

/** Renueva cookie HttpOnly si la sesión sigue válida (sesión deslizante). */
v1AuthRouter.post('/refresh', async (req, res, next) => {
  try {
    const token = extractCustomerToken(req);
    if (!token) {
      res.json({ data: null });
      return;
    }
    const result = await refreshCustomerSession(token);
    if (!result) {
      clearCustomerSessionCookie(res);
      res.json({ data: null });
      return;
    }
    setCustomerSessionCookie(res, result.token, result.rememberMe);
    res.json({ data: result.user });
  } catch (err) {
    next(err);
  }
});

v1AuthRouter.post('/logout', async (req, res, next) => {
  try {
    const token = extractCustomerToken(req);
    if (token) {
      const session = await resolveCustomerSession(token, { requireVerifiedEmail: false });
      if (session) await revokeCustomerSession(session.id);
    }
    clearCustomerSessionCookie(res);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/**
 * Sondeo de sesión al cargar la tienda. Sin cookie o sesión inválida → 200 { data: null }
 * (no 401, para no marcar error en DevTools de visitantes anónimos).
 */
v1AuthRouter.get('/me', async (req, res, next) => {
  try {
    const token = extractCustomerToken(req);
    if (!token) {
      res.json({ data: null });
      return;
    }
    const session = await resolveCustomerSession(token, { requireVerifiedEmail: true });
    if (!session) {
      res.json({ data: null });
      return;
    }
    const user = await usersRepo.findUserByEmail(session.email);
    if (!user) {
      res.json({ data: null });
      return;
    }
    res.json({ data: customerAuth.publicCustomer(user) });
  } catch (err) {
    next(err);
  }
});
