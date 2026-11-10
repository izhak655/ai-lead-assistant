'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, API_URL } from '../../lib/api';
import { formatDay } from '../../lib/format';
import type { Meeting } from '../../lib/types';

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const result = await api.meetings();
      setMeetings(result.meetings);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load meetings');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function confirmCancel(id: string) {
    setBusy(true);
    try {
      await api.cancelMeeting(id);
      setPendingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel the meeting');
    } finally {
      setBusy(false);
    }
  }

  const now = Date.now();
  const upcoming = meetings.filter((meeting) => meeting.status === 'BOOKED' && new Date(meeting.startsAt).getTime() >= now);
  const earlier = meetings.filter((meeting) => meeting.status !== 'BOOKED' || new Date(meeting.startsAt).getTime() < now);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Calendar</p>
          <h1>Meetings</h1>
          <p className="lede">Intro calls booked from a proposed slot. Times are Asia/Jerusalem, Sunday–Thursday.</p>
        </div>
      </header>

      {error ? (
        <div className="banner" role="alert">
          Cannot reach the API at {API_URL}. {error}
        </div>
      ) : null}

      <MeetingList title="Upcoming" meetings={upcoming} empty="No upcoming calls. Qualify a lead and book a slot." pendingId={pendingId} busy={busy} onAsk={setPendingId} onConfirm={confirmCancel} />
      <MeetingList title="Earlier" meetings={earlier} empty="Nothing earlier yet." pendingId={pendingId} busy={busy} onAsk={setPendingId} onConfirm={confirmCancel} />
    </div>
  );
}

function MeetingList({
  title,
  meetings,
  empty,
  pendingId,
  busy,
  onAsk,
  onConfirm,
}: {
  title: string;
  meetings: Meeting[];
  empty: string;
  pendingId: string | null;
  busy: boolean;
  onAsk: (id: string | null) => void;
  onConfirm: (id: string) => void;
}) {
  return (
    <section className="card meeting-card">
      <div className="card-head">
        <h2>{title}</h2>
        <span className="muted">{meetings.length}</span>
      </div>
      {meetings.length === 0 ? <p className="empty">{empty}</p> : null}
      <ul className="meeting-list">
        {meetings.map((meeting) => (
          <li key={meeting.id}>
            <div>
              <strong>{meeting.title}</strong>
              <span className="muted">{formatDay(meeting.startsAt)} · 30 min</span>
              {meeting.notes ? <span className="preview">{meeting.notes}</span> : null}
            </div>
            <div className="meeting-side">
              {meeting.lead ? (
                <Link href={`/leads/${meeting.lead.id}`}>{meeting.lead.name}</Link>
              ) : (
                <span>{meeting.leadId}</span>
              )}
              <span className={`pill pill-${meeting.status === 'BOOKED' ? 'meeting-booked' : 'unqualified'}`}>
                {meeting.status === 'BOOKED' ? 'booked' : 'cancelled'}
              </span>
              {meeting.status === 'BOOKED' && pendingId !== meeting.id ? (
                <button type="button" className="text-button" onClick={() => onAsk(meeting.id)}>
                  Cancel
                </button>
              ) : null}
              {pendingId === meeting.id ? (
                <span className="confirm-row">
                  <button type="button" className="text-button danger" disabled={busy} onClick={() => onConfirm(meeting.id)}>
                    Confirm cancel
                  </button>
                  <button type="button" className="text-button" onClick={() => onAsk(null)}>
                    Keep
                  </button>
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
