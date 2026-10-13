'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Play, Radio, Trophy } from 'lucide-react';
import FilteredMatches from '@/components/FilteredMatches';
import SiteShell from '@/components/SiteShell';
import type { StreamedMatch } from '@/lib/streamed';
import { useMatchPolling } from '@/components/useMatchPolling';

export default function DashboardContent({
  initialMatches,
  totalMatches,
  errorMessage
}: {
  initialMatches: StreamedMatch[];
  totalMatches: number;
  errorMessage: string;
}) {
  const [matches, setMatches] = useState(initialMatches);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState('');
  const refreshedMatches = useMatchPolling(matches);

  useEffect(() => {
    setMatches(initialMatches);
  }, [initialMatches]);

  async function loadMoreFixtures() {
    if (loadingMore || matches.length >= totalMatches) return;
    setLoadingMore(true);
    setLoadMoreError('');
    try {
      const response = await fetch(`/api/matches?offset=${matches.length}&limit=9`);
      if (!response.ok) throw new Error('Unable to load more fixtures. Please try again.');
      const page = await response.json() as { matches: StreamedMatch[] };
      setMatches((current) => {
        const ids = new Set(current.map((match) => match.id));
        return [...current, ...page.matches.filter((match) => !ids.has(match.id))];
      });
    } catch (error) {
      setLoadMoreError(error instanceof Error ? error.message : 'Unable to load more fixtures. Please try again.');
    } finally {
      setLoadingMore(false);
    }
  }

  const quickLinks = [
    { label: 'Live centre', description: 'Follow every match currently in play.', href: '/live', icon: Radio },
    { label: 'Fixtures', description: 'See the next scheduled kick-offs.', href: '/upcoming', icon: CalendarDays },
    { label: 'Competitions', description: 'Browse leagues in the match feed.', href: '/leagues', icon: Trophy }
  ];

  const socialLinks = [
    { label: 'Instagram', href: 'https://www.instagram.com/goalpulse' },
    { label: 'YouTube', href: 'https://www.youtube.com/@goalpulse' },
    { label: 'Telegram', href: 'https://t.me/goalpulse' },
    { label: 'WhatsApp', href: 'https://chat.whatsapp.com/HKxIeuTdx722izewdAHpZY' }
  ];

  return (
    <SiteShell searchMatches={refreshedMatches}>
      <section data-theme-hero className="relative mb-5 overflow-hidden rounded-2xl border border-white/10 bg-[#11121a] px-5 py-7 shadow-[0_18px_48px_rgba(0,0,0,0.28)] sm:px-7 sm:py-9 lg:mb-6 lg:rounded-3xl lg:px-9 lg:py-10">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-[center_42%] opacity-50"
          style={{ backgroundImage: "linear-gradient(90deg, rgba(9,10,16,0.97) 0%, rgba(9,10,16,0.87) 48%, rgba(9,10,16,0.54) 100%), url('https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1600&q=80')" }}
        />
        <div className="relative z-10 max-w-3xl">
          <p className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Your football, in focus
          </p>
          <h1 className="mt-4 max-w-2xl text-[clamp(2.35rem,7vw,4.6rem)] font-bold leading-[0.99] tracking-[-0.055em] text-white">
            Every match.
            <span className="block text-emerald-300">One place.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-200/85 sm:text-base sm:leading-7">
            Live scores, upcoming fixtures and match streams, follow the football that matters to you.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link href="/live" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-[#03160d] transition hover:bg-emerald-400">
              <Play size={15} fill="currentColor" aria-hidden="true" /> Live matches
            </Link>
            <Link href="/upcoming" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]">
              <CalendarDays size={16} aria-hidden="true" /> Upcoming fixtures
            </Link>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-5 text-red-100">
          <p className="text-base font-semibold">Unable to load matches</p>
          <p className="mt-2 text-sm text-red-100/80">{errorMessage}</p>
        </div>
      ) : (
        <>
          <FilteredMatches
            matches={refreshedMatches}
            totalMatches={totalMatches}
            onLoadMore={loadMoreFixtures}
            loadingMore={loadingMore}
          />
          {loadMoreError ? <p role="alert" className="mt-3 text-center text-sm text-red-300">{loadMoreError}</p> : null}
        </>
      )}

      <section aria-label="Explore Goal Pulse" className="mt-5 grid gap-3 sm:grid-cols-3">
        {quickLinks.map(({ label, description, href, icon: Icon }) => (
          <Link key={href} href={href} className="group flex min-w-0 items-start gap-3 rounded-xl border border-white/8 bg-[#071018]/90 p-4 transition-colors hover:border-emerald-400/25 hover:bg-[#11121a] sm:p-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-400/15 bg-emerald-500/10 text-emerald-300">
              <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2 text-sm font-semibold text-white">
                {label}<ArrowRight size={15} className="shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-emerald-300" aria-hidden="true" />
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-400">{description}</span>
            </span>
          </Link>
        ))}
      </section>

      <footer className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 py-4">
        <p className="text-xs text-slate-500">Goal Pulse · Football, in focus.</p>
        <nav aria-label="Goal Pulse social channels" className="flex flex-wrap gap-x-4 gap-y-2">
          {socialLinks.map(({ label, href }) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-slate-400 transition hover:text-emerald-300">
              {label}
            </a>
          ))}
        </nav>
      </footer>
    </SiteShell>
  );
}
