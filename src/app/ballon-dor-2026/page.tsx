import type { Metadata } from 'next';
import { Award, CalendarDays, MapPin, Radio } from 'lucide-react';
import AuthorizedStreamPlayer from '@/components/AuthorizedStreamPlayer';
import SiteShell from '@/components/SiteShell';
import { getBallonDorStreamConfiguration } from '@/lib/streaming/config';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Ballon d’Or 2026 Live Stream | Goal Pulse',
  description: 'Follow the Ballon d’Or 2026 ceremony and watch through a configured authorized stream.',
};

export default function BallonDor2026Page() {
  const streamConfiguration = getBallonDorStreamConfiguration();

  return (
    <SiteShell>
      <div className="mx-auto w-full max-w-5xl">
        <section className="relative mb-5 overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-[#0b2c22] via-[#071018] to-[#071018] px-5 py-7 shadow-[0_18px_48px_rgba(0,0,0,0.28)] sm:px-8 sm:py-9">
          <div aria-hidden="true" className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="relative max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-emerald-200">
              <Radio size={14} aria-hidden="true" />
              2026 ceremony
            </p>
            <h1 className="mt-5 text-[clamp(2.2rem,7vw,4rem)] font-bold leading-[1.02] tracking-[-0.05em] text-white">
              Ballon d’Or 2026
              <span className="mt-2 block text-emerald-300">Live Stream</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-200/85 sm:text-base sm:leading-7">
              Follow football’s biggest individual awards ceremony. Playback is enabled only when an authorized stream source is configured.
            </p>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(16rem,0.8fr)]">
          <section aria-labelledby="broadcast-heading" className="min-w-0">
            <h2 id="broadcast-heading" className="mb-3 text-lg font-semibold text-white sm:text-xl">Watch the ceremony</h2>
            <AuthorizedStreamPlayer
              configuration={streamConfiguration}
              title="Ballon d’Or 2026 ceremony"
              playbackId="ballon-dor-2026"
            />
          </section>

          <aside aria-label="Event details" className="rounded-xl border border-white/8 bg-[#071018]/95 p-4 sm:rounded-2xl sm:p-5">
            <h2 className="text-base font-semibold text-white">Event details</h2>
            <dl className="mt-4 space-y-4">
              <div className="flex items-start gap-3">
                <CalendarDays size={17} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />
                <div>
                  <dt className="text-xs font-medium text-slate-400">Date</dt>
                  <dd className="mt-1 text-sm font-medium text-white">Monday, 26 October 2026</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={17} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />
                <div>
                  <dt className="text-xs font-medium text-slate-400">Venue</dt>
                  <dd className="mt-1 text-sm font-medium text-white">The London Palladium, London</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Award size={17} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />
                <div>
                  <dt className="text-xs font-medium text-slate-400">Official broadcast</dt>
                  <dd className="mt-1 text-sm font-medium text-white">Configure an authorized source</dd>
                </div>
              </div>
            </dl>
            <p className="mt-5 border-t border-white/8 pt-4 text-xs leading-5 text-slate-400">
              Configure an authorized source on the server. Availability may depend on the broadcaster, region, and event schedule.
            </p>
          </aside>
        </div>
      </div>
    </SiteShell>
  );
}
