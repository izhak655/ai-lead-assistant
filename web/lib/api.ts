import type { Health, Lead, LeadDetail, Meeting, Stats } from './types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    let message = response.statusText || 'Request failed';
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore non-JSON errors */
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export const api = {
  health: () => request<Health>('/api/health'),
  stats: () => request<Stats>('/api/stats'),
  leads: (params?: { status?: string; q?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.q) query.set('q', params.q);
    const suffix = query.toString();
    return request<{ leads: Lead[] }>(`/api/leads${suffix ? `?${suffix}` : ''}`);
  },
  lead: (id: string) => request<LeadDetail>(`/api/leads/${id}`),
  createLead: (body: { name: string; phone: string; email?: string; company?: string; need?: string }) =>
    request<{ lead: Lead }>('/api/leads', { method: 'POST', body: JSON.stringify(body) }),
  sendWhatsApp: (body: { from: string; text: string; name?: string; messageId?: string }) =>
    request<{ leadId: string; duplicate: boolean }>('/api/webhooks/whatsapp', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  meetings: () => request<{ meetings: Meeting[] }>('/api/meetings'),
  bookSlot: (leadId: string, slotId: string) =>
    request<{ meeting: { id: string } }>(`/api/leads/${leadId}/meetings`, {
      method: 'POST',
      body: JSON.stringify({ slotId }),
    }),
  cancelMeeting: (id: string) =>
    request<{ meeting: Meeting }>(`/api/meetings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'CANCELLED' }),
    }),
};
