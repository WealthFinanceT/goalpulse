import type { StreamedMatch } from '@/lib/streamed';

export type NotificationClub = {
  id: string;
  name: string;
  league: string;
  aliases: string[];
};

export const PRIORITY_CLUBS: NotificationClub[] = [
  { id: 'arsenal', name: 'Arsenal', league: 'Premier League', aliases: ['Arsenal FC'] },
  { id: 'chelsea', name: 'Chelsea', league: 'Premier League', aliases: ['Chelsea FC'] },
  { id: 'liverpool', name: 'Liverpool', league: 'Premier League', aliases: ['Liverpool FC'] },
  { id: 'manchester-city', name: 'Manchester City', league: 'Premier League', aliases: ['Man City', 'Man. City', 'Manchester City FC'] },
  { id: 'manchester-united', name: 'Manchester United', league: 'Premier League', aliases: ['Man Utd', 'Man United', 'Manchester United FC'] },
  { id: 'tottenham-hotspur', name: 'Tottenham Hotspur', league: 'Premier League', aliases: ['Tottenham', 'Spurs', 'Tottenham Hotspur FC'] },
  { id: 'real-madrid', name: 'Real Madrid', league: 'La Liga', aliases: ['Real Madrid CF'] },
  { id: 'barcelona', name: 'Barcelona', league: 'La Liga', aliases: ['FC Barcelona', 'Barca'] },
  { id: 'atletico-madrid', name: 'Atletico Madrid', league: 'La Liga', aliases: ['Atlético Madrid', 'Atletico de Madrid', 'Atlético de Madrid'] },
  { id: 'inter', name: 'Inter', league: 'Serie A', aliases: ['Internazionale', 'Inter Milan', 'FC Internazionale'] },
  { id: 'ac-milan', name: 'AC Milan', league: 'Serie A', aliases: ['Milan', 'AC Milan'] },
  { id: 'juventus', name: 'Juventus', league: 'Serie A', aliases: ['Juventus FC', 'Juve'] },
  { id: 'napoli', name: 'Napoli', league: 'Serie A', aliases: ['SSC Napoli'] },
  { id: 'roma', name: 'Roma', league: 'Serie A', aliases: ['AS Roma', 'A.S. Roma'] },
  { id: 'bayern-munich', name: 'Bayern Munich', league: 'Bundesliga', aliases: ['Bayern München', 'FC Bayern Munich', 'FC Bayern München'] },
  { id: 'borussia-dortmund', name: 'Borussia Dortmund', league: 'Bundesliga', aliases: ['Dortmund', 'BVB'] },
  { id: 'bayer-leverkusen', name: 'Bayer Leverkusen', league: 'Bundesliga', aliases: ['Bayer 04 Leverkusen', 'Leverkusen'] },
  { id: 'paris-saint-germain', name: 'Paris Saint-Germain', league: 'Ligue 1', aliases: ['Paris Saint Germain', 'PSG'] },
  { id: 'marseille', name: 'Marseille', league: 'Ligue 1', aliases: ['Olympique de Marseille', 'Olympique Marseille'] },
  { id: 'monaco', name: 'Monaco', league: 'Ligue 1', aliases: ['AS Monaco'] },
  { id: 'lyon', name: 'Lyon', league: 'Ligue 1', aliases: ['Olympique Lyonnais', 'Olympique Lyon'] }
];

export type NotificationCompetition = { id: string; name: string; aliases: string[] };

export const NOTIFICATION_COMPETITIONS: NotificationCompetition[] = [
  { id: 'premier-league', name: 'Premier League', aliases: ['English Premier League', 'Premier League'] },
  { id: 'la-liga', name: 'La Liga', aliases: ['Primera Division', 'Spanish La Liga', 'LaLiga'] },
  { id: 'serie-a', name: 'Serie A', aliases: ['Italian Serie A'] },
  { id: 'bundesliga', name: 'Bundesliga', aliases: ['German Bundesliga'] },
  { id: 'ligue-1', name: 'Ligue 1', aliases: ['French Ligue 1'] },
  { id: 'champions-league', name: 'Champions League', aliases: ['UEFA Champions League'] },
  { id: 'europa-league', name: 'Europa League', aliases: ['UEFA Europa League'] },
  { id: 'conference-league', name: 'Conference League', aliases: ['UEFA Conference League', 'UEFA Europa Conference League'] }
];

export function normalizeFootballIdentity(value: string): string {
  return value.normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

export function matchPriorityClubIds(match: StreamedMatch): string[] {
  const teams = [match.teams?.home, match.teams?.away].filter((team): team is NonNullable<typeof team> => Boolean(team));
  return PRIORITY_CLUBS.filter((club) => teams.some((team) => {
    if (team.id && team.id === club.id) return true;
    const teamName = normalizeFootballIdentity(team.name);
    return [club.name, ...club.aliases].some((alias) => normalizeFootballIdentity(alias) === teamName);
  })).map((club) => club.id);
}

export function matchSelectedCompetitionIds(match: StreamedMatch): string[] {
  const competition = match.competition;
  if (!competition) return [];
  const id = competition.id.toLowerCase();
  const name = normalizeFootballIdentity(competition.name);
  return NOTIFICATION_COMPETITIONS.filter((item) =>
    id === item.id ||
    [item.name, ...item.aliases].some((alias) => normalizeFootballIdentity(alias) === name)
  ).map((item) => item.id);
}
