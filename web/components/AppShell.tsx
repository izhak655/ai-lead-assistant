'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/leads', label: 'Leads' },
  { href: '/meetings', label: 'Meetings' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mode, setMode] = useState('loading');

  useEffect(() => {
    let cancel = false;
    api
      .health()
      .then((health) => {
        if (!cancel) setMode(health.aiMode);
      })
      .catch(() => {
        if (!cancel) setMode('offline');
      });
    return () => {
      cancel = true;
    };
  }, []);

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            LA
          </span>
          <span>
            <strong>Lead Assistant</strong>
            <small>Qualify · Reply · Book</small>
          </span>
        </Link>
        <nav className="nav" aria-label="Primary">
          {NAV.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <span className={`mode mode-${mode}`}>
            {mode === 'mock' ? 'Mock AI' : mode === 'openai' ? 'OpenAI' : mode === 'loading' ? 'Checking API' : 'API offline'}
          </span>
          <p>Portfolio · Izhak Isacov</p>
        </div>
      </aside>
      <div className="main">{children}</div>
    </div>
  );
}
