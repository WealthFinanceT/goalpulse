'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, TrendingUp } from 'lucide-react';
import type { StreamedMatch } from '@/lib/streamed';
import { getMatchCompetition, isMatchLive, isMatchUpcoming } from '@/lib/streamed';
import MatchCard from './MatchCard';

type FilterType = 'all' | 'live' | 'upcoming' | 'finished';
const PAGE_SIZE = 9;

function localDate(timestamp?: number) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return new Date(timestamp - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export default function FilteredMatches({ matches, searchQuery = '', totalMatches = matches.length, onLoadMore, loadingMore = false }: { matches: StreamedMatch[]; searchQuery?: string; totalMatches?: number; onLoadMore?: () => void; loadingMore?: boolean }) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [competitionId, setCompetitionId] = useState('');
  const [date, setDate] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const competitions = useMemo(() => [...new Map(matches.map((match) => { const competition = getMatchCompetition(match); return [competition.id, competition] as const; })).values()].sort((a, b) => a.name.localeCompare(b.name)), [matches]);
  const filteredMatches = useMemo(() => matches.filter((match) => {
    const searchable = [match.title, getMatchCompetition(match).name, match.teams?.home?.name, match.teams?.away?.name].filter(Boolean).join(' ').toLowerCase();
    const byStatus = filter === 'all' || (filter === 'live' && isMatchLive(match)) || (filter === 'upcoming' && isMatchUpcoming(match)) || (filter === 'finished' && match.status === 'finished');
    return (!normalizedQuery || searchable.includes(normalizedQuery)) && byStatus && (!competitionId || getMatchCompetition(match).id === competitionId) && (!date || localDate(match.kickoffTime) === date);
  }).sort((a, b) => {
    const rank = (match: StreamedMatch) => isMatchLive(match) ? 0 : isMatchUpcoming(match) ? 1 : 2;
    return rank(a) - rank(b) || (a.kickoffTime || 0) - (b.kickoffTime || 0);
  }), [matches, normalizedQuery, filter, competitionId, date]);
  const visibleMatches = filteredMatches.slice(0, visibleCount);
  const canLoadServerPage = Boolean(onLoadMore && matches.length < totalMatches);
  const changeFilter = (next: FilterType) => { setFilter(next); setVisibleCount(PAGE_SIZE); };
  const clearFilters = () => { setFilter('all'); setCompetitionId(''); setDate(''); setVisibleCount(PAGE_SIZE); };

  return <div className="min-w-0 space-y-4">
    <section className="rounded-xl border border-white/8 bg-[#071018]/95 px-3.5 py-4 shadow-[0_12px_30px_rgba(0,0,0,0.2)] sm:rounded-2xl sm:px-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div><p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-slate-400">Live & upcoming matches</p><h2 className="mt-1.5 text-xl font-bold tracking-[-0.035em] text-white sm:text-2xl">Featured fixtures</h2></div>
        <div role="group" aria-label="Filter matches by status" className="flex flex-wrap gap-1.5">{([['All', 'all'], ['Live', 'live'], ['Upcoming', 'upcoming'], ['Finished', 'finished']] as const).map(([label, value]) => <button type="button" key={value} onClick={() => changeFilter(value)} aria-pressed={filter === value} className={`min-h-10 rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:px-3.5 sm:text-sm ${filter === value ? 'bg-emerald-500 text-[#03160d]' : 'border border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/15 hover:bg-white/[0.05]'}`}>{value === 'live' ? <span className="inline-flex items-center gap-1.5"><TrendingUp size={15} aria-hidden="true" />{label}</span> : label}</button>)}</div>
      </div>
      <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <label className="sr-only" htmlFor="competition-filter">Competition</label><select id="competition-filter" value={competitionId} onChange={(event) => { setCompetitionId(event.target.value); setVisibleCount(PAGE_SIZE); }} className="min-w-0 w-full rounded-lg border border-white/10 bg-[#0a1320] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-emerald-400/50"><option value="">All competitions</option>{competitions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <label className="flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-[#0a1320] px-3 py-2 text-sm text-slate-200"><CalendarDays size={16} className="shrink-0" aria-hidden="true" /><span className="sr-only">Fixture date</span><input type="date" value={date} onChange={(event) => { setDate(event.target.value); setVisibleCount(PAGE_SIZE); }} className="min-w-0 w-full bg-transparent text-sm outline-none [color-scheme:dark]" /></label>
        {(filter !== 'all' || competitionId || date) && <button type="button" onClick={clearFilters} className="rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white">Clear filters</button>}
      </div>
    </section>
    {!filteredMatches.length ? <div className="rounded-[28px] border border-white/8 bg-[#071018]/90 p-8 text-center shadow-[0_18px_50px_rgba(0,0,0,0.25)]"><p className="text-xl font-bold text-white">{normalizedQuery ? 'No loaded fixtures match your search.' : filter === 'live' ? 'No live matches right now.' : 'No fixtures match these filters.'}</p><p className="mt-2 text-sm text-slate-400">Load another page or try another filter.</p>{canLoadServerPage && <button type="button" onClick={onLoadMore} disabled={loadingMore} className="mt-4 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-200 disabled:cursor-wait disabled:opacity-60">{loadingMore ? 'Loading fixtures…' : 'Load more fixtures'}</button>}</div> : <section id="live" className="space-y-4"><p className="text-sm text-slate-400">Showing {visibleMatches.length} loaded fixtures{totalMatches > matches.length ? ` of ${totalMatches} available` : ''}</p><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visibleMatches.map((match) => <MatchCard key={match.id} match={match} />)}</div>{visibleCount < filteredMatches.length && <div className="flex justify-center"><button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20">Show loaded fixtures</button></div>}{canLoadServerPage && <div className="flex justify-center"><button type="button" onClick={onLoadMore} disabled={loadingMore} className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-wait disabled:opacity-60">{loadingMore ? 'Loading fixtures…' : 'Load more fixtures'}</button></div>}</section>}
    <section id="leagues" className="rounded-xl border border-white/8 bg-[#071018]/90 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.16)] sm:rounded-2xl sm:p-5"><div className="mb-4"><p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-slate-400">Competitions</p><h3 className="mt-1.5 text-lg font-bold tracking-[-0.025em] text-white sm:text-xl">Browse by competition</h3></div><div className="-mx-1 flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{competitions.slice(0, 5).map((item) => <Link key={item.id} href={`/leagues?competition=${encodeURIComponent(item.id)}`} className="flex min-h-[88px] min-w-[min(72vw,210px)] flex-1 items-center rounded-xl border border-white/8 bg-white/[0.025] p-3.5 text-left transition hover:border-emerald-400/25 hover:bg-white/[0.045]"><span className="flex min-w-0 flex-1 items-center justify-between gap-3"><span className="min-w-0"><span className="block break-words text-sm font-semibold text-white">{item.name}</span><span className="mt-1 block text-xs text-slate-400">Explore fixtures</span></span><ArrowRight size={16} className="shrink-0 text-emerald-300" aria-hidden="true" /></span></Link>)}</div></section>
  </div>;
}
