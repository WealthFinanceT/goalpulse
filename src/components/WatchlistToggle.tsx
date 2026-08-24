'use client';

import { useEffect, useState } from 'react';

export default function WatchlistToggle({ matchId }: { matchId: string }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedMatches = JSON.parse(window.localStorage.getItem('goal-pulse-watchlist') || '[]') as string[];
    setSaved(savedMatches.includes(matchId));
  }, [matchId]);

  function toggleSaved() {
    const savedMatches = JSON.parse(window.localStorage.getItem('goal-pulse-watchlist') || '[]') as string[];
    const next = savedMatches.includes(matchId) ? savedMatches.filter((id) => id !== matchId) : [...savedMatches, matchId];
    window.localStorage.setItem('goal-pulse-watchlist', JSON.stringify(next));
    setSaved(next.includes(matchId));
  }

  return <button type="button" onClick={toggleSaved} className="mt-2 w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20">{saved ? 'Saved to watchlist' : 'Add to watchlist'}</button>;
}
