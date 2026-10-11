'use client';

import Link from 'next/link';
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { formatMatchDate, getMatchCompetition, getMatchSearchText, getMatchStatusLabel, normalizeSearchText, type StreamedMatch } from '@/lib/streamed';

type SearchItem = { kind: 'match'; id: string; href: string; label: string; detail: string } | { kind: 'competition'; id: string; href: string; label: string; detail: string };

export default function FixtureSearch({ matches }: { matches: StreamedMatch[] }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const timer = window.setTimeout(() => setDebouncedQuery(query), 150); return () => window.clearTimeout(timer); }, [query]);
  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, []);
  const results = useMemo(() => {
    const term = normalizeSearchText(debouncedQuery);
    if (!term) return [] as SearchItem[];
    const matchedFixtures = matches.filter((match) => getMatchSearchText(match).includes(term)).slice(0, 7).map((match) => ({ kind: 'match' as const, id: match.id, href: `/match/${encodeURIComponent(match.id)}`, label: match.title, detail: `${getMatchCompetition(match).name} · ${formatMatchDate(match.kickoffTime)} · ${getMatchStatusLabel(match)}` }));
    const competitionMap = new Map<string, ReturnType<typeof getMatchCompetition>>();
    matches.forEach((match) => { const competition = getMatchCompetition(match); if (normalizeSearchText(competition.name).includes(term)) competitionMap.set(competition.id, competition); });
    const competitionResults: SearchItem[] = [...competitionMap.values()].slice(0, 3).map((competition) => ({ kind: 'competition', id: competition.id, href: `/leagues?competition=${encodeURIComponent(competition.id)}`, label: competition.name, detail: 'Open competition fixtures' }));
    return [...competitionResults, ...matchedFixtures].slice(0, 8);
  }, [debouncedQuery, matches]);
  const showResults = open && query.trim().length > 0;
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') { setOpen(false); setActiveIndex(-1); return; }
    if (!results.length) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, results.length - 1)); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
    if (event.key === 'Enter' && activeIndex >= 0) window.location.assign(results[activeIndex].href);
  }
  return <div ref={searchRef} className="relative z-[70] w-full max-w-[720px]">
    <label className="relative block"><span className="sr-only">Search fixtures and competitions</span><Search size={18} strokeWidth={1.8} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true); setActiveIndex(-1); }} onFocus={() => setOpen(true)} onKeyDown={onKeyDown} aria-label="Search fixtures and competitions" aria-autocomplete="list" aria-expanded={showResults} className="w-full rounded-full border border-white/10 bg-[#0a1320] py-3 pl-10 pr-10 text-[0.95rem] text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-400/40" placeholder="Search teams, matches or competitions..." />{query && <button type="button" onClick={() => { setQuery(''); setOpen(false); }} aria-label="Clear search" className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white"><X size={16} aria-hidden="true" /></button>}</label>
    {showResults && <div role="listbox" className="absolute left-0 top-full z-[80] mt-2 max-h-[min(60vh,32rem)] w-full overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[#071018] p-2 shadow-[0_20px_45px_rgba(2,6,23,0.65)]">{results.length ? results.map((result, index) => <Link role="option" aria-selected={index === activeIndex} key={`${result.kind}-${result.id}`} href={result.href} onMouseEnter={() => setActiveIndex(index)} onClick={() => setOpen(false)} className={`block rounded-xl px-3 py-3 transition ${index === activeIndex ? 'bg-emerald-500/15' : 'hover:bg-white/5'}`}><span className="block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-emerald-300">{result.kind === 'match' ? 'Fixture' : 'Competition'}</span><span className="mt-1 block truncate text-sm font-semibold text-white">{result.label}</span><span className="mt-1 block truncate text-xs text-slate-400">{result.detail}</span></Link>) : <p className="px-3 py-5 text-center text-sm text-slate-400">No current fixture or competition matches that search.</p>}</div>}
  </div>;
}
