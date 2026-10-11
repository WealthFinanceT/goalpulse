'use client';

import { useEffect, useState } from 'react';
import type { StreamedMatch } from '@/lib/streamed';

const LIVE_POLL_MS = 30_000;

export function useMatchPolling(initialMatches: StreamedMatch[], enabled = true): StreamedMatch[] {
  const [matches, setMatches] = useState(initialMatches);

  useEffect(() => {
    setMatches(initialMatches);
  }, [initialMatches]);

  useEffect(() => {
    if (!enabled) return;

    const timer = window.setInterval(async () => {
      try {
        const response = await fetch('/api/matches?live=1', { cache: 'no-store' });
        if (!response.ok) return;
        const liveMatches = (await response.json()) as StreamedMatch[];
        const liveById = new Map(liveMatches.map((match) => [match.id, match]));
        setMatches((current) => current.map((match) => liveById.get(match.id) || match));
      } catch {
        // Keep the last known fixture state through transient network failures.
      }
    }, LIVE_POLL_MS);

    return () => window.clearInterval(timer);
  }, [enabled]);

  return matches;
}
