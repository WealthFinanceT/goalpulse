'use client';

import { useEffect, useState } from 'react';
import type { StreamedMatch } from '@/lib/streamed';

const LIVE_POLL_MS = 15_000;
const NEAR_KICKOFF_POLL_MS = 30_000;
const NEAR_KICKOFF_WINDOW_MS = 2 * 60 * 60 * 1000;

export function useMatchPolling(initialMatches: StreamedMatch[], enabled = true): StreamedMatch[] {
  const [matches, setMatches] = useState(initialMatches);

  useEffect(() => {
    setMatches(initialMatches);
  }, [initialMatches]);

  useEffect(() => {
    if (!enabled) return;

    const shouldPoll = matches.some((match) => {
      const kickoff = match.kickoffTime;
      return match.status === 'live' || Boolean(kickoff && kickoff > Date.now() && kickoff - Date.now() <= NEAR_KICKOFF_WINDOW_MS);
    });
    if (!shouldPoll) return;

    const interval = matches.some((match) => match.status === 'live') ? LIVE_POLL_MS : NEAR_KICKOFF_POLL_MS;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch('/api/matches', { cache: 'no-store' });
        if (!response.ok) return;
        const refreshedMatches = (await response.json()) as StreamedMatch[];
        setMatches(refreshedMatches);
      } catch {
        // Keep the last known fixture state through transient network failures.
      }
    }, interval);

    return () => window.clearInterval(timer);
  }, [enabled, matches]);

  return matches;
}
