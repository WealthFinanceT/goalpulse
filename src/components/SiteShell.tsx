'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bookmark, Bell, CalendarDays, House, Moon, PlayCircle, Radio, Search, Settings, Sun, Trophy } from 'lucide-react';

const navItems = [
  { label: 'Home', href: '/', icon: House },
  { label: 'Live', href: '/live', icon: Radio },
  { label: 'Upcoming', href: '/upcoming', icon: CalendarDays },
  { label: 'Leagues', href: '/leagues', icon: Trophy },
  { label: 'My Watchlist', href: '/watchlist', icon: Bookmark },
  { label: 'Highlights', href: '/highlights', icon: PlayCircle },
  { label: 'Settings', href: '/settings', icon: Settings }
];

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [notificationMessage, setNotificationMessage] = useState('');
  const searchRef = useRef<HTMLInputElement | null>(null);

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

  async function enableNotifications() {
    if (!('Notification' in window)) {
      setNotificationMessage('Notifications are not supported in this browser.');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationMessage(permission === 'granted' ? 'Notifications enabled.' : 'Notifications remain disabled.');
  }

  return (
    <main data-theme={theme} className="site-content min-h-screen bg-[#040910] px-3 py-3 text-white sm:px-4 lg:px-5 xl:px-6">
      <div className="mx-auto max-w-[1600px] lg:flex lg:gap-5">
        <aside className="mb-5 w-full lg:sticky lg:top-4 lg:h-[calc(100vh-32px)] lg:w-[256px] lg:self-start xl:w-[260px]">
          <div className="flex flex-col overflow-y-auto rounded-[28px] border border-white/8 bg-[#071018]/90 p-4 shadow-[0_22px_55px_rgba(2,6,23,0.82)] backdrop-blur-xl lg:h-full">
            <Link href="/" className="flex items-center gap-3 px-2 py-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/30 bg-gradient-to-br from-emerald-400 to-green-600 text-lg font-black text-[#05130d] shadow-[0_10px_25px_rgba(16,185,129,0.45)]">G</div>
              <div><p className="text-[0.58rem] font-semibold uppercase tracking-[0.30em] text-emerald-300/80">Goal Pulse</p><h2 className="mt-1 text-lg font-bold tracking-[-0.04em] text-white">Football hub</h2></div>
            </Link>
            <nav className="mt-6 space-y-2">
              {navItems.map((item) => {
                const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                const Icon = item.icon;
                return <Link key={item.label} href={item.href} className={`flex items-center justify-between rounded-2xl px-3 py-3.5 text-[0.97rem] font-medium transition-all ${active ? 'border border-emerald-500/30 bg-[#0b2c22] text-emerald-200' : 'text-slate-300 hover:bg-white/4 hover:text-white'}`}><span className="flex items-center gap-3"><Icon size={19} strokeWidth={1.8} aria-hidden="true" />{item.label}</span>{active ? <span className="h-2 w-2 rounded-full bg-emerald-400" /> : null}</Link>;
              })}
            </nav>
            <div className="mt-5 rounded-[22px] border border-white/8 bg-[#0b1520]/80 p-4 lg:mt-auto">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-slate-400">Preferences</p>
              <button type="button" onClick={enableNotifications} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"><Bell size={16} strokeWidth={1.8} aria-hidden="true" />Enable Notifications</button>
              {notificationMessage ? <p className="mt-2 text-xs text-slate-400">{notificationMessage}</p> : null}
            </div>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="mb-5 flex items-center justify-between gap-3 rounded-[26px] border border-white/8 bg-[#071018]/85 px-4 py-3 shadow-[0_12px_30px_rgba(2,6,23,0.45)] backdrop-blur-xl lg:px-5">
            <div className="relative w-full max-w-[620px]"><Search size={18} strokeWidth={1.8} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input ref={searchRef} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchRef.current?.focus(); } }} aria-label="Search matches" className="w-full rounded-full border border-white/10 bg-[#0a1320] py-3 pl-10 pr-20 text-[0.95rem] text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-400/40" placeholder="Search for matches, teams or leagues..." /><span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-300">Ctrl K</span></div>
            <button type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg text-slate-200 transition hover:border-emerald-400/40 hover:text-emerald-300">{theme === 'dark' ? <Sun size={19} strokeWidth={1.8} aria-hidden="true" /> : <Moon size={19} strokeWidth={1.8} aria-hidden="true" />}</button>
          </header>
          {children}
        </div>
      </div>
    </main>
  );
}
