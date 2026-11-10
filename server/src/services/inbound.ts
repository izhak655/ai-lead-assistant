import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { normalizePhone } from '../domain/phone';
import { HttpError } from '../http/async-route';
import { enqueueInbound } from '../queue/jobs';

export async function ingestWhatsApp(input: {
  from: string;
  text: string;
  name?: string;
  externalId?: string;
}): Promise<{ duplicate: boolean; leadId: string; messageId: string }> {
  const externalId = input.externalId?.trim() || undefined;
  if (externalId) {
    const existing = await prisma.message.findUnique({ where: { externalId } });
    if (existing) return { duplicate: true, leadId: existing.leadId, messageId: existing.id };
  }

  const phone = normalizePhone(input.from);
  if (!phone) throw new HttpError(400, 'Enter a valid phone number');
  const text = input.text.trim();
  if (!text) throw new HttpError(400, 'Message text is required');

  let lead = await prisma.lead.findUnique({ where: { phone } });
  const providedName = input.name?.trim();
  if (!lead) {
    lead = await prisma.lead.create({
      data: {
        phone,
        name: providedName || 'Unknown',
        source: 'whatsapp',
      },
    });
  } else if (providedName && (lead.name === 'Unknown' || lead.name === '')) {
    lead = await prisma.lead.update({ where: { id: lead.id }, data: { name: providedName } });
  }

  try {
    const message = await prisma.message.create({
      data: {
        leadId: lead.id,
        direction: 'INBOUND',
        body: text,
        externalId,
      },
    });
    await enqueueInbound(lead.id);
    return { duplicate: false, leadId: lead.id, messageId: message.id };
  } catch (error) {
    if (externalId && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await prisma.message.findUnique({ where: { externalId } });
      if (existing) return { duplicate: true, leadId: existing.leadId, messageId: existing.id };
    }
    throw error;
  }
}
