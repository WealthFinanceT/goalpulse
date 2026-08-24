'use client';

import { useState } from 'react';
import { ArrowRight, TrendingUp } from 'lucide-react';
import type { StreamedMatch } from '@/lib/streamed';
import MatchCard from './MatchCard';

type FilterType = 'all' | 'live' | 'trending';

function isLiveMatch(timestamp?: number): boolean {
  if (!timestamp) return false;
  const matchDate = new Date(timestamp);
  const now = new Date();
  const diffMinutes = (matchDate.getTime() - now.getTime()) / (1000 * 60);
  return diffMinutes >= -5 && diffMinutes <= 90;
}

export default function FilteredMatches({
  matches,
  searchQuery = ''
}: {
  matches: StreamedMatch[];
  searchQuery?: string;
}) {
  const [filter, setFilter] = useState<FilterType>('all');

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const searchFilteredMatches = matches.filter((match) => {
    if (!normalizedQuery) {
      return true;
    }

    const searchableText = [
      match.title,
      match.category,
      match.teams?.home?.name,
      match.teams?.away?.name
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchableText.includes(normalizedQuery);
  });

  const liveMatches = searchFilteredMatches.filter((match) => isLiveMatch(match.date));
  const upcomingMatches = searchFilteredMatches.filter(
    (match) => match.date && new Date(match.date).getTime() > Date.now() && !isLiveMatch(match.date)
  );

  const filteredMatches =
    filter === 'live'
      ? liveMatches
      : filter === 'trending'
        ? searchFilteredMatches.slice(0, 6)
        : searchFilteredMatches;

  const leagueCounts = searchFilteredMatches.reduce<Record<string, number>>((acc, match) => {
    const league = match.category || 'Football';
    acc[league] = (acc[league] || 0) + 1;
    return acc;
  }, {});

  const topLeagues = Object.entries(leagueCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-white/8 bg-[#071018]/95 px-4 py-4 shadow-[0_18px_45px_rgba(0,0,0,0.3)] sm:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-slate-400">Live & upcoming matches</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white">Featured fixtures</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              ['All Matches', 'all'],
              ['Live Now', 'live'],
              ['Trending', 'trending']
            ].map(([label, value]) => (
              <button
                key={value}
                onClick={() => setFilter(value as FilterType)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  filter === value
                    ? 'bg-emerald-500 text-[#03160d] shadow-[0_12px_22px_rgba(16,185,129,0.32)]'
                    : 'border border-white/10 bg-white/4 text-slate-300 hover:border-white/15 hover:bg-white/6'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">{value === 'trending' ? <TrendingUp size={15} aria-hidden="true" /> : null}{label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {filteredMatches.length === 0 ? (
        <div className="rounded-[28px] border border-white/8 bg-[#071018]/90 p-8 text-center text-slate-300 shadow-[0_18px_50px_rgba(0,0,0,0.25)]">
          <p className="text-xl font-bold text-white">
            {normalizedQuery
              ? 'No matches match your search.'
              : filter === 'live'
                ? 'No live matches right now.'
                : 'No football matches available.'}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {normalizedQuery
              ? 'Try a different team, league, or fixture name.'
              : filter === 'live'
                ? 'Check back soon for live matches.'
                : 'Check back soon for fresh fixtures.'}
          </p>
        </div>
      ) : (
        <section id="live" className="space-y-4">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      )}

      <section id="leagues" className="rounded-[28px] border border-white/8 bg-[#071018]/90 p-4 shadow-[0_15px_40px_rgba(0,0,0,0.2)] sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Top leagues</p>
            <h3 className="mt-2 text-xl font-black tracking-[-0.04em] text-white">Popular competitions</h3>
          </div>
          <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-emerald-200">
            {topLeagues.length} live
          </span>
        </div>

        <div className="-mx-1 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {topLeagues.map(([league, count]) => (
            <div
              key={league}
              className="min-w-[220px] flex-1 rounded-[20px] border border-white/8 bg-[linear-gradient(135deg,rgba(14,116,144,0.18),rgba(4,9,17,0.85))] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#f8fafc] to-[#94a3b8] text-sm font-black text-slate-900">
                    {league.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-base font-bold text-white">{league}</p>
                    <p className="text-xs text-slate-400">{count} matches</p>
                  </div>
                </div>
                <button className="rounded-full border border-white/10 bg-white/4 px-2.5 py-1.5 text-xs font-medium text-slate-200">
                  <span className="inline-flex items-center gap-1.5">Explore <ArrowRight size={14} aria-hidden="true" /></span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
