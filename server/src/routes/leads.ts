import { Router } from 'express';
import { z } from 'zod';
import { LEAD_STATUSES } from '../domain/qualification';
import { asyncRoute, HttpError, routeParam } from '../http/async-route';
import { parseInput } from '../http/parse';
import { createLead, getLeadDetail, listLeads } from '../services/leads';
import { bookProposedSlot } from '../services/tool-runner';

export const leadsRouter = Router();

const listQuery = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  q: z.string().max(120).optional(),
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(5).max(32),
  email: z.union([z.string().trim().email(), z.literal('')]).optional(),
  company: z.string().trim().max(255).optional(),
  need: z.string().trim().max(2000).optional(),
});

const bookSchema = z.object({
  slotId: z.string().trim().min(1).max(64),
});

leadsRouter.get(
  '/',
  asyncRoute(async (req, res) => {
    const parsed = parseInput(listQuery, req.query);
    if (!parsed.ok) throw new HttpError(400, parsed.error);
    const leads = await listLeads({ status: parsed.data.status, q: parsed.data.q });
    res.json({ leads });
  }),
);

leadsRouter.post(
  '/',
  asyncRoute(async (req, res) => {
    const parsed = parseInput(createSchema, req.body);
    if (!parsed.ok) throw new HttpError(400, parsed.error);
    const lead = await createLead({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      company: parsed.data.company,
      need: parsed.data.need,
    });
    res.status(201).json({ lead });
  }),
);

leadsRouter.get(
  '/:id',
  asyncRoute(async (req, res) => {
    const id = routeParam(req.params.id);
    if (!id) throw new HttpError(400, 'Missing lead id');
    const detail = await getLeadDetail(id);
    if (!detail) throw new HttpError(404, 'Lead not found');
    res.json(detail);
  }),
);

leadsRouter.post(
  '/:id/meetings',
  asyncRoute(async (req, res) => {
    const id = routeParam(req.params.id);
    if (!id) throw new HttpError(400, 'Missing lead id');
    const parsed = parseInput(bookSchema, req.body);
    if (!parsed.ok) throw new HttpError(400, parsed.error);
    const result = await bookProposedSlot(id, parsed.data.slotId, { announce: true });
    if (result.status === 'not_found') throw new HttpError(404, result.error);
    if (result.status === 'bad_slot') throw new HttpError(400, result.error);
    if (result.status === 'already_booked') throw new HttpError(409, result.error);
    res.status(201).json({
      meeting: {
        id: result.meeting.id,
        title: result.meeting.title,
        startsAt: result.meeting.startsAt.toISOString(),
        endsAt: result.meeting.endsAt.toISOString(),
        label: result.label,
      },
    });
  }),
);
