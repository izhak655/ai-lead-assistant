'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { LeadTable } from '../../components/LeadTable';
import { api, API_URL } from '../../lib/api';
import { PIPELINE } from '../../lib/format';
import type { Lead } from '../../lib/types';

export default function LeadsPage() {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancel = false;
    async function load() {
      try {
        const result = await api.leads({ status: status || undefined, q: debounced || undefined });
        if (!cancel) {
          setLeads(result.leads);
          setError(null);
        }
      } catch (err) {
        if (!cancel) setError(err instanceof Error ? err.message : 'Unable to load leads');
      }
    }
    void load();
    return () => {
      cancel = true;
    };
  }, [status, debounced]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setFormError(null);
    try {
      const created = await api.createLead({
        name: String(form.get('name') ?? ''),
        phone: String(form.get('phone') ?? ''),
        company: String(form.get('company') ?? ''),
        need: String(form.get('need') ?? ''),
      });
      router.push(`/leads/${created.lead.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create the lead');
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <header className="page-head row">
        <div>
          <p className="eyebrow">CRM</p>
          <h1>Leads</h1>
          <p className="lede">Everyone who has written in, plus leads added by hand.</p>
        </div>
        <button className="button" type="button" onClick={() => setOpenForm((value) => !value)}>
          {openForm ? 'Close' : 'New lead'}
        </button>
      </header>

      {error ? (
        <div className="banner" role="alert">
          Cannot reach the API at {API_URL}. {error}
        </div>
      ) : null}

      {openForm ? (
        <form className="card form-grid" onSubmit={onCreate}>
          <label>
            Name
            <input name="name" required maxLength={120} placeholder="Yael Mizrahi" />
          </label>
          <label>
            Phone
            <input name="phone" required maxLength={32} placeholder="052-111-0099" />
          </label>
          <label>
            Company
            <input name="company" maxLength={255} placeholder="Mizrahi Clinic" />
          </label>
          <label className="span-2">
            Need
            <input name="need" maxLength={2000} placeholder="What should the assistant handle?" />
          </label>
          {formError ? <p className="form-error">{formError}</p> : null}
          <div className="form-actions">
            <button className="button" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Create lead'}
            </button>
          </div>
        </form>
      ) : null}

      <div className="toolbar">
        <div className="filters" role="tablist" aria-label="Filter by status">
          <button type="button" className={status === '' ? 'chip on' : 'chip'} onClick={() => setStatus('')}>
            All
          </button>
          {PIPELINE.map((stage) => (
            <button
              key={stage.status}
              type="button"
              className={status === stage.status ? 'chip on' : 'chip'}
              onClick={() => setStatus(stage.status)}
            >
              {stage.label}
            </button>
          ))}
        </div>
        <label className="search">
          <span className="sr">Search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, company, phone"
          />
        </label>
      </div>

      <section className="card">
        <LeadTable leads={leads} />
      </section>
    </div>
  );
}
