'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { StatusPill } from '../../../components/StatusPill';
import { api } from '../../../lib/api';
import { formatRelative, formatWhen, scoreTone } from '../../../lib/format';
import type { LeadDetail } from '../../../lib/types';

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [booking, setBooking] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    async function load() {
      try {
        const next = await api.lead(id);
        if (!cancel) {
          setDetail(next);
          setError(null);
          document.title = `${next.lead.name} · AI Lead Assistant`;
        }
      } catch (err) {
        if (!cancel) setError(err instanceof Error ? err.message : 'Lead not found');
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => {
      cancel = true;
      window.clearInterval(timer);
      document.title = 'AI Lead Assistant';
    };
  }, [id]);

  async function onSend(event: FormEvent) {
    event.preventDefault();
    if (!detail || !text.trim()) return;
    const outboundBefore = detail.messages.filter((message) => message.direction === 'OUTBOUND').length;
    setSending(true);
    setSendError(null);
    try {
      await api.sendWhatsApp({
        from: detail.lead.phone,
        name: detail.lead.name,
        text: text.trim(),
        messageId: `sim-${detail.lead.id}-${Date.now()}`,
      });
      setText('');
      const started = Date.now();
      while (Date.now() - started < 15000) {
        const next = await api.lead(id);
        setDetail(next);
        const outbound = next.messages.filter((message) => message.direction === 'OUTBOUND').length;
        if (outbound > outboundBefore) break;
        await new Promise((resolve) => window.setTimeout(resolve, 600));
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Message failed');
    } finally {
      setSending(false);
    }
  }

  async function onBook(slotId: string) {
    setBooking(slotId);
    setSendError(null);
    try {
      await api.bookSlot(id, slotId);
      setDetail(await api.lead(id));
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Could not book that slot');
    } finally {
      setBooking(null);
    }
  }

  if (error) {
    return (
      <div className="page">
        <h1>Lead unavailable</h1>
        <p className="lede">{error}</p>
        <Link href="/leads" className="button">
          Back to leads
        </Link>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="page">
        <p className="muted">Loading conversation…</p>
      </div>
    );
  }

  const { lead, messages, meetings } = detail;
  const booked = meetings.filter((meeting) => meeting.status === 'BOOKED');

  return (
    <div className="page">
      <header className="page-head row">
        <div>
          <p className="eyebrow">
            <Link href="/leads">Leads</Link> / {lead.source}
          </p>
          <h1>{lead.name}</h1>
          <p className="lede">
            {lead.company || 'No company yet'} · {lead.phone}
          </p>
        </div>
        <StatusPill status={lead.status} />
      </header>

      <div className="detail-grid">
        <section className="card profile">
          <div className="score-hero">
            <div>
              <span className="eyebrow">Score</span>
              <strong className={`tone-${scoreTone(lead.score)}`}>{lead.score}</strong>
            </div>
            <p>{lead.summary || 'No summary yet.'}</p>
          </div>
          <ol className="breakdown">
            {lead.qualification.breakdown.map((row) => (
              <li key={row.key}>
                <div className="bd-top">
                  <span>{row.label}</span>
                  <span>
                    {row.points}/{row.max}
                  </span>
                </div>
                <div className="bd-track">
                  <span style={{ width: `${row.max === 0 ? 0 : (row.points / row.max) * 100}%` }} />
                </div>
                <p>{row.detail}</p>
              </li>
            ))}
          </ol>
          <dl className="facts">
            <div>
              <dt>Need</dt>
              <dd>{lead.need || '—'}</dd>
            </div>
            <div>
              <dt>Budget</dt>
              <dd>{lead.budget || '—'}</dd>
            </div>
            <div>
              <dt>Timeline</dt>
              <dd>{lead.timeline || '—'}</dd>
            </div>
            <div>
              <dt>Authority</dt>
              <dd>{lead.authority || '—'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{lead.email || '—'}</dd>
            </div>
          </dl>
          {lead.followUpDueAt && !lead.followUpSentAt ? (
            <p className="card-note">Follow-up scheduled for {formatWhen(lead.followUpDueAt)} if they stay quiet.</p>
          ) : null}
          {lead.status !== 'MEETING_BOOKED' && lead.proposedSlots.length > 0 ? (
            <div className="slots">
              <h2>Open slots</h2>
              {lead.proposedSlots.map((slot) => (
                <button key={slot.id} type="button" className="slot" onClick={() => onBook(slot.id)} disabled={booking !== null}>
                  <span>{slot.label}</span>
                  <small>{booking === slot.id ? 'Booking…' : 'Book'}</small>
                </button>
              ))}
            </div>
          ) : null}
          {booked.length > 0 ? (
            <div className="slots">
              <h2>Booked</h2>
              {booked.map((meeting) => (
                <p key={meeting.id} className="booked-line">
                  {meeting.title}
                  <span>{formatWhen(meeting.startsAt)}</span>
                </p>
              ))}
            </div>
          ) : null}
        </section>

        <section className="card chat-card">
          <header className="chat-head">
            <div>
              <h2>WhatsApp</h2>
              <p>Simulated channel via the webhook. Replies are generated by the assistant.</p>
            </div>
          </header>
          <div className="thread" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`bubble-row ${message.direction.toLowerCase()}`}>
                <div className="bubble">
                  <span className="who">{message.direction === 'INBOUND' ? lead.name : 'Assistant'}</span>
                  <p>{message.body}</p>
                  <time dateTime={message.createdAt}>{formatRelative(message.createdAt)}</time>
                </div>
              </div>
            ))}
          </div>
          <form className="composer" onSubmit={onSend}>
            <label htmlFor="sim">Simulate an inbound WhatsApp message</label>
            <textarea
              id="sim"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={3}
              maxLength={4000}
              placeholder="Write as the lead…"
            />
            <div className="composer-row">
              {sending ? <span className="muted">Assistant is replying…</span> : <span className="muted">Posted to /api/webhooks/whatsapp</span>}
              <button className="button" type="submit" disabled={sending || text.trim().length === 0}>
                Send as lead
              </button>
            </div>
            {sendError ? <p className="form-error">{sendError}</p> : null}
          </form>
        </section>
      </div>
    </div>
  );
}
