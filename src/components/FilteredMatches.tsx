'use client';

import { useState } from 'react';
import type { StreamedMatch } from '@/lib/streamed';
import MatchCard from './MatchCard';

type FilterType = 'all' | 'live';

function isLiveMatch(timestamp?: number): boolean {
  if (!timestamp) return false;
  const matchDate = new Date(timestamp);
  const now = new Date();
  const diffMinutes = (matchDate.getTime() - now.getTime()) / (1000 * 60);
  return diffMinutes >= -5 && diffMinutes <= 90;
}

export default function FilteredMatches({ matches }: { matches: StreamedMatch[] }) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredMatches = filter === 'live' 
    ? matches.filter(match => isLiveMatch(match.date))
    : matches;

  const liveCount = matches.filter(match => isLiveMatch(match.date)).length;

  return (
    <>
      {/* Top Navigation Bar */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-white">Goal Pulse ⚽</span>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-full px-6 py-2 text-sm font-semibold transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'border border-white/20 bg-white/5 text-white hover:bg-white/10'
            }`}
          >
            All Matches
          </button>
          
          <button
            onClick={() => setFilter('live')}
            className={`rounded-full px-6 py-2 text-sm font-semibold transition flex items-center gap-2 ${
              filter === 'live'
                ? 'bg-red-600 text-white'
                : 'border border-white/20 bg-white/5 text-white hover:bg-white/10'
            }`}
          >
            <span className={`inline-block h-2 w-2 rounded-full ${
              filter === 'live' ? 'bg-white' : 'bg-red-500'
            }`}></span>
            Live
            {liveCount > 0 && <span className="text-xs ml-1">({liveCount})</span>}
          </button>
        </div>
      </div>

      {/* Matches Grid */}
      {filteredMatches.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-8 text-center text-muted">
          <p className="text-lg font-semibold text-white">
            {filter === 'live' ? 'No live matches right now.' : 'No football matches available.'}
          </p>
          <p className="mt-2 text-sm">
            {filter === 'live' ? 'Check back soon for live matches.' : 'Check back soon for fresh fixtures.'}
          </p>
        </div>
      ) : (
        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filteredMatches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </section>
      )}
    </>
  );
}
