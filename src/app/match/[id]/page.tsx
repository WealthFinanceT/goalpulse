import Link from 'next/link';
import { ArrowLeft, CalendarDays, CircleAlert, Goal, Radio } from 'lucide-react';
import { fetchMatchById, fetchMatchStreams, formatMatchDate, getMatchStatusLabel, isMatchLive, isMatchUpcoming } from '@/lib/streamed';
import StreamSelector from '@/components/StreamSelector';

function getBadgeUrl(badge?: string): string | null {
  if (badge && badge.trim()) {
    return badge.startsWith('http') ? badge : `https://streamed.pk/api/images/badge/${badge}.webp`;
  }
  return null;
}

function getDisplayNames(match: NonNullable<Awaited<ReturnType<typeof fetchMatchById>>>) {
  const fallbackTitle = match?.title || 'Football Match';
  const parts = fallbackTitle.split(/\s+vs\.?\s+/i);
  const homeName = match?.teams?.home?.name || parts[0]?.trim() || 'Home Team';
  const awayName = match?.teams?.away?.name || parts[1]?.trim() || 'Away Team';

  return { homeName, awayName };
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default async function MatchDetailPage({ params }: { params: { id: string } }) {
  const match = await fetchMatchById(params.id);

  if (!match) {
    return (
      <main className="stream-page min-h-screen bg-[#0b1118] px-4 py-8 text-white opacity-100 filter-none pointer-events-auto sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-5xl">
          <Link 
            href="/" 
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-white transition"
          >
            <ArrowLeft size={16} strokeWidth={1.8} aria-hidden="true" /> Back to Matches
          </Link>
          
          <div className="rounded-3xl border border-[#2b3945] bg-[#121b24] p-8 text-center">
            <p className="text-lg font-semibold text-white">Match not found</p>
            <p className="mt-2 text-sm text-muted">The match you're looking for doesn't exist or has been removed.</p>
          </div>
        </div>
      </main>
    );
  }

  const isLive = isMatchLive(match);
  const isScheduled = isMatchUpcoming(match);
  const homeLogo = getBadgeUrl(match.teams?.home?.badge) ?? undefined;
  const awayLogo = getBadgeUrl(match.teams?.away?.badge) ?? undefined;
  const { homeName, awayName } = getDisplayNames(match);
  const streamSources = match.sources || [];
  const streams = await fetchMatchStreams(match);
  return (
    <main className="stream-page min-h-screen bg-[#0b1118] px-4 py-8 text-white opacity-100 filter-none pointer-events-auto sm:px-6 lg:px-10">
      <div className="mx-auto max-w-2xl">
        {/* Back Button */}
        <Link 
          href="/" 
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-white transition"
        >
          <ArrowLeft size={16} strokeWidth={1.8} aria-hidden="true" /> Back to Matches
        </Link>

        {/* Main Card */}
        <article className="flex flex-col rounded-3xl border border-[#2b3945] bg-[#121b24] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.36)] sm:p-6 lg:p-8">
          {/* Header with League and Status */}
          <div className="order-2 mb-6 flex items-center justify-between lg:order-none lg:mb-8">
            <span className="text-sm font-medium uppercase tracking-wider text-muted">
              {match.category || 'Football'}
            </span>
            {isLive && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300 border border-red-500/30">
                <Radio size={13} strokeWidth={2} aria-hidden="true" />
                LIVE
              </span>
            )}
          </div>

          {/* Team Matchup */}
          <div className="order-3 mb-6 flex items-center justify-between gap-2 sm:gap-6 lg:order-none lg:mb-8">
            {/* Home Team */}
            <div className="flex flex-1 flex-col items-center gap-4">
              <img 
                src={homeLogo} 
                alt={homeName}
                className="h-16 w-16 rounded object-contain sm:h-24 sm:w-24"
              />
              <h2 className="max-w-[9rem] break-words text-center text-base font-bold text-white sm:text-xl">{homeName}</h2>
            </div>

            {/* VS Separator */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <span className="text-sm font-bold text-muted uppercase">vs</span>
              <Goal size={36} strokeWidth={1.5} className="text-emerald-300" aria-hidden="true" />
            </div>

            {/* Away Team */}
            <div className="flex flex-1 flex-col items-center gap-4">
              <img 
                src={awayLogo} 
                alt={awayName}
                className="h-24 w-24 object-contain rounded"
              />
              <h2 className="max-w-[9rem] break-words text-center text-base font-bold text-white sm:text-xl">{awayName}</h2>
            </div>
          </div>

          {/* Match Details */}
          <div className="order-4 space-y-4 border-t border-white/10 pt-6 lg:order-none">
            <div className="rounded-lg bg-white/5 p-4 border border-white/10">
              <p className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted"><CalendarDays size={14} strokeWidth={1.8} aria-hidden="true" />Match Date & Time</p>
                <p className="text-base font-semibold text-white">{formatMatchDate(match.kickoffTime)}</p>
            </div>

            <div className="rounded-lg bg-white/5 p-4 border border-white/10">
              <p className="text-xs font-medium uppercase tracking-wider text-muted mb-1">League</p>
              <p className="text-base font-semibold text-white">{match.category || 'Football'}</p>
            </div>

            <div className="rounded-lg bg-white/5 p-4 border border-white/10">
              <p className="text-xs font-medium uppercase tracking-wider text-muted mb-1">Status</p>
              <p className="text-base font-semibold text-white">
                {isLive ? (
                  <span className="inline-flex items-center gap-2">
                    <Radio size={14} strokeWidth={2} aria-hidden="true" />
                    {getMatchStatusLabel(match)}
                  </span>
                ) : (
                  getMatchStatusLabel(match)
                )}
              </p>
            </div>
          </div>

          {/* Stream Player Section */}
          <div className="order-first mt-0 border-t border-white/10 pt-0 lg:order-none lg:mt-6 lg:pt-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Watch Match</h3>
              {isLive && (
                <span className="text-xs font-semibold uppercase tracking-wider text-red-300">Live stream</span>
              )}
            </div>

            {streamSources.length === 0 || streams.length === 0 ? (
              <div className="rounded-lg bg-white/5 p-4 border border-white/10 text-center">
                <p className="flex items-center justify-center gap-2 text-sm font-semibold text-white"><CircleAlert size={16} aria-hidden="true" />Stream unavailable</p>
                <p className="mt-2 text-sm text-muted">This stream source is currently unavailable. Try another available source.</p>
              </div>
            ) : (
              <>
                {isScheduled && !isLive && (
                  <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                    <p className="font-semibold">The stream hasn’t started yet.</p>
                    <p className="mt-1 text-amber-200">Come back closer to kick-off for the live stream to begin.</p>
                  </div>
                )}
                <StreamSelector streams={streams} title={`${homeName} vs ${awayName}`} />
              </>
            )}
          </div>
        </article>
      </div>
    </main>
  );
}
