'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function CaretakerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-4 p-8 text-center border rounded-lg border-border/60 bg-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold">Caretaker portal failed to load</h2>
          <p className="text-sm text-muted-foreground">
            {error.message || 'An unexpected error occurred loading the caretaker dashboard.'}
          </p>
          <button onClick={reset} className="text-sm text-emerald-600 hover:underline">
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
