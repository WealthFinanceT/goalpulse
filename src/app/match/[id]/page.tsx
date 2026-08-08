import Link from 'next/link';
import { fetchMatchById, fetchMatchStreams } from '@/lib/streamed';

function formatDate(timestamp?: number) {
  if (!timestamp) return 'TBA';
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function getBadgeUrl(badge?: string): string | null {
  if (badge && badge.trim()) {
    return `https://streamed.pk/api/images/badge/${badge}.webp`;
  }
  return null;
}

function getDisplayNames(match: Awaited<ReturnType<typeof fetchMatchById>> extends infer T ? T extends null ? never : T : never) {
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

function isLiveMatch(timestamp?: number): boolean {
  if (!timestamp) return false;
  const matchDate = new Date(timestamp);
  const now = new Date();
  const diffMinutes = (matchDate.getTime() - now.getTime()) / (1000 * 60);
  return diffMinutes >= -5 && diffMinutes <= 90;
}

function isScheduledMatch(timestamp?: number): boolean {
  if (!timestamp) return false;
  return new Date(timestamp).getTime() > Date.now();
}

export default async function MatchDetailPage({ params }: { params: { id: string } }) {
  const match = await fetchMatchById(params.id);

  if (!match) {
    return (
      <main className="min-h-screen bg-surface px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-2xl">
          <Link 
            href="/" 
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-white transition"
          >
            ← Back to Matches
          </Link>
          
          <div className="rounded-3xl border border-border bg-card p-8 text-center">
            <p className="text-lg font-semibold text-white">Match not found</p>
            <p className="mt-2 text-sm text-muted">The match you're looking for doesn't exist or has been removed.</p>
          </div>
        </div>
      </main>
    );
  }

  const isLive = isLiveMatch(match.date);
  const isScheduled = isScheduledMatch(match.date);
  const homeLogo = getBadgeUrl(match.teams?.home.badge) ?? undefined;
  const awayLogo = getBadgeUrl(match.teams?.away.badge) ?? undefined;
  const { homeName, awayName } = getDisplayNames(match);
  const streamSources = match.sources || [];
  const streams = await fetchMatchStreams(match);
  const primaryStream = streams[0];
  const primaryStreamUrl = primaryStream?.embedUrl || null;

  return (
    <main className="min-h-screen bg-surface px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-2xl">
        {/* Back Button */}
        <Link 
          href="/" 
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-white transition"
        >
          ← Back to Matches
        </Link>

        {/* Main Card */}
        <article className="rounded-3xl border border-border bg-card p-8 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          {/* Header with League and Status */}
          <div className="mb-8 flex items-center justify-between">
            <span className="text-sm font-medium uppercase tracking-wider text-muted">
              {match.category || 'Football'}
            </span>
            {isLive && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300 border border-red-500/30">
                <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                LIVE
              </span>
            )}
          </div>

          {/* Team Matchup */}
          <div className="mb-8 flex items-center justify-between gap-6">
            {/* Home Team */}
            <div className="flex flex-1 flex-col items-center gap-4">
              <img 
                src={homeLogo} 
                alt={homeName}
                className="h-24 w-24 object-contain rounded"
              />
              <h2 className="text-xl font-bold text-white text-center">{homeName}</h2>
            </div>

            {/* VS Separator */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <span className="text-sm font-bold text-muted uppercase">vs</span>
              <span className="text-4xl">⚽</span>
            </div>

            {/* Away Team */}
            <div className="flex flex-1 flex-col items-center gap-4">
              <img 
                src={awayLogo} 
                alt={awayName}
                className="h-24 w-24 object-contain rounded"
              />
              <h2 className="text-xl font-bold text-white text-center">{awayName}</h2>
            </div>
          </div>

          {/* Match Details */}
          <div className="space-y-4 border-t border-white/10 pt-6">
            <div className="rounded-lg bg-white/5 p-4 border border-white/10">
              <p className="text-xs font-medium uppercase tracking-wider text-muted mb-1">Match Date & Time</p>
              <p className="text-base font-semibold text-white">{formatDate(match.date)}</p>
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
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500"></span>
                    Live
                  </span>
                ) : (
                  'Scheduled'
                )}
              </p>
            </div>
          </div>

          {/* Stream Player Section */}
          <div className="border-t border-white/10 pt-6 mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Watch Match</h3>
              {isLive && (
                <span className="text-xs font-semibold uppercase tracking-wider text-red-300">Live stream</span>
              )}
            </div>

            {streamSources.length === 0 || streams.length === 0 ? (
              <div className="rounded-lg bg-white/5 p-4 border border-white/10 text-center">
                <p className="text-sm text-muted">No streams available at this time.</p>
              </div>
            ) : (
              <>
                {isScheduled && !isLive && (
                  <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                    <p className="font-semibold">The stream hasn’t started yet.</p>
                    <p className="mt-1 text-amber-200">Come back closer to kick-off for the live stream to begin.</p>
                  </div>
                )}
                {primaryStreamUrl ? (
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                    <iframe
                      src={primaryStreamUrl}
                      title={`${homeName} vs ${awayName}`}
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      className="h-[320px] w-full sm:h-[420px]"
                    />
                  </div>
                ) : (
                  <div className="rounded-lg bg-white/5 p-4 border border-white/10 text-center">
                    <p className="text-sm text-muted">The stream player is unavailable right now. Please try another source.</p>
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  {streams.map((stream, idx) => (
                    <div
                      key={`${stream.source}-${stream.id}-${idx}`}
                      className="rounded-lg bg-white/5 p-4 border border-white/10 flex items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white capitalize">
                          {stream.source}
                        </p>
                        <p className="text-xs text-muted mt-1">
                          {stream.language} {stream.hd ? '· HD' : ''}
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <a
                          href={stream.embedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
                        >
                          Open stream
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </article>
      </div>
    </main>
  );
}
