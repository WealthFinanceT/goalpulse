'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, Bookmark, CalendarDays, House, Moon, Play, PlayCircle, Radio, Search, Settings, Sun, Trophy } from 'lucide-react';
import FilteredMatches from '@/components/FilteredMatches';
import type { StreamedMatch } from '@/lib/streamed';

export default function DashboardContent({
  matches,
  errorMessage
}: {
  matches: StreamedMatch[];
  errorMessage: string;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('goal-pulse-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
    }
  }, []);

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    window.localStorage.setItem('goal-pulse-theme', nextTheme);
  }

  const navItems = [
    { label: 'Home', href: '/', active: true, icon: House },
    { label: 'Live', href: '/live', active: false, icon: Radio },
    { label: 'Upcoming', href: '/upcoming', active: false, icon: CalendarDays },
    { label: 'Leagues', href: '/leagues', active: false, icon: Trophy },
    { label: 'My Watchlist', href: '/watchlist', active: false, icon: Bookmark },
    { label: 'Highlights', href: '/highlights', active: false, icon: PlayCircle },
    { label: 'Settings', href: '/settings', active: false, icon: Settings }
  ];

  return (
    <main data-theme={theme} className="min-h-screen bg-[#040910] px-3 py-3 text-white sm:px-4 lg:px-5 xl:px-6">
      <div className="mx-auto max-w-[1600px] lg:flex lg:gap-5">
        <aside className="mb-5 w-full lg:sticky lg:top-4 lg:h-[calc(100vh-32px)] lg:w-[256px] lg:self-start xl:w-[260px]">
          <div className="flex flex-col overflow-y-auto rounded-[28px] border border-white/8 bg-[#071018]/90 p-4 shadow-[0_22px_55px_rgba(2,6,23,0.82)] backdrop-blur-xl lg:h-full">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/30 bg-gradient-to-br from-emerald-400 to-green-600 text-lg font-black text-[#05130d] shadow-[0_10px_25px_rgba(16,185,129,0.45)]">
                G
              </div>
              <div>
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.30em] text-emerald-300/80">Goal Pulse</p>
                <h2 className="mt-1 text-lg font-bold tracking-[-0.04em] text-white">Football hub</h2>
              </div>
            </div>

            <nav className="mt-6 space-y-2">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className={`flex items-center justify-between rounded-2xl px-3 py-3.5 text-[0.97rem] font-medium transition-all ${
                    item.active
                      ? 'border border-emerald-500/30 bg-[#0b2c22] text-emerald-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                      : 'text-slate-300 hover:bg-white/4 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3"><item.icon size={19} strokeWidth={1.8} aria-hidden="true" />{item.label}</span>
                  {item.label === 'Home' ? <span className="h-2 w-2 rounded-full bg-emerald-400" /> : null}
                </a>
              ))}
            </nav>

            <div className="mt-auto space-y-5 pt-7">
            <div className="rounded-[22px] border border-white/8 bg-[#0b1520]/80 p-4">
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-slate-400">Follow us</p>
              <div className="mt-3 flex items-center gap-3">
                {['x', 'ig', 'yt', 't'].map((item) => (
                  <div
                    key={item}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.02] text-[0.68rem] font-semibold text-slate-300"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[22px] border border-white/8 bg-[#0b1520]/80 p-4">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-slate-400">Never miss a match</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">Get notified for live matches and important updates.</p>
              <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20">
                <Bell size={16} strokeWidth={1.8} aria-hidden="true" />
                Enable Notifications
              </button>
            </div>
            </div>
          </div>
        </aside>

        <div id="overview" className="min-w-0 flex-1">
          <header className="mb-5 flex flex-col gap-3 rounded-[26px] border border-white/8 bg-[#071018]/85 px-4 py-3 shadow-[0_12px_30px_rgba(2,6,23,0.45)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between lg:px-5">
            <label className="relative block w-full max-w-[720px]">
              <span className="sr-only">Search</span>
              <Search size={18} strokeWidth={1.8} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                    event.preventDefault();
                    searchInputRef.current?.focus();
                  }
                }}
                aria-label="Search matches"
                className="w-full rounded-full border border-white/10 bg-[#0a1320] py-3 pl-10 pr-20 text-[0.95rem] text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-400/40"
                placeholder="Search for matches, teams or leagues..."
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-300">
                Ctrl K
              </span>
            </label>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg text-slate-200 transition hover:border-emerald-400/40 hover:text-emerald-300"
              >
                {theme === 'dark' ? <Sun size={19} strokeWidth={1.8} aria-hidden="true" /> : <Moon size={19} strokeWidth={1.8} aria-hidden="true" />}
              </button>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/30 bg-[#0d2d24] text-[0.7rem] font-bold text-emerald-200">GP</div>
            </div>
          </header>

          <section data-theme-hero className="relative mb-6 overflow-hidden rounded-[30px] border border-emerald-400/15 bg-[#071018]/95 px-6 py-7 shadow-[0_30px_80px_rgba(2,6,23,0.8)] sm:px-7 lg:px-8 lg:py-8 xl:px-9">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-90"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, rgba(6,11,18,0.92) 0%, rgba(6,11,18,0.76) 30%, rgba(6,11,18,0.2) 60%, rgba(6,11,18,0.8) 100%), url('https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1200&q=80')"
              }}
            />

            <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div className="max-w-[650px]">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-emerald-300">Welcome to Goal Pulse</p>
                <h1 className="mt-4 max-w-[620px] text-4xl font-black leading-[0.95] tracking-[-0.06em] text-white sm:text-5xl xl:text-[4.1rem]">
                  Stream football.
                  <span className="block text-emerald-400">Live.</span>
                  <span className="block text-white">Anytime. Anywhere.</span>
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200/85 sm:text-base">
                  Access the best live streams, upcoming fixtures, and match highlights—all in one clean dashboard.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <a
                    href="#live"
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-[#04150d] shadow-[0_16px_36px_rgba(16,185,129,0.38)] transition hover:bg-emerald-400"
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#04150d] text-emerald-400"><Play size={12} fill="currentColor" strokeWidth={2.5} aria-hidden="true" /></span>
                    Explore Live Matches
                  </a>
                  <a
                    href="#fixtures"
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/10"
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20"><CalendarDays size={13} strokeWidth={1.8} aria-hidden="true" /></span>
                    View Upcoming
                  </a>
                </div>
              </div>

              <div className="relative hidden w-full max-w-[440px] xl:block">
                <div className="relative h-[300px]">
                  <div className="absolute inset-0 rounded-[30px] border border-white/8 bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.24),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.12))]" />
                  <div className="absolute inset-x-8 bottom-0 h-16 rounded-full bg-emerald-500/20 blur-2xl" />
                  <div
                    className="absolute inset-y-0 right-0 w-[90%] rounded-[30px] bg-cover bg-center"
                    style={{
                      backgroundImage:
                        "linear-gradient(90deg, rgba(6,11,18,0.12) 0%, rgba(6,11,18,0.18) 35%, rgba(6,11,18,0.12) 100%), url('https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=900&q=80')"
                    }}
                  />
                  <div className="absolute right-6 top-5 rounded-full border border-emerald-400/30 bg-[#071018]/70 px-3 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-emerald-200">
                    GP
                  </div>
                  <div className="absolute bottom-9 right-7 text-[2.8rem] font-black tracking-[-0.08em] text-emerald-400">10</div>
                </div>
              </div>
            </div>
          </section>

          {errorMessage ? (
            <div className="rounded-[26px] border border-red-500/20 bg-red-500/10 p-6 text-red-100 shadow-[0_18px_55px_rgba(127,29,29,0.18)]">
              <p className="text-base font-semibold">Unable to load matches</p>
              <p className="mt-2 text-sm text-red-100/80">{errorMessage}</p>
            </div>
          ) : (
            <FilteredMatches matches={matches} searchQuery={searchQuery} />
          )}

          <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div id="fixtures" className="scroll-mt-6 rounded-[24px] border border-white/8 bg-[#071018]/90 p-5 shadow-[0_15px_40px_rgba(0,0,0,0.2)]">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Upcoming</p>
              <h3 className="mt-2 text-xl font-black text-white">Upcoming fixtures</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">Browse the next scheduled matches from the fixture list above.</p>
            </div>
            <div id="watchlist" className="scroll-mt-6 rounded-[24px] border border-white/8 bg-[#071018]/90 p-5 shadow-[0_15px_40px_rgba(0,0,0,0.2)]">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-400">My Watchlist</p>
              <h3 className="mt-2 text-xl font-black text-white">Saved matches</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">Save a match from its detail page to build your watchlist.</p>
            </div>
            <div id="highlights" className="scroll-mt-6 rounded-[24px] border border-white/8 bg-[#071018]/90 p-5 shadow-[0_15px_40px_rgba(0,0,0,0.2)]">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Highlights</p>
              <h3 className="mt-2 text-xl font-black text-white">Match highlights</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">Highlights will be available here when supplied by the match source.</p>
            </div>
            <div id="settings" className="scroll-mt-6 rounded-[24px] border border-white/8 bg-[#071018]/90 p-5 shadow-[0_15px_40px_rgba(0,0,0,0.2)]">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Settings</p>
              <h3 className="mt-2 text-xl font-black text-white">Dashboard settings</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">Use the theme control above to switch between light and dark mode.</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}