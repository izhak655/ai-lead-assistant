export type LeadStatus = 'NEW' | 'QUALIFYING' | 'QUALIFIED' | 'UNQUALIFIED' | 'MEETING_BOOKED';

export type ScoreRow = {
  key: string;
  label: string;
  points: number;
  max: number;
  detail: string;
};

export type Slot = {
  id: string;
  startsAt: string;
  endsAt: string;
  label: string;
};

export type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  source: string;
  status: LeadStatus;
  score: number;
  need: string | null;
  budget: string | null;
  timeline: string | null;
  authority: string | null;
  summary: string | null;
  proposedSlots: Slot[];
  followUpDueAt: string | null;
  followUpSentAt: string | null;
  createdAt: string;
  updatedAt: string;
  qualification: {
    score: number;
    status: LeadStatus;
    breakdown: ScoreRow[];
    disqualified: boolean;
    readyForMeeting: boolean;
  };
  lastMessage: { body: string; direction: 'INBOUND' | 'OUTBOUND'; createdAt: string } | null;
};

export type ChatMessage = {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  body: string;
  createdAt: string;
};

export type Meeting = {
  id: string;
  leadId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: 'BOOKED' | 'CANCELLED';
  notes: string | null;
  lead?: { id: string; name: string; company: string | null; phone: string };
};

export type Stats = {
  totalLeads: number;
  averageScore: number;
  upcomingMeetings: number;
  byStatus: Record<LeadStatus, number>;
  aiMode: 'mock' | 'openai';
  queueDriver: string;
};

export type Health = {
  ok: boolean;
  db: string;
  redis: string;
  aiMode: string;
  queueDriver: string;
};

export type LeadDetail = {
  lead: Lead;
  messages: ChatMessage[];
  meetings: Meeting[];
};
