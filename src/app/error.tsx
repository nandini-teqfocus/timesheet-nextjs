'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center space-y-4 text-center p-6">
      <h2 className="text-2xl font-bold text-slate-900">Something went wrong!</h2>
      <p className="text-sm text-slate-500 max-w-md">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <Button onClick={() => reset()} variant="default">
        Try Again
      </Button>
    </div>
  );
}
