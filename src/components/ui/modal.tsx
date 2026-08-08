'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div
        className={cn(
          'relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95',
          className,
        )}
      >
        <div className="flex items-center justify-between pb-4">
          {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close modal">
            <X className="h-4 w-4 text-slate-500" />
          </Button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
