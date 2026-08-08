import type { StreamedMatch } from '@/lib/streamed';
import { fetchFootballMatches } from '@/lib/streamed';
import FilteredMatches from '@/components/FilteredMatches';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let matches: StreamedMatch[] = [];
  let errorMessage = '';

  try {
    matches = await fetchFootballMatches();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Unable to load matches.';
  }

  return (
    <main className="min-h-screen bg-surface px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <section className="mb-8 rounded-[32px] border border-white/10 bg-gradient-to-br from-blue-600/25 via-slate-900 to-red-600/20 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-200">Goal Pulse</p>
            <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">
              Stream football matches from one clean dashboard.
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
              Browse live and upcoming fixtures, open the best available streams, and jump straight into the action from any match card.
            </p>
          </div>
        </section>

        {errorMessage ? (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-100">
            <p className="text-base font-semibold">Unable to load matches</p>
            <p className="mt-2 text-sm text-red-100/80">{errorMessage}</p>
          </div>
        ) : (
          <FilteredMatches matches={matches} />
        )}
      </div>
    </main>
  );
}
