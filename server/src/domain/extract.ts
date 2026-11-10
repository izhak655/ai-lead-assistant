export type ExtractedFields = {
  name?: string;
  email?: string;
  company?: string;
  need?: string;
  budget?: string;
  timeline?: string;
  authority?: string;
};

const NAME_STOP = new Set([
  'the',
  'a',
  'an',
  'our',
  'office',
  'manager',
  'founder',
  'owner',
  'student',
  'just',
  'looking',
  'ceo',
  'director',
]);

function titleName(raw: string): string | undefined {
  const parts = raw
    .trim()
    .replace(/[,.!?].*$/, '')
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0 || parts.length > 3) return undefined;
  if (parts.some((part) => NAME_STOP.has(part.toLowerCase()))) return undefined;
  return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(' ');
}

export function extractFields(text: string): ExtractedFields {
  const extracted: ExtractedFields = {};
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (email?.[0]) extracted.email = email[0].toLowerCase();

  const name = text.match(/\b(?:i'm|i am|my name is)\s+([A-Za-z][A-Za-z'’-]{1,40}(?:\s+[A-Za-z][A-Za-z'’-]{1,40}){0,2})/i);
  if (name?.[1]) {
    const cleaned = titleName(name[1]);
    if (cleaned) extracted.name = cleaned;
  }

  const company = text.match(/\b(?:work(?:ing)? at|founder at|owner at|ceo at|company is)\s+([^,.\n]+)/i);
  if (company?.[1]) {
    const value = company[1].trim().replace(/\s+/g, ' ');
    if (value.length >= 2 && value.length <= 80) extracted.company = value;
  }

  if (/\b(no budget|don't have (a )?budget|do not have (a )?budget|for free|i'm a student|i am a student|just a student)\b/i.test(text)) {
    extracted.budget = 'No budget';
  } else {
    const money = text.match(
      /\b\d[\d,]*(?:\.\d+)?\s?(?:k|K)?\s?(?:ils|nis|usd|shekels?)\b(?:\s*\/\s*(?:month|mo|year))?/i,
    );
    if (money?.[0]) extracted.budget = money[0].replace(/\s+/g, ' ').trim();
    else if (/\b(have a budget|budget is approved|budget approved|we can pay)\b/i.test(text)) {
      extracted.budget = 'Budget available';
    }
  }

  if (/\basap\b|\bimmediately\b|\bright away\b/i.test(text)) extracted.timeline = 'ASAP';
  else if (/\bthis week\b|\bthis month\b/i.test(text)) extracted.timeline = 'This month';
  else if (/\bthis quarter\b|\bnext month\b|\bsoon\b/i.test(text)) extracted.timeline = 'This quarter';
  else if (/\bnext quarter\b|\bthis year\b|\bin a few months\b/i.test(text)) extracted.timeline = 'This year';
  else if (/\bjust looking\b|\bno rush\b|\bsomeday\b|\bbrowsing\b/i.test(text)) extracted.timeline = 'Just looking';

  if (/\b(founder|owner|ceo|i decide|decision maker|i own)\b/i.test(text)) extracted.authority = 'Decision maker';
  else if (/\b(office manager|manager|director|head of|operations)\b/i.test(text)) extracted.authority = 'Manager';

  const greetingOnly = /^(hi|hello|hey|shalom|good morning|good afternoon)[!.\s]*$/i.test(text.trim());
  const intent =
    /\b(want|need|looking|automate|automation|leads?|whatsapp|follow-?ups?|appointments?|customers?|clinic|sales|qualify|scheduling|checkout|inquiries)\b/i;
  if (!greetingOnly && intent.test(text) && text.trim().length >= 30) {
    extracted.need = text.trim().slice(0, 500);
  }

  return extracted;
}
