'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/constants/app.constants';
import { cn } from '@/lib/utils';
import { Clock, Users, Briefcase, UserCheck, User, BarChart3 } from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Clock,
  Users,
  Briefcase,
  UserCheck,
  User,
  BarChart3,
};

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-slate-200 bg-white h-screen flex flex-col p-4 space-y-6">
      <div className="flex items-center px-3 py-2 space-x-3">
        <div className="h-9 w-9 rounded-lg bg-brand-600 flex items-center justify-center font-bold text-white shadow-sm">
          TF
        </div>
        <span className="font-bold text-slate-900 text-lg tracking-tight">Teqfocus</span>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const IconComponent = iconMap[item.icon] || Clock;
          const isActive = pathname === item.route;

          return (
            <Link
              key={item.route}
              href={item.route}
              className={cn(
                'flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <IconComponent className={cn('h-5 w-5', isActive ? 'text-brand-600' : 'text-slate-400')} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 pt-4 px-3 text-xs text-slate-400">
        &copy; 2026 Teqfocus Consulting
      </div>
    </aside>
  );
}
