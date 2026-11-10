export const DECLINE_REPLY =
  "Thanks for reaching out. This assistant is aimed at teams with a budget for a CRM and WhatsApp workflow, so I won't book a sales meeting. If that changes, message again and we'll pick it up.";

export const OPENING_QUESTION =
  'What should the assistant help with — qualifying leads, WhatsApp follow-ups, scheduling, or something else?';

export function followUpBody(name: string): string {
  const who = name && name !== 'Unknown' ? name.split(' ')[0] : '';
  const hello = who ? `Hi ${who}` : 'Hi';
  return `${hello} — checking in. If you still want help with this, reply with the missing detail and I can finish qualifying and offer meeting times.`;
}
