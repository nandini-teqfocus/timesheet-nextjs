import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center space-y-4 text-center p-6">
      <h1 className="text-6xl font-extrabold text-brand-600">404</h1>
      <h2 className="text-2xl font-bold text-slate-900">Page Not Found</h2>
      <p className="text-sm text-slate-500 max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link href="/timesheets">
        <Button variant="default">Return to Timesheets</Button>
      </Link>
    </div>
  );
}
