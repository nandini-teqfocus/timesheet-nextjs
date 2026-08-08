import { Skeleton } from '@/components/ui/skeleton';

export default function GlobalLoading() {
  return (
    <div className="flex h-screen w-full flex-col space-y-4 p-8">
      <Skeleton className="h-12 w-full max-w-sm" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
