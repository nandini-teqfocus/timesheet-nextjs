import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white/95 p-8 shadow-2xl backdrop-blur-md">
        {children}
      </div>
    </main>
  );
}
