import type { StreamedMatch } from '@/lib/streamed';
import { fetchFootballMatches } from '@/lib/streamed';
import DashboardContent from '@/components/DashboardContent';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let matches: StreamedMatch[] = [];
  let errorMessage = '';

  try {
    matches = await fetchFootballMatches();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Unable to load matches.';
  }

  return <DashboardContent matches={matches} errorMessage={errorMessage} />;
}
