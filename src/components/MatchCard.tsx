import Link from 'next/link';
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
  // Fallback to parsing title if teams not available
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
  // Match is considered "LIVE" if within 5 minutes before or 90 minutes after start
  return diffMinutes >= -5 && diffMinutes <= 90;
}

export default function MatchCard({ match }: { match: StreamedMatch }) {
  const { home, away } = getTeamNames(match);
  const isLive = isLiveMatch(match.date);
  const homeLogo = getBadgeUrl(match.teams?.home.badge);
  const awayLogo = getBadgeUrl(match.teams?.away.badge);

  return (
    <Link href={`/match/${match.id}`}>
      <article className="group rounded-3xl border border-border bg-card p-6 shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition-all hover:shadow-[0_15px_40px_rgba(0,0,0,0.35)] cursor-pointer">
        {/* Header with Category and Status Badge */}
      <div className="mb-5 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">
          {match.category || 'Football'}
        </span>
        {isLive && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300 border border-red-500/30">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
            LIVE
          </span>
        )}
      </div>

      {/* Team Matchup with Logos */}
      <div className="mb-6 flex items-center justify-between gap-3">
        {/* Home Team */}
        <div className="flex flex-1 flex-col items-center gap-2 min-w-0">
          {homeLogo ? (
            <img 
              src={homeLogo} 
              alt={home}
              className="h-12 w-12 object-contain rounded shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const div = document.createElement('div');
                  div.className = 'h-12 w-12 rounded bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-xs font-bold text-white';
                  div.textContent = getInitials(home);
                  parent.appendChild(div);
                }
              }}
            />
          ) : (
            <div className="h-12 w-12 rounded bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-xs font-bold text-white">
              {getInitials(home)}
            </div>
          )}
          <span className="text-xs font-semibold text-white text-center line-clamp-2 w-full break-words">{home}</span>
        </div>

        {/* VS Separator */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <span className="text-xs font-bold text-muted uppercase">vs</span>
          <span className="text-2xl">⚽</span>
        </div>

        {/* Away Team */}
        <div className="flex flex-1 flex-col items-center gap-2 min-w-0">
          {awayLogo ? (
            <img 
              src={awayLogo} 
              alt={away}
              className="h-12 w-12 object-contain rounded shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const div = document.createElement('div');
                  div.className = 'h-12 w-12 rounded bg-gradient-to-br from-orange-600 to-orange-800 flex items-center justify-center text-xs font-bold text-white';
                  div.textContent = getInitials(away);
                  parent.appendChild(div);
                }
              }}
            />
          ) : (
            <div className="h-12 w-12 rounded bg-gradient-to-br from-orange-600 to-orange-800 flex items-center justify-center text-xs font-bold text-white">
              {getInitials(away)}
            </div>
          )}
          <span className="text-xs font-semibold text-white text-center line-clamp-2 w-full break-words">{away}</span>
        </div>
      </div>

      {/* Match Time */}
      <div className="rounded-lg bg-white/5 p-3 text-center border border-white/10">
        <p className="text-sm font-medium text-muted">{formatDate(match.date)}</p>
      </div>
      </article>
    </Link>
  );
}
