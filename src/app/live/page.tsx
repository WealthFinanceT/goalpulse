import type { StreamedMatch } from '@/lib/streamed';
import { fetchFootballMatches } from '@/lib/streamed';
import SectionPage from '@/components/SectionPage';

export const dynamic = 'force-dynamic';
export default async function LivePage() { let matches: StreamedMatch[] = []; let errorMessage = ''; try { matches = await fetchFootballMatches(); } catch (error) { errorMessage = error instanceof Error ? error.message : 'Unable to load matches.'; } return <SectionPage kind="live" matches={matches} errorMessage={errorMessage} />; }
