'use client';

import { useEffect, useState } from 'react';
import { LeadTable } from '../components/LeadTable';
import { api, API_URL } from '../lib/api';
import { PIPELINE } from '../lib/format';
import type { Lead, Stats } from '../lib/types';

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    async function load() {
      try {
        const [nextStats, nextLeads] = await Promise.all([api.stats(), api.leads()]);
        if (cancel) return;
        setStats(nextStats);
        setLeads(nextLeads.leads);
        setError(null);
      } catch (err) {
        if (!cancel) setError(err instanceof Error ? err.message : 'Unable to load the pipeline');
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 8000);
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, []);

  const openCount = stats
    ? stats.byStatus.NEW + stats.byStatus.QUALIFYING + stats.byStatus.QUALIFIED
    : 0;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Pipeline</p>
          <h1>Inbound leads</h1>
          <p className="lede">
            WhatsApp-style conversations are qualified in the background, scored on need, budget, timeline, and
            authority, then offered a meeting when they fit.
          </p>
        </div>
      </header>

      {error ? (
        <div className="banner" role="alert">
          Cannot reach the API at {API_URL}. {error}. Start the stack with <code>docker compose up --build</code>.
        </div>
      ) : null}

      <section className="stats" aria-label="Pipeline summary">
        <article className="stat">
          <span>Open leads</span>
          <strong>{stats ? openCount : '—'}</strong>
          <small>New, qualifying, or qualified</small>
        </article>
        <article className="stat">
          <span>Qualified</span>
          <strong>{stats ? stats.byStatus.QUALIFIED : '—'}</strong>
          <small>Ready for a meeting</small>
        </article>
        <article className="stat">
          <span>Upcoming meetings</span>
          <strong>{stats ? stats.upcomingMeetings : '—'}</strong>
          <small>Asia/Jerusalem</small>
        </article>
        <article className="stat">
          <span>Average score</span>
          <strong>{stats ? stats.averageScore : '—'}</strong>
          <small>Out of 100, server-side</small>
        </article>
      </section>

      <section className="split">
        <article className="card">
          <h2>Stages</h2>
          <ul className="pipeline">
            {PIPELINE.map((stage) => {
              const count = stats?.byStatus[stage.status] ?? 0;
              const width = stats && stats.totalLeads > 0 ? Math.max(6, (count / stats.totalLeads) * 100) : 0;
              return (
                <li key={stage.status}>
                  <div className="pipeline-label">
                    <span>{stage.label}</span>
                    <span>{stats ? count : '—'}</span>
                  </div>
                  <div className="pipeline-track">
                    <span className={`pipeline-fill fill-${stage.status.toLowerCase()}`} style={{ width: `${width}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </article>
        <article className="card">
          <h2>How scoring works</h2>
          <p className="card-copy">
            The model extracts fields. The server owns the score, so a demo and a live OpenAI run stay comparable.
          </p>
          <ul className="weights">
            <li>
              <span>Need</span>
              <b>30</b>
            </li>
            <li>
              <span>Budget</span>
              <b>25</b>
            </li>
            <li>
              <span>Timeline</span>
              <b>20</b>
            </li>
            <li>
              <span>Authority</span>
              <b>15</b>
            </li>
            <li>
              <span>Profile</span>
              <b>10</b>
            </li>
          </ul>
          <p className="card-note">No budget, or a non-buyer, caps the score at 24 and skips the meeting offer.</p>
        </article>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Recent</h2>
          <span className="muted">{leads.length} leads</span>
        </div>
        <LeadTable leads={leads} />
      </section>
    </div>
  );
}
