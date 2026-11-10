import { Router } from 'express';
import { z } from 'zod';
import { asyncRoute, HttpError, routeParam } from '../http/async-route';
import { parseInput } from '../http/parse';
import { listMeetings, serializeMeeting } from '../services/leads';
import { cancelMeeting } from '../services/tool-runner';

export const meetingsRouter = Router();

meetingsRouter.get(
  '/',
  asyncRoute(async (_req, res) => {
    res.json({ meetings: await listMeetings() });
  }),
);

meetingsRouter.patch(
  '/:id',
  asyncRoute(async (req, res) => {
    const id = routeParam(req.params.id);
    if (!id) throw new HttpError(400, 'Missing meeting id');
    const parsed = parseInput(z.object({ status: z.literal('CANCELLED') }), req.body);
    if (!parsed.ok) throw new HttpError(400, parsed.error);
    const meeting = await cancelMeeting(id);
    if (!meeting) throw new HttpError(404, 'Meeting not found');
    res.json({ meeting: serializeMeeting(meeting) });
  }),
);
