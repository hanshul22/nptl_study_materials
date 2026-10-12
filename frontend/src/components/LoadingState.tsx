import { Skeleton } from './Skeleton';

export function LoadingState() {
  return (
    <div role="status" className="space-y-3 py-6">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
