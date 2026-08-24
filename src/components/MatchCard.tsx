import Link from 'next/link';
import { Bell, CalendarDays, Goal, Play } from 'lucide-react';
import type { StreamedMatch } from '@/lib/streamed';

function formatDate(timestamp?: number) {
  if (!timestamp) return 'TBA';
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function getTeamNames(match: StreamedMatch): { home: string; away: string } {
  if (match.teams?.home && match.teams?.away) {
    return {
      home: match.teams.home.name,
      away: match.teams.away.name
    };
  }

  const parts = match.title.split(/\s+vs\.?\s+/i);
  return {
    home: parts[0]?.trim() || 'TBA',
    away: parts[1]?.trim() || 'TBA'
  };
}

function getBadgeUrl(badge?: string): string | null {
  if (badge && badge.trim()) {
    return `https://streamed.pk/api/images/badge/${badge}.webp`;
  }
  return null;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function isLiveMatch(timestamp?: number): boolean {
  if (!timestamp) return false;
  const matchDate = new Date(timestamp);
  const now = new Date();
  const diffMinutes = (matchDate.getTime() - now.getTime()) / (1000 * 60);
  return diffMinutes >= -5 && diffMinutes <= 90;
}

export default function MatchCard({ match }: { match: StreamedMatch }) {
  const { home, away } = getTeamNames(match);
  const isLive = isLiveMatch(match.date);
  const isUpcoming = Boolean(match.date && new Date(match.date).getTime() > Date.now() && !isLive);
  const homeLogo = getBadgeUrl(match.teams?.home.badge);
  const awayLogo = getBadgeUrl(match.teams?.away.badge);

  return (
    <Link href={`/match/${match.id}`} className="group block h-full focus:outline-none">
      <article className="group relative h-full overflow-hidden rounded-[22px] border border-white/8 bg-[#071018]/95 p-4 shadow-[0_20px_40px_rgba(2,6,23,0.24)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/35 hover:shadow-[0_24px_50px_rgba(16,185,129,0.12)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),transparent_38%)] opacity-0 transition duration-300 group-hover:opacity-100" />

        <div className="relative flex h-full flex-col">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="rounded-full border border-white/10 bg-white/4 px-2.5 py-1 text-[0.56rem] font-semibold uppercase tracking-[0.2em] text-slate-300">
              {match.category || 'Football'}
            </span>

            <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.56rem] font-semibold uppercase tracking-[0.16em] ${
              isLive
                ? 'border-red-500/30 bg-red-500/15 text-red-200'
                : isUpcoming
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                  : 'border-white/10 bg-white/5 text-slate-300'
            }`}>
              {isLive && <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />}
              {isLive ? 'LIVE' : isUpcoming ? 'Upcoming' : 'Finished'}
            </div>
          </div>

          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
              {homeLogo ? (
                <img
                  src={homeLogo}
                  alt={home}
                  className="h-16 w-16 rounded-full border border-white/10 bg-[#0b1620] object-contain p-2"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      const div = document.createElement('div');
                      div.className = 'flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-emerald-500 to-emerald-700 text-xs font-bold text-white';
                      div.textContent = getInitials(home);
                      parent.appendChild(div);
                    }
                  }}
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-emerald-500 to-emerald-700 text-xs font-bold text-white">
                  {getInitials(home)}
                </div>
              )}
              <span className="w-full break-words text-sm font-semibold text-white">{home}</span>
            </div>

            <div className="flex shrink-0 flex-col items-center gap-2 pt-1">
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[0.58rem] font-bold uppercase tracking-[0.18em] text-slate-300">vs</span>
              <Goal size={24} strokeWidth={1.6} className="text-emerald-300" aria-hidden="true" />
            </div>

            <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
              {awayLogo ? (
                <img
                  src={awayLogo}
                  alt={away}
                  className="h-16 w-16 rounded-full border border-white/10 bg-[#0b1620] object-contain p-2"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      const div = document.createElement('div');
                      div.className = 'flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-orange-500 to-orange-700 text-xs font-bold text-white';
                      div.textContent = getInitials(away);
                      parent.appendChild(div);
                    }
                  }}
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-orange-500 to-orange-700 text-xs font-bold text-white">
                  {getInitials(away)}
                </div>
              )}
              <span className="w-full break-words text-sm font-semibold text-white">{away}</span>
            </div>
          </div>

          <div className="mb-4 rounded-[18px] border border-white/8 bg-white/4 p-3.5">
            <p className="flex items-center gap-2 text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-slate-400"><CalendarDays size={13} strokeWidth={1.8} aria-hidden="true" />Match time</p>
            <p className="mt-2 text-sm font-medium text-slate-200">{formatDate(match.date)}</p>
          </div>

          <div className="mt-auto flex items-center justify-between gap-3 pt-1">
            <span className="text-xs text-slate-400">{isLive ? 'Live' : 'Date'}</span>
            <span className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.16em] ${
              isLive
                ? 'bg-emerald-500 text-[#03160d]'
                : 'border border-white/10 bg-white/4 text-slate-200'
            }`}>
              <span className="inline-flex items-center gap-1.5">{isLive ? <Play size={12} fill="currentColor" aria-hidden="true" /> : <Bell size={12} aria-hidden="true" />}{isLive ? 'Watch live' : 'Remind me'}</span>
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
