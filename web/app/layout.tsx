import type { Metadata } from 'next';
import { AppShell } from '../components/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Lead Assistant',
  description: 'Qualify inbound leads, reply on a WhatsApp-style channel, and book meetings.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
