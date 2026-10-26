'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Award, Bookmark, Bell, CalendarDays, House, Moon, PlayCircle, Radio, Settings, Sun, Trophy } from 'lucide-react';
import MobileBottomNav from './MobileBottomNav';
import FixtureSearch from './FixtureSearch';
import type { StreamedMatch } from '@/lib/streamed';

const navItems = [
  { label: 'Home', href: '/', icon: House },
  { label: 'Live', href: '/live', icon: Radio },
  { label: 'Ballon d’Or 2026', href: '/ballon-dor-2026', icon: Award },
  { label: 'Upcoming', href: '/upcoming', icon: CalendarDays },
  { label: 'Leagues', href: '/leagues', icon: Trophy },
  { label: 'My Watchlist', href: '/watchlist', icon: Bookmark },
  { label: 'Highlights', href: '/highlights', icon: PlayCircle },
  { label: 'Settings', href: '/settings', icon: Settings }
];

const EMPTY_MATCHES: StreamedMatch[] = [];

export default function SiteShell({ children, searchMatches = EMPTY_MATCHES }: { children: React.ReactNode; searchMatches?: StreamedMatch[] }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('goal-pulse-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    window.localStorage.setItem('goal-pulse-theme', nextTheme);
  }

  return (
    <main data-theme={theme} className="site-content bg-[#040910] text-white">
      <div className="lg:flex lg:gap-5">
        <aside className="mb-4 hidden w-full lg:sticky lg:top-5 lg:mb-0 lg:block lg:h-[calc(100dvh-40px)] lg:w-60 lg:shrink-0 lg:self-start">
          <div className="flex h-full items-center gap-3 overflow-x-auto rounded-2xl border border-white/8 bg-[#071018]/90 p-2 shadow-[0_16px_42px_rgba(2,6,23,0.35)] backdrop-blur-xl lg:flex-col lg:items-stretch lg:overflow-y-auto lg:overflow-x-hidden lg:rounded-2xl lg:p-4">
            <Link href="/" className="flex shrink-0 items-center gap-3 px-2 py-2">
              <Image src="/icon-192.png?v=b7d32ecd308c" alt="Goal Pulse" width={42} height={42} priority className="h-10 w-10 shrink-0 rounded-xl object-cover" />
              <div><p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-emerald-300/80">Goal Pulse</p><h2 className="mt-1 text-base font-bold tracking-[-0.03em] text-white">Football hub</h2></div>
            </Link>
            <nav aria-label="Main navigation" className="flex shrink-0 items-center gap-1.5 lg:mt-6 lg:block lg:space-y-1">
              {navItems.map((item) => {
                const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                const Icon = item.icon;
                return <Link key={item.label} href={item.href} aria-current={active ? 'page' : undefined} className={`flex shrink-0 items-center justify-between gap-2 rounded-xl px-3 py-3 text-sm font-medium transition-colors lg:min-h-11 lg:py-2.5 ${active ? 'border border-emerald-500/20 bg-[#0b2c22] text-emerald-200' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}><span className="flex items-center gap-2.5 lg:gap-3"><Icon size={18} strokeWidth={1.8} aria-hidden="true" />{item.label}</span>{active ? <span className="ml-2 h-1.5 w-1.5 rounded-full bg-emerald-400" /> : null}</Link>;
              })}
            </nav>
            <div className="hidden rounded-xl border border-white/8 bg-[#0b1520]/80 p-4 lg:mt-auto lg:block">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-slate-400">Preferences</p>
              <Link href="/settings#notifications" className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/15"><Bell size={16} strokeWidth={1.8} aria-hidden="true" />Notification Settings</Link>
            </div>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="relative z-[60] mb-4 flex min-w-0 items-center gap-2 rounded-xl border border-white/8 bg-[#071018]/90 px-3 py-2.5 shadow-[0_10px_26px_rgba(2,6,23,0.28)] backdrop-blur-xl sm:gap-3 sm:px-4 lg:mb-5 lg:rounded-2xl lg:px-5">
            <Link href="/" aria-label="Goal Pulse home" className="shrink-0 lg:hidden">
              <Image src="/icon-192.png?v=b7d32ecd308c" alt="" aria-hidden="true" width={36} height={36} priority className="h-9 w-9 rounded-lg object-cover" />
            </Link>
            <FixtureSearch matches={searchMatches} />
            <button type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-200 transition hover:border-emerald-400/40 hover:text-emerald-300">{theme === 'dark' ? <Sun size={19} strokeWidth={1.8} aria-hidden="true" /> : <Moon size={19} strokeWidth={1.8} aria-hidden="true" />}</button>
          </header>
          {children}
        </div>
      </div>
      <MobileBottomNav />
    </main>
  );
}
