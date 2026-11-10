import { Router } from 'express';
import { z } from 'zod';
import { asyncRoute, HttpError } from '../http/async-route';
import { parseInput } from '../http/parse';
import { ingestWhatsApp } from '../services/inbound';

export const webhooksRouter = Router();

const whatsappSchema = z.object({
  from: z.string().trim().min(5).max(32),
  text: z.string().trim().min(1).max(4000),
  name: z.string().trim().max(120).optional(),
  messageId: z.string().trim().max(128).optional(),
});

webhooksRouter.post(
  '/whatsapp',
  asyncRoute(async (req, res) => {
    const parsed = parseInput(whatsappSchema, req.body);
    if (!parsed.ok) throw new HttpError(400, parsed.error);
    const result = await ingestWhatsApp({
      from: parsed.data.from,
      text: parsed.data.text,
      name: parsed.data.name,
      externalId: parsed.data.messageId,
    });
    res.status(202).json({ ...result, queued: !result.duplicate });
  }),
);
