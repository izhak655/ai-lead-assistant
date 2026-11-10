import { Router } from 'express';
import { asyncRoute } from '../http/async-route';
import { getStats } from '../services/stats';

export const statsRouter = Router();

statsRouter.get(
  '/',
  asyncRoute(async (_req, res) => {
    res.json(await getStats());
  }),
);
