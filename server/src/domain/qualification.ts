export const LEAD_STATUSES = ['NEW', 'QUALIFYING', 'QUALIFIED', 'UNQUALIFIED', 'MEETING_BOOKED'] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type LeadFacts = {
  need?: string | null;
  budget?: string | null;
  timeline?: string | null;
  authority?: string | null;
  email?: string | null;
  company?: string | null;
};

export type ScoreKey = 'need' | 'budget' | 'timeline' | 'authority' | 'profile';

export type ScoreRow = {
  key: ScoreKey;
  label: string;
  points: number;
  max: number;
  detail: string;
};

export type Qualification = {
  score: number;
  status: LeadStatus;
  breakdown: ScoreRow[];
  disqualified: boolean;
  readyForMeeting: boolean;
};

const DISQUALIFY =
  /\b(no budget|without a budget|for free|just a student|i am a student|i'm a student|not a buyer|just curious|no money|can't pay|cannot pay)\b/i;

export function isDisqualifyingText(value?: string | null): boolean {
  if (!value) return false;
  return DISQUALIFY.test(value);
}

export function hasConcreteBudget(budget?: string | null): boolean {
  if (!budget || isDisqualifyingText(budget)) return false;
  return /\d|ils|nis|usd|shekel|₪|\$|budget available|approved/i.test(budget);
}

export function analyzeLead(facts: LeadFacts, hasBookedMeeting: boolean): Qualification {
  const needText = facts.need?.trim() ?? '';
  let needPoints = 0;
  let needDetail = 'No need captured yet';
  if (needText.length >= 20) {
    needPoints = 30;
    needDetail = 'Clear business need';
  } else if (needText.length > 0) {
    needPoints = 12;
    needDetail = 'Need is still vague';
  }

  let budgetPoints = 0;
  let budgetDetail = 'Budget unknown';
  if (!facts.budget?.trim()) {
    budgetPoints = 0;
  } else if (isDisqualifyingText(facts.budget)) {
    budgetPoints = 0;
    budgetDetail = 'No budget to buy';
  } else if (hasConcreteBudget(facts.budget) && /\d/.test(facts.budget)) {
    budgetPoints = 25;
    budgetDetail = facts.budget.trim();
  } else if (hasConcreteBudget(facts.budget)) {
    budgetPoints = 16;
    budgetDetail = facts.budget.trim();
  } else {
    budgetPoints = 8;
    budgetDetail = facts.budget.trim();
  }

  const timeline = facts.timeline?.trim() ?? '';
  let timelinePoints = 0;
  let timelineDetail = 'Timeline unknown';
  if (!timeline) {
    timelinePoints = 0;
  } else if (/asap|immediately|this week|this month|right away/i.test(timeline)) {
    timelinePoints = 20;
    timelineDetail = timeline;
  } else if (/this quarter|next month|soon/i.test(timeline)) {
    timelinePoints = 14;
    timelineDetail = timeline;
  } else if (/next quarter|this year|few months/i.test(timeline)) {
    timelinePoints = 8;
    timelineDetail = timeline;
  } else if (/just looking|no rush|someday|browsing/i.test(timeline)) {
    timelinePoints = 4;
    timelineDetail = timeline;
  } else {
    timelinePoints = 10;
    timelineDetail = timeline;
  }

  const authority = facts.authority?.trim() ?? '';
  let authorityPoints = 0;
  let authorityDetail = 'Decision maker unknown';
  if (!authority) {
    authorityPoints = 0;
  } else if (/decision maker|owner|founder|ceo|partner/i.test(authority)) {
    authorityPoints = 15;
    authorityDetail = authority;
  } else if (/manager|director|head|operations/i.test(authority)) {
    authorityPoints = 9;
    authorityDetail = authority;
  } else {
    authorityPoints = 6;
    authorityDetail = authority;
  }

  let profilePoints = 0;
  const profileBits: string[] = [];
  if (facts.company?.trim()) {
    profilePoints += 5;
    profileBits.push(facts.company.trim());
  }
  if (facts.email?.trim()) {
    profilePoints += 5;
    profileBits.push(facts.email.trim());
  }

  const breakdown: ScoreRow[] = [
    { key: 'need', label: 'Need', points: needPoints, max: 30, detail: needDetail },
    { key: 'budget', label: 'Budget', points: budgetPoints, max: 25, detail: budgetDetail },
    { key: 'timeline', label: 'Timeline', points: timelinePoints, max: 20, detail: timelineDetail },
    { key: 'authority', label: 'Authority', points: authorityPoints, max: 15, detail: authorityDetail },
    {
      key: 'profile',
      label: 'Profile',
      points: profilePoints,
      max: 10,
      detail: profileBits.length > 0 ? profileBits.join(' · ') : 'Company and email missing',
    },
  ];

  let score = breakdown.reduce((sum, row) => sum + row.points, 0);
  const disqualified =
    isDisqualifyingText(facts.budget) || isDisqualifyingText(facts.need) || isDisqualifyingText(facts.authority);

  if (disqualified) score = Math.min(score, 24);

  const readyForMeeting =
    !disqualified && needText.length >= 20 && hasConcreteBudget(facts.budget) && timelinePoints >= 8;

  let status: LeadStatus;
  if (hasBookedMeeting) status = 'MEETING_BOOKED';
  else if (disqualified) status = 'UNQUALIFIED';
  else if (readyForMeeting) status = 'QUALIFIED';
  else if (score >= 20 || Boolean(needText || facts.company || facts.budget || facts.timeline || facts.authority)) {
    status = 'QUALIFYING';
  } else status = 'NEW';

  return { score, status, breakdown, disqualified, readyForMeeting };
}

export function buildSummary(facts: LeadFacts): string {
  const parts: string[] = [];
  if (facts.company) parts.push(facts.company);
  if (facts.authority) parts.push(facts.authority);
  if (facts.need) parts.push(facts.need);
  if (facts.budget) parts.push(`Budget: ${facts.budget}`);
  if (facts.timeline) parts.push(`Timeline: ${facts.timeline}`);
  if (facts.email) parts.push(facts.email);
  return parts.join(' · ').slice(0, 600);
}
