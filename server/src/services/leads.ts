import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { buildSummary, analyzeLead, type LeadFacts, type LeadStatus } from '../domain/qualification';
import { readSlots, type MeetingSlot } from '../domain/slots';
import { HttpError } from '../http/async-route';
import { normalizePhone } from '../domain/phone';

const leadInclude = {
  messages: { orderBy: { createdAt: 'asc' as const } },
  meetings: { orderBy: { startsAt: 'asc' as const } },
};

export function preview(text: string, max = 110): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}…`;
}

export async function recomputeLead(leadId: string, summary?: string) {
  const lead = await prisma.lead.findUniqueOrThrow({
    where: { id: leadId },
    include: { meetings: { where: { status: 'BOOKED' }, take: 1 } },
  });
  const analyzed = analyzeLead(lead, lead.meetings.length > 0);
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      score: analyzed.score,
      status: analyzed.status,
      ...(summary !== undefined ? { summary } : {}),
    },
  });
  return analyzed;
}

export function serializeMessage(message: {
  id: string;
  leadId: string;
  direction: 'INBOUND' | 'OUTBOUND';
  body: string;
  createdAt: Date;
}) {
  return {
    id: message.id,
    leadId: message.leadId,
    direction: message.direction,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
  };
}

export function serializeMeeting(meeting: {
  id: string;
  leadId: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  status: 'BOOKED' | 'CANCELLED';
  notes: string | null;
  createdAt: Date;
  lead?: { id: string; name: string; company: string | null; phone: string };
}) {
  return {
    id: meeting.id,
    leadId: meeting.leadId,
    title: meeting.title,
    startsAt: meeting.startsAt.toISOString(),
    endsAt: meeting.endsAt.toISOString(),
    status: meeting.status,
    notes: meeting.notes,
    createdAt: meeting.createdAt.toISOString(),
    lead: meeting.lead
      ? {
          id: meeting.lead.id,
          name: meeting.lead.name,
          company: meeting.lead.company,
          phone: meeting.lead.phone,
        }
      : undefined,
  };
}

function qualificationFor(lead: LeadFacts, hasBookedMeeting: boolean) {
  return analyzeLead(lead, hasBookedMeeting);
}

export function serializeLead(
  lead: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    company: string | null;
    source: string;
    status: 'NEW' | 'QUALIFYING' | 'QUALIFIED' | 'UNQUALIFIED' | 'MEETING_BOOKED';
    score: number;
    need: string | null;
    budget: string | null;
    timeline: string | null;
    authority: string | null;
    summary: string | null;
    proposedSlots: Prisma.JsonValue;
    followUpDueAt: Date | null;
    followUpSentAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    meetings?: { status: 'BOOKED' | 'CANCELLED' }[];
  },
  lastMessage?: { body: string; direction: 'INBOUND' | 'OUTBOUND'; createdAt: Date } | null,
) {
  const hasBookedMeeting = (lead.meetings ?? []).some((meeting) => meeting.status === 'BOOKED');
  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    company: lead.company,
    source: lead.source,
    status: lead.status,
    score: lead.score,
    need: lead.need,
    budget: lead.budget,
    timeline: lead.timeline,
    authority: lead.authority,
    summary: lead.summary,
    proposedSlots: readSlots(lead.proposedSlots),
    followUpDueAt: lead.followUpDueAt?.toISOString() ?? null,
    followUpSentAt: lead.followUpSentAt?.toISOString() ?? null,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    qualification: qualificationFor(lead, hasBookedMeeting),
    lastMessage: lastMessage
      ? {
          body: preview(lastMessage.body),
          direction: lastMessage.direction,
          createdAt: lastMessage.createdAt.toISOString(),
        }
      : null,
  };
}

export async function listLeads(filters: { status?: LeadStatus; q?: string }) {
  const q = filters.q?.trim();
  const leads = await prisma.lead.findMany({
    where: {
      ...(filters.status ? { status: filters.status } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { company: { contains: q } },
              { phone: { contains: q } },
              { email: { contains: q } },
            ],
          }
        : {}),
    },
    include: {
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      meetings: { where: { status: 'BOOKED' }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
  });
  return leads.map((lead) => serializeLead(lead, lead.messages[0] ?? null));
}

export async function getLeadDetail(id: string) {
  const lead = await prisma.lead.findUnique({ where: { id }, include: leadInclude });
  if (!lead) return null;
  return {
    lead: serializeLead(lead),
    messages: lead.messages.map(serializeMessage),
    meetings: lead.meetings.map((meeting) => serializeMeeting(meeting)),
  };
}

export async function createLead(input: {
  name: string;
  phone: string;
  email?: string | null;
  company?: string | null;
  need?: string | null;
}) {
  const phone = normalizePhone(input.phone);
  if (!phone) throw new HttpError(400, 'Enter a valid phone number');
  const email = input.email?.trim() ? input.email.trim() : null;
  try {
    const lead = await prisma.lead.create({
      data: {
        name: input.name.trim(),
        phone,
        email,
        company: input.company?.trim() || null,
        need: input.need?.trim() || null,
        source: 'manual',
      },
    });
    const facts: LeadFacts = {
      need: lead.need,
      company: lead.company,
      email: lead.email,
    };
    await recomputeLead(lead.id, buildSummary(facts));
    const fresh = await prisma.lead.findUniqueOrThrow({
      where: { id: lead.id },
      include: { meetings: true },
    });
    return serializeLead(fresh);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new HttpError(409, 'A lead with this phone already exists');
    }
    throw error;
  }
}

export async function listMeetings() {
  const meetings = await prisma.meeting.findMany({
    orderBy: { startsAt: 'asc' },
    include: { lead: { select: { id: true, name: true, company: true, phone: true } } },
  });
  return meetings.map((meeting) => serializeMeeting(meeting));
}

export function slotsFromLead(value: Prisma.JsonValue): MeetingSlot[] {
  return readSlots(value);
}
