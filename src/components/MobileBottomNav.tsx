'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, House, Menu, PlayCircle, Radio } from 'lucide-react';

const items = [
  { label: 'Home', href: '/', icon: House },
  { label: 'Live', href: '/live', icon: Radio },
  { label: 'Fixtures', href: '/upcoming', icon: CalendarDays },
  { label: 'Highlights', href: '/highlights', icon: PlayCircle },
  { label: 'Menu', href: '/settings', icon: Menu }
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#071018]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_35px_rgba(2,6,23,0.5)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {items.map(({ label, href, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[0.62rem] font-semibold transition ${active ? 'text-emerald-300' : 'text-slate-400 hover:text-slate-200'}`}><Icon size={20} strokeWidth={active ? 2.3 : 1.8} aria-hidden="true" /><span className="truncate">{label}</span></Link>;
        })}
      </div>
    </nav>
  );
}
