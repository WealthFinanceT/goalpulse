import Link from 'next/link';
import { ArrowLeft, CalendarDays, CircleAlert, Goal, Radio } from 'lucide-react';
import { fetchMatchById, fetchMatchStreams, formatMatchDate, getMatchStatusLabel, isMatchLive, isMatchUpcoming } from '@/lib/streamed';
import SiteShell from '@/components/SiteShell';
import StreamSelector from '@/components/StreamSelector';

function getBadgeUrl(badge?: string): string | null {
  if (!badge?.trim()) return null;
  return badge.startsWith('http') ? badge : `https://streamed.pk/api/images/badge/${badge}.webp`;
}

function getDisplayNames(match: NonNullable<Awaited<ReturnType<typeof fetchMatchById>>>) {
  const parts = match.title.split(/\s+vs\.?\s+/i);
  return {
    homeName: match.teams?.home?.name || parts[0]?.trim() || 'Home Team',
    awayName: match.teams?.away?.name || parts[1]?.trim() || 'Away Team'
  };
}

function getInitials(name: string): string {
  return name.split(' ').map((word) => word[0]).join('').toUpperCase().slice(0, 2);
}

function TeamIdentity({ name, badge }: { name: string; badge: string | null }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-3 text-center sm:gap-4">
      {badge ? (
        <img src={badge} alt="" aria-hidden="true" className="h-14 w-14 rounded-full border border-white/10 bg-white/[0.03] object-contain p-1.5 sm:h-20 sm:w-20" />
      ) : (
        <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-500/10 text-sm font-bold text-emerald-200 sm:h-20 sm:w-20 sm:text-base">{getInitials(name)}</span>
      )}
      <h2 title={name} className="w-full break-words text-sm font-semibold leading-5 text-white sm:text-lg sm:leading-6">{name}</h2>
    </div>
  );
}

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await fetchMatchById(id);

  if (!match) {
    return (
      <SiteShell>
        <div className="mx-auto w-full max-w-4xl">
          <Link href="/" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white">
            <ArrowLeft size={16} strokeWidth={1.8} aria-hidden="true" /> Back to matches
          </Link>
          <div className="rounded-xl border border-white/8 bg-[#071018]/90 p-6 text-center sm:rounded-2xl sm:p-8">
            <p className="text-lg font-semibold text-white">Match not found</p>
            <p className="mt-2 text-sm text-slate-400">The match you’re looking for doesn’t exist or has been removed.</p>
          </div>
        </div>
      </SiteShell>
    );
  }

  const isLive = isMatchLive(match);
  const isScheduled = isMatchUpcoming(match);
  const homeBadge = getBadgeUrl(match.teams?.home?.badge);
  const awayBadge = getBadgeUrl(match.teams?.away?.badge);
  const { homeName, awayName } = getDisplayNames(match);
  const score = typeof match.score?.home === 'number' && typeof match.score?.away === 'number'
    ? `${match.score.home}–${match.score.away}`
    : null;
  const streamSources = match.sources || [];
  const streams = await fetchMatchStreams(match);

  return (
    <SiteShell>
      <div className="mx-auto w-full max-w-5xl">
        <Link href="/" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white">
          <ArrowLeft size={16} strokeWidth={1.8} aria-hidden="true" /> Back to matches
        </Link>

        <article className="overflow-hidden rounded-xl border border-white/8 bg-[#071018]/95 shadow-[0_18px_48px_rgba(0,0,0,0.28)] sm:rounded-2xl">
          <header className="border-b border-white/8 px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <p title={match.category || 'Football'} className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.13em] text-slate-400 sm:text-sm">{match.category || 'Football'}</p>
              <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] ${
                isLive ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-white/10 bg-white/[0.03] text-slate-300'
              }`}>
                {isLive ? <Radio size={13} strokeWidth={2} aria-hidden="true" /> : null}
                {getMatchStatusLabel(match)}
              </span>
            </div>
          </header>

          <div className="px-4 py-5 sm:px-6 sm:py-7">
            <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-6">
              <TeamIdentity name={homeName} badge={homeBadge} />
              <div className="flex shrink-0 flex-col items-center gap-1.5 px-1 sm:gap-2">
                <span className={`whitespace-nowrap text-lg font-bold tabular-nums sm:text-2xl ${isLive ? 'text-white' : 'text-slate-400'}`}>{score || 'VS'}</span>
                {score ? <Goal size={20} strokeWidth={1.6} className="text-emerald-300" aria-hidden="true" /> : <span className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Kick-off</span>}
              </div>
              <TeamIdentity name={awayName} badge={awayBadge} />
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-3 sm:gap-3">
              <div className="min-w-0 rounded-lg border border-white/8 bg-white/[0.025] p-3.5 sm:p-4">
                <p className="flex items-center gap-2 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-400"><CalendarDays size={14} aria-hidden="true" /> Date & time</p>
                <p className="mt-2 break-words text-sm font-medium leading-5 text-white">{formatMatchDate(match.kickoffTime)}</p>
              </div>
              <div className="min-w-0 rounded-lg border border-white/8 bg-white/[0.025] p-3.5 sm:p-4">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-400">Competition</p>
                <p title={match.category || 'Football'} className="mt-2 break-words text-sm font-medium leading-5 text-white">{match.category || 'Football'}</p>
              </div>
              <div className="min-w-0 rounded-lg border border-white/8 bg-white/[0.025] p-3.5 sm:p-4">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-400">Match status</p>
                <p className="mt-2 break-words text-sm font-medium leading-5 text-white">{getMatchStatusLabel(match)}</p>
              </div>
            </div>

            <section className="mt-6 border-t border-white/8 pt-5 sm:mt-7 sm:pt-6">
              <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-white sm:text-base">Watch match</h3>
                {isLive ? <span className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-red-300">Live stream</span> : null}
              </div>

              {streamSources.length === 0 || streams.length === 0 ? (
                <div className="rounded-lg border border-white/8 bg-white/[0.025] p-4 text-center">
                  <p className="flex items-center justify-center gap-2 text-sm font-semibold text-white"><CircleAlert size={16} aria-hidden="true" />Stream unavailable</p>
                  <p className="mt-2 text-sm text-slate-400">This stream source is currently unavailable. Try another available source.</p>
                </div>
              ) : (
                <>
                  {isScheduled && !isLive ? (
                    <div className="mb-4 rounded-lg border border-amber-400/20 bg-amber-400/[0.08] p-3.5 text-sm text-amber-100 sm:p-4">
                      <p className="font-semibold">The stream hasn’t started yet.</p>
                      <p className="mt-1 text-amber-200/80">Come back closer to kick-off for the live stream to begin.</p>
                    </div>
                  ) : null}
                  <StreamSelector key={id} streams={streams} title={`${homeName} vs ${awayName}`} matchId={id} isLive={isLive} />
                </>
              )}
            </section>
          </div>
        </article>
      </div>
    </SiteShell>
  );
}
