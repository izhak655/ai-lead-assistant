import Link from 'next/link';
import { formatRelative, scoreTone } from '../lib/format';
import type { Lead } from '../lib/types';
import { StatusPill } from './StatusPill';

export function LeadTable({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) {
    return <p className="empty">No leads in this view.</p>;
  }
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Lead</th>
            <th>Status</th>
            <th>Score</th>
            <th>Last message</th>
            <th>Activity</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id}>
              <td>
                <Link href={`/leads/${lead.id}`} className="lead-link">
                  <strong>{lead.name}</strong>
                  <span>{lead.company || lead.phone}</span>
                </Link>
              </td>
              <td>
                <StatusPill status={lead.status} />
              </td>
              <td>
                <span className={`score-num tone-${scoreTone(lead.score)}`}>{lead.score}</span>
                <span className="score-track" aria-hidden="true">
                  <span style={{ width: `${lead.score}%` }} />
                </span>
              </td>
              <td className="preview">{lead.lastMessage?.body ?? '—'}</td>
              <td className="muted">{formatRelative(lead.lastMessage?.createdAt ?? lead.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
