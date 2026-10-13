'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, CalendarDays, Goal, Play } from 'lucide-react';
import type { StreamedMatch } from '@/lib/streamed';
import { formatMatchDate, getMatchCompetition, getMatchStatusLabel, isMatchLive, isMatchUpcoming } from '@/lib/streamed';

function getTeamNames(match: StreamedMatch): { home: string; away: string } {
  if (match.teams?.home && match.teams?.away) {
    return { home: match.teams.home.name, away: match.teams.away.name };
  }

  const parts = match.title.split(/\s+vs\.?\s+/i);
  return { home: parts[0]?.trim() || 'TBA', away: parts[1]?.trim() || 'TBA' };
}

function getBadgeUrl(badge?: string): string | null {
  if (!badge?.trim()) return null;
  return badge.startsWith('http') ? badge : `https://streamed.pk/api/images/badge/${badge}.webp`;
}

function getInitials(name: string): string {
  return name.split(' ').map((word) => word[0]).join('').toUpperCase().slice(0, 2);
}

function TeamBadge({ name, src, accent }: { name: string; src: string | null; accent: 'home' | 'away' }) {
  const [imageFailed, setImageFailed] = useState(false);
  const palette = accent === 'home' ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200' : 'border-slate-400/20 bg-slate-500/10 text-slate-200';

  if (src && !imageFailed) {
    return <img src={src} alt="" aria-hidden="true" loading="lazy" className="h-12 w-12 rounded-full border border-white/10 bg-[#0b1620] object-contain p-1.5 sm:h-14 sm:w-14" onError={() => setImageFailed(true)} />;
  }

  return <div aria-hidden="true" className={`flex h-12 w-12 items-center justify-center rounded-full border text-xs font-bold sm:h-14 sm:w-14 ${palette}`}>{getInitials(name)}</div>;
}

export default function MatchCard({ match }: { match: StreamedMatch }) {
  const { home, away } = getTeamNames(match);
  const isLive = isMatchLive(match);
  const isUpcoming = isMatchUpcoming(match);
  const competition = getMatchCompetition(match);
  const score = typeof match.score?.home === 'number' && typeof match.score?.away === 'number'
    ? `${match.score.home}–${match.score.away}`
    : 'vs';

  return (
    <Link href={`/match/${match.id}`} className="group block h-full min-w-0 focus:outline-none">
      <article className="relative h-full overflow-hidden rounded-xl border border-white/8 bg-[#101119] p-3.5 shadow-[0_12px_28px_rgba(0,0,0,0.2)] transition-colors duration-200 hover:border-emerald-500/30 sm:rounded-2xl sm:p-4">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span title={competition.name} className="min-w-0 truncate rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[0.57rem] font-semibold uppercase tracking-[0.11em] text-slate-300">
            {competition.name}
          </span>
          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[0.56rem] font-semibold uppercase tracking-[0.12em] ${
            isLive ? 'border-red-500/30 bg-red-500/15 text-red-200' : isUpcoming ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-white/5 text-slate-300'
          }`}>
            {isLive ? <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" /> : null}
            {getMatchStatusLabel(match)}
          </span>
        </div>

        <div className="my-4 flex min-w-0 items-start justify-between gap-2 sm:my-5 sm:gap-3">
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
            <TeamBadge name={home} src={getBadgeUrl(match.teams?.home?.badge)} accent="home" />
            <span title={home} className="w-full break-words text-xs font-semibold leading-4 text-white sm:text-sm">{home}</span>
          </div>
          <div className="flex max-w-[72px] shrink-0 flex-col items-center gap-1.5 pt-1">
            <span className="whitespace-nowrap rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-sm font-bold tabular-nums text-white">{score}</span>
            {isLive ? <span className="text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-red-300">Live</span> : <Goal size={20} strokeWidth={1.6} className="text-emerald-300" aria-hidden="true" />}
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
            <TeamBadge name={away} src={getBadgeUrl(match.teams?.away?.badge)} accent="away" />
            <span title={away} className="w-full break-words text-xs font-semibold leading-4 text-white sm:text-sm">{away}</span>
          </div>
        </div>

        <div className="mb-3 rounded-lg border border-white/8 bg-white/[0.025] p-3">
          <p className="flex items-center gap-2 text-[0.58rem] font-semibold uppercase tracking-[0.17em] text-slate-400"><CalendarDays size={13} strokeWidth={1.8} aria-hidden="true" />Match time</p>
          <p className="mt-1.5 break-words text-xs font-medium leading-5 text-slate-200 sm:text-sm">{formatMatchDate(match.kickoffTime)}</p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="truncate text-[0.68rem] text-slate-400">{isLive ? 'In progress' : isUpcoming ? 'Scheduled' : 'Full time'}</span>
          <span className={`inline-flex min-h-9 shrink-0 items-center justify-center rounded-md px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.1em] sm:px-3 ${
            isLive ? 'bg-emerald-500 text-[#03160d]' : 'border border-white/10 bg-white/[0.04] text-slate-200'
          }`}>
            <span className="inline-flex items-center gap-1.5">{isLive ? <Play size={12} fill="currentColor" aria-hidden="true" /> : <Bell size={12} aria-hidden="true" />}{isLive ? 'Watch live' : 'Remind me'}</span>
          </span>
        </div>
      </article>
    </Link>
  );
}
