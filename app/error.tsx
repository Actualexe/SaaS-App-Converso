'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex flex-col items-center justify-center gap-4 pt-20 text-center">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="text-lg">
        We could not load this page. The issue has been reported.
      </p>
      <button className="btn-primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
