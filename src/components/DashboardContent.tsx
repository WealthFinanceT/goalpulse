'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Award, CalendarDays, Play, Radio, Trophy } from 'lucide-react';
import FilteredMatches from '@/components/FilteredMatches';
import SiteShell from '@/components/SiteShell';
import type { StreamedMatch } from '@/lib/streamed';
import { useMatchPolling } from '@/components/useMatchPolling';

type SocialPlatform = 'instagram' | 'youtube' | 'telegram' | 'whatsapp';

function SocialIcon({ platform }: { platform: SocialPlatform }) {
  if (platform === 'youtube') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path fill="#FF0033" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.6 3.6 12 3.6 12 3.6s-7.6 0-9.4.5A3 3 0 0 0 .5 6.2C0 8 0 12 0 12s0 4 .5 5.8a3 3 0 0 0 2.1 2.1c1.8.5 9.4.5 9.4.5s7.6 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 16 24 12 24 12s0-4-.5-5.8Z" />
        <path fill="#fff" d="m9.6 15.6 6.3-3.6-6.3-3.6v7.2Z" />
      </svg>
    );
  }

  if (platform === 'whatsapp') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path fill="currentColor" d="M12 2a9.8 9.8 0 0 0-8.4 14.9L2.3 22l5.2-1.3A9.9 9.9 0 1 0 12 2Zm0 17.9a8 8 0 0 1-4.1-1.1l-.3-.2-3.1.8.8-3-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.8c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-1.9-1.2 7 7 0 0 1-1.3-1.6c-.1-.2 0-.4.1-.5l.4-.5.2-.4c.1-.2 0-.3 0-.4l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3 2.3 2.3 0 0 0-.8 1.7 4 4 0 0 0 .8 2.1 9.2 9.2 0 0 0 3.6 3.4c.5.2.9.4 1.2.5.5.2.9.2 1.3.1.4-.1 1.4-.6 1.6-1.1.2-.5.2-.9.1-1-.1-.1-.2-.2-.4-.3Z" />
      </svg>
    );
  }

  if (platform === 'telegram') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path fill="#2AABEE" d="M21.8 3.2 2.7 10.6c-1.3.5-1.3 1.2-.2 1.6l4.9 1.5 1.9 5.8c.2.6.1.8.7.8.5 0 .7-.2 1-.5l2.4-2.3 5 3.7c.9.5 1.5.2 1.7-.8l3.2-15.1c.3-1.2-.5-1.7-1.5-1.3ZM8.2 13.4l10.6-6.7c.5-.3 1-.1.6.2l-8.8 8-.3 3.4-2.1-4.9Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <defs>
        <linearGradient id="instagram-icon-gradient" x1="0" x2="1" y1="1" y2="0">
          <stop offset="0" stopColor="#FFB13D" />
          <stop offset=".5" stopColor="#E1306C" />
          <stop offset="1" stopColor="#833AB4" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="18" height="18" rx="5.5" fill="none" stroke="url(#instagram-icon-gradient)" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="url(#instagram-icon-gradient)" strokeWidth="2" />
      <circle cx="17.6" cy="6.7" r="1.2" fill="#E1306C" />
    </svg>
  );
}

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
      if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
        throw new Error('The match service returned an unexpected response. Please try again.');
      }
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== 'object' || !('matches' in payload) || !Array.isArray(payload.matches)) {
        throw new Error('The match service returned invalid fixture data. Please try again.');
      }
      const newMatches = payload.matches.filter((match): match is StreamedMatch =>
        Boolean(match && typeof match === 'object' && 'id' in match && typeof match.id === 'string' && 'title' in match && typeof match.title === 'string')
      );
      setMatches((current) => {
        const ids = new Set(current.map((match) => match.id));
        return [...current, ...newMatches.filter((match) => !ids.has(match.id))];
      });
    } catch (error) {
      setLoadMoreError(error instanceof Error ? error.message : 'Unable to load more fixtures. Please try again.');
    } finally {
      setLoadingMore(false);
    }
  }

  const quickLinks = [
    { label: 'Live centre', description: 'Follow every match currently in play.', href: '/live', icon: Radio },
    { label: 'Ballon d’Or 2026', description: 'Open the official ceremony stream.', href: '/ballon-dor-2026', icon: Award },
    { label: 'Fixtures', description: 'See the next scheduled kick-offs.', href: '/upcoming', icon: CalendarDays },
    { label: 'Competitions', description: 'Browse leagues in the match feed.', href: '/leagues', icon: Trophy }
  ];

  const socialLinks: { label: string; platform: SocialPlatform; href: string }[] = [
    { label: 'Instagram', platform: 'instagram', href: 'https://www.instagram.com/goalpulse' },
    { label: 'YouTube', platform: 'youtube', href: 'https://www.youtube.com/@goalpulse' },
    { label: 'Telegram', platform: 'telegram', href: 'https://t.me/goalpulse' },
    { label: 'WhatsApp', platform: 'whatsapp', href: 'https://chat.whatsapp.com/HKxIeuTdx722izewdAHpZY' }
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

      <section aria-label="Explore Goal Pulse" className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        <nav aria-label="Goal Pulse social channels" className="flex flex-wrap items-center gap-2">
          {socialLinks.map(({ label, platform, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-300 transition hover:border-violet-400/35 hover:bg-violet-500/10 hover:text-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071018]"
            >
              <SocialIcon platform={platform} />
            </a>
          ))}
        </nav>
      </footer>
    </SiteShell>
  );
}
