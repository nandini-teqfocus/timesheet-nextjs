import React from 'react';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { HeaderBar } from '@/components/layout/header-bar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <SidebarNav />
      <div className="flex flex-1 flex-col overflow-hidden">
        <HeaderBar />
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
