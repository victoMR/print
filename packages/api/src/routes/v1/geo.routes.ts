import { Router } from 'express';
import { z } from 'zod';
import * as mxGeo from '../../services/mx-geo.service.js';
import { mxStateCodeSchema } from '../../schemas/order.schema.js';

export const v1GeoRouter: Router = Router();

v1GeoRouter.get('/states', (_req, res) => {
  res.json({ data: mxGeo.listStates() });
});

v1GeoRouter.get('/states/:stateCode/municipalities', async (req, res, next) => {
  try {
    const stateCode = mxStateCodeSchema.parse(req.params.stateCode);
    const data = await mxGeo.listMunicipalitiesByStateCode(stateCode);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

v1GeoRouter.get('/postal/:zip', async (req, res, next) => {
  try {
    const zip = z.string().regex(/^\d{5}$/).parse(req.params.zip);
    const data = await mxGeo.lookupPostalCode(zip);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});
