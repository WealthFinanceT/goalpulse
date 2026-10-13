'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Bookmark, CalendarDays, House, Menu, PlayCircle, Radio, Settings, Trophy } from 'lucide-react';

const items = [
  { label: 'Home', href: '/', icon: House },
  { label: 'Live', href: '/live', icon: Radio },
  { label: 'Fixtures', href: '/upcoming', icon: CalendarDays },
  { label: 'Saved', href: '/watchlist', icon: Bookmark },
  { label: 'Menu', href: '#menu', icon: Menu }
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuActive = ['/leagues', '/highlights', '/settings'].some((route) => pathname.startsWith(route));
  return (
    <nav aria-label="Mobile navigation" className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#071018]/95 px-2 pt-2 shadow-[0_-12px_35px_rgba(2,6,23,0.5)] backdrop-blur-xl lg:hidden">
      <div className="relative mx-auto flex max-w-xl items-center justify-around gap-1">
        <div id="mobile-more-navigation" className={`absolute inset-x-0 bottom-full mb-2 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-[#11121a] p-2 shadow-[0_14px_36px_rgba(0,0,0,0.45)] ${menuOpen ? '' : 'hidden'}`}>
            {[
              { label: 'Leagues', href: '/leagues', icon: Trophy },
              { label: 'Highlights', href: '/highlights', icon: PlayCircle },
              { label: 'Settings', href: '/settings', icon: Settings }
            ].map(({ label, href, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[0.65rem] font-medium text-slate-300 hover:bg-white/5 hover:text-white">
                <Icon size={17} aria-hidden="true" /><span className="max-w-full truncate">{label}</span>
              </Link>
            ))}
        </div>
        {items.map(({ label, href, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          if (href === '#menu') {
            return <button key={href} type="button" aria-label="More navigation" aria-expanded={menuOpen} aria-controls="mobile-more-navigation" onClick={() => setMenuOpen((open) => !open)} className={`flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1.5 text-[0.62rem] font-semibold transition sm:text-[0.68rem] ${menuActive || menuOpen ? 'text-emerald-300' : 'text-slate-400 hover:text-slate-200'}`}><Icon size={19} strokeWidth={menuOpen ? 2.3 : 1.8} aria-hidden="true" /><span>{menuOpen ? 'Close' : label}</span></button>;
          }
          return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1.5 text-[0.62rem] font-semibold transition sm:text-[0.68rem] ${active ? 'text-emerald-300' : 'text-slate-400 hover:text-slate-200'}`}><Icon size={19} strokeWidth={active ? 2.3 : 1.8} aria-hidden="true" /><span className="max-w-full truncate">{label}</span></Link>;
        })}
      </div>
    </nav>
  );
}
