'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const handleSalesforceLogin = () => {
    signIn('salesforce', { callbackUrl: '/timesheets' });
  };

  return (
    <div className="flex flex-col space-y-6 text-center">
      <div className="flex flex-col space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 font-bold text-white text-xl shadow-md">
          TF
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Teqfocus Timesheet Portal</h1>
        <p className="text-sm text-slate-500">
          Sign in using your Salesforce organizational account
        </p>
      </div>

      <Button size="lg" className="w-full" onClick={handleSalesforceLogin}>
        Sign in with Salesforce
      </Button>
    </div>
  );
}
