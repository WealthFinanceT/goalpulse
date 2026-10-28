import Image from 'next/image';

export default function ReconstructionPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#040910] px-6 py-16 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_55%)]" />
      <section className="relative w-full max-w-xl text-center">
        <Image
          src="/icon-192.png"
          alt="Goal Pulse"
          width={64}
          height={64}
          priority
          className="mx-auto h-16 w-16 rounded-2xl"
        />
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
          Goal Pulse
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Under reconstruction
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-slate-300">
          We&apos;re rebuilding our match-data service. Live scores, fixtures, and the rest of the site
          will be back as soon as we can.
        </p>
        <p className="mt-8 text-sm text-slate-500">Thanks for your patience.</p>
      </section>
    </main>
  );
}
