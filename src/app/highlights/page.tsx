import type { StreamedMatch } from '@/lib/streamed';
import { getFixtures } from '@/lib/api-football';
import SectionPage from '@/components/SectionPage';
export const dynamic = 'force-dynamic';
export default async function HighlightsPage() { let matches: StreamedMatch[] = []; let errorMessage = ''; try { matches = await getFixtures(); } catch (error) { errorMessage = error instanceof Error ? error.message : 'Unable to load highlights.'; } return <SectionPage kind="highlights" matches={matches} errorMessage={errorMessage} />; }
