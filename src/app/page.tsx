import { fetchFootballMatchesPage, type FixturePage } from '@/lib/streamed';
import DashboardContent from '@/components/DashboardContent';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let fixturePage: FixturePage = { matches: [], total: 0, offset: 0, limit: 9 };
  let errorMessage = '';

  try {
    fixturePage = await fetchFootballMatchesPage();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Unable to load matches.';
  }

  return <DashboardContent initialMatches={fixturePage.matches} totalMatches={fixturePage.total} errorMessage={errorMessage} />;
}
