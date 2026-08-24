'use client';

import type { ReactNode } from 'react';
import { Bookmark, CalendarDays, House, PlayCircle, Radio, Settings, Trophy, UsersRound } from 'lucide-react';

const navItems = [
  { label: 'Home', href: '/', active: true, icon: House },
  { label: 'Live', href: '/live', active: false, icon: Radio },
  { label: 'Upcoming', href: '/upcoming', active: false, icon: CalendarDays },
  { label: 'Leagues', href: '/leagues', active: false, icon: Trophy },
  { label: 'My Watchlist', href: '/watchlist', active: false, icon: Bookmark },
  { label: 'Highlights', href: '/highlights', active: false, icon: PlayCircle },
  { label: 'Settings', href: '/settings', active: false, icon: Settings }
];

function SidebarItem({ label, href, active, icon: Icon }: { label: string; href: string; active: boolean; icon: typeof House }) {
  return (
    <a
      href={href}
      className={`flex items-center justify-between rounded-[18px] px-4 py-4 text-[1.05rem] font-medium leading-none transition-colors ${
        active ? 'bg-[#0d2b26] text-white shadow-[inset_0_0_0_1px_rgba(52,211,153,0.22)]' : 'text-white/90'
      }`}
    >
      <span className="flex items-center gap-3"><Icon size={19} strokeWidth={1.8} aria-hidden="true" />{label}</span>
      {active ? <span className="h-2.5 w-2.5 rounded-full bg-[#34d399]" /> : null}
    </a>
  );
}

export default function Sidebar() {
  return (
    <aside className="w-[300px] rounded-[26px] border border-white/10 bg-[#040b10] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="flex items-center gap-4 px-2 py-1">
        <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-gradient-to-br from-[#4ade80] to-[#22c55e] text-[2rem] font-black leading-none text-[#031d14] shadow-[0_0_22px_rgba(49,196,141,0.35)]">
          G
        </div>
        <div className="leading-none">
          <div className="text-[0.7rem] font-bold uppercase tracking-[0.22em] text-[#dce7e7]">Goal Pulse</div>
          <div className="mt-2 text-[1.05rem] font-semibold text-white">Football hub</div>
        </div>
      </div>

      <nav className="mt-6 space-y-2">
        {navItems.map((item) => (
          <SidebarItem key={item.label} label={item.label} href={item.href} active={item.active} icon={item.icon} />
        ))}
      </nav>
    </aside>
  );
}
