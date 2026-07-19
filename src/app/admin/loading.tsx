import { Loader2 } from 'lucide-react';
import { Suspense } from 'react';

export default function Loading() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm text-muted-foreground">Loading admin dashboard…</p>
      </div>
    </div>
  );
}
