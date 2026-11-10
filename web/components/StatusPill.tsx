import { statusLabel } from '../lib/format';

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`pill pill-${status.toLowerCase().replaceAll('_', '-')}`}>
      <span className="pill-dot" aria-hidden="true" />
      {statusLabel(status)}
    </span>
  );
}
