import type { Metadata } from 'next';
import { SessionProvider } from '@/components/providers/session-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Teqfocus Timesheet Portal',
  description: 'Enterprise Timesheet and Employee Referral Portal',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
