'use client';

import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Menu, Bell, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface HeaderBarProps {
  onToggleSidebar?: () => void;
  title?: string;
}

export function HeaderBar({ onToggleSidebar, title = 'Teqfocus Timesheets' }: HeaderBarProps) {
  const { data: session } = useSession();

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  const userInitials = session?.user?.name
    ? session.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'TF';

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md">
      <div className="flex items-center space-x-4">
        {onToggleSidebar && (
          <Button variant="ghost" size="icon" onClick={onToggleSidebar} aria-label="Toggle Sidebar">
            <Menu className="h-5 w-5 text-slate-600" />
          </Button>
        )}
        <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
      </div>

      <div className="flex items-center space-x-3">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-5 w-5 text-slate-600" />
        </Button>
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white shadow-sm">
            {userInitials}
          </div>
          {session?.user?.name && (
            <span className="hidden text-sm font-medium text-slate-700 md:inline-block">
              {session.user.name}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          title="Sign Out"
          aria-label="Sign Out"
        >
          <LogOut className="h-5 w-5 text-slate-600 hover:text-red-600" />
        </Button>
      </div>
    </header>
  );
}
