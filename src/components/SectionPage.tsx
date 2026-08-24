'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, CircleAlert } from 'lucide-react';
import MatchCard from './MatchCard';
import SiteShell from './SiteShell';
import WatchlistToggle from './WatchlistToggle';
import type { StreamedMatch } from '@/lib/streamed';

type SectionKind = 'live' | 'upcoming' | 'leagues' | 'teams' | 'channels' | 'watchlist' | 'highlights' | 'settings';

function isLive(date?: number) { if (!date) return false; const minutes = (new Date(date).getTime() - Date.now()) / 60000; return minutes >= -5 && minutes <= 90; }
function isUpcoming(date?: number) { return Boolean(date && new Date(date).getTime() > Date.now() && !isLive(date)); }
function teamNames(match: StreamedMatch) { return [match.teams?.home?.name, match.teams?.away?.name].filter(Boolean) as string[]; }
function dateLabel(date?: number) { return date ? new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(date)) : 'Date to be announced'; }

function EmptyState({ title, message }: { title: string; message: string }) { return <div className="rounded-[28px] border border-white/8 bg-[#071018]/90 p-10 text-center shadow-[0_18px_50px_rgba(0,0,0,0.25)]"><CircleAlert size={24} className="mx-auto mb-3 text-emerald-300" strokeWidth={1.8} aria-hidden="true" /><p className="text-xl font-bold text-white">{title}</p><p className="mt-2 text-sm text-slate-400">{message}</p></div>; }

export default function SectionPage({ kind, matches, errorMessage }: { kind: SectionKind; matches: StreamedMatch[]; errorMessage?: string }) {
  const [query, setQuery] = useState('');
  const [selectedLeague, setSelectedLeague] = useState('');
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [reminders, setReminders] = useState<string[]>([]);
  const searchParams = useSearchParams();
  const selectedTeam = searchParams.get('team') || '';

  useEffect(() => { setWatchlist(JSON.parse(window.localStorage.getItem('goal-pulse-watchlist') || '[]')); setReminders(JSON.parse(window.localStorage.getItem('goal-pulse-reminders') || '[]')); }, []);
  function toggleReminder(id: string) { const next = reminders.includes(id) ? reminders.filter((item) => item !== id) : [...reminders, id]; setReminders(next); window.localStorage.setItem('goal-pulse-reminders', JSON.stringify(next)); }
  function removeSaved(id: string) { const next = watchlist.filter((item) => item !== id); setWatchlist(next); window.localStorage.setItem('goal-pulse-watchlist', JSON.stringify(next)); }

  const filtered = useMemo(() => {
    const lower = query.trim().toLowerCase();
    return matches.filter((match) => {
      const searchable = [match.title, match.category, ...teamNames(match)].filter(Boolean).join(' ').toLowerCase();
      const matchesQuery = !lower || searchable.includes(lower);
      const matchesLeague = !selectedLeague || (match.category || 'Football') === selectedLeague;
      const matchesTeam = !selectedTeam || teamNames(match).includes(selectedTeam);
      const matchesKind = kind === 'live' ? isLive(match.date) : kind === 'upcoming' ? isUpcoming(match.date) : kind === 'watchlist' ? watchlist.includes(match.id) : true;
      return matchesQuery && matchesLeague && matchesTeam && matchesKind;
    });
  }, [kind, matches, query, selectedLeague, selectedTeam, watchlist]);

  const title = { live: 'Live matches', upcoming: 'Upcoming fixtures', leagues: 'Football leagues', teams: 'Teams', channels: 'TV channels', watchlist: 'My watchlist', highlights: 'Highlights', settings: 'Settings' }[kind];
  const categories = [...new Set(matches.map((match) => match.category || 'Football'))].sort();
  const teams = [...new Set(matches.flatMap(teamNames))].sort();
  const channels = matches.flatMap((match) => (match.sources || []).map((source) => ({ ...source, match })));

  return <SiteShell><section className="mb-5 rounded-[28px] border border-emerald-400/15 bg-[#071018]/95 p-6 shadow-[0_22px_60px_rgba(2,6,23,0.5)]"><p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-emerald-300">Goal Pulse</p><h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-white sm:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{kind === 'live' ? 'Watch matches that are live right now.' : kind === 'upcoming' ? 'Plan your next match day and set reminders.' : kind === 'leagues' ? 'Explore competitions represented in the current fixture feed.' : kind === 'teams' ? 'Find teams and open their available fixtures.' : kind === 'channels' ? 'Open available match sources from the live data feed.' : kind === 'watchlist' ? 'Your saved matches stay available on this device.' : kind === 'highlights' ? 'Highlights appear here when the source provides them.' : 'Manage your Goal Pulse preferences.'}</p></section>
    {errorMessage ? <EmptyState title="Unable to load this page" message={errorMessage} /> : kind === 'settings' ? <SettingsContent watchlist={watchlist} onClear={() => { setWatchlist([]); window.localStorage.removeItem('goal-pulse-watchlist'); }} /> : kind === 'highlights' ? <EmptyState title="No highlights available" message="The current football feed does not provide highlight videos yet." /> : kind === 'leagues' ? <><div className="mb-5 flex flex-wrap gap-3">{categories.map((category) => <button type="button" key={category} onClick={() => setSelectedLeague(selectedLeague === category ? '' : category)} className={`rounded-full border px-4 py-2 text-sm font-semibold ${selectedLeague === category ? 'border-emerald-400 bg-emerald-500 text-[#03160d]' : 'border-white/10 bg-white/5 text-slate-300'}`}>{category}</button>)}</div><MatchGrid matches={filtered} empty="No matches found for this league." /></> : kind === 'teams' ? <><input value={query} onChange={(event) => setQuery(event.target.value)} className="mb-5 w-full rounded-2xl border border-white/10 bg-[#0a1320] px-4 py-3 text-slate-100 outline-none placeholder:text-slate-500" placeholder="Search teams..." aria-label="Search teams" /><div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{teams.filter((team) => team.toLowerCase().includes(query.toLowerCase())).map((team) => <Link key={team} href={`/teams?team=${encodeURIComponent(team)}`} className={`rounded-2xl border p-4 text-lg font-bold text-white transition hover:border-emerald-400/40 ${selectedTeam === team ? 'border-emerald-400 bg-emerald-500/10' : 'border-white/8 bg-[#071018]/90'}`}>{team}<span className="mt-1 block text-xs font-normal text-slate-400">View fixtures</span></Link>)}</div>{selectedTeam ? <MatchGrid matches={filtered} empty={`No fixtures found for ${selectedTeam}.`} /> : null}</> : kind === 'channels' ? <ChannelList channels={channels} /> : <MatchGrid matches={filtered} empty={kind === 'live' ? 'No live matches right now.' : kind === 'watchlist' ? 'Your watchlist is empty.' : 'No upcoming fixtures found.'} onReminder={kind === 'upcoming' ? toggleReminder : undefined} reminders={reminders} onRemove={kind === 'watchlist' ? removeSaved : undefined} />}
  </SiteShell>;
}

function MatchGrid({ matches, empty, onReminder, reminders, onRemove }: { matches: StreamedMatch[]; empty: string; onReminder?: (id: string) => void; reminders?: string[]; onRemove?: (id: string) => void }) {
  if (!matches.length) return <EmptyState title={empty} message="Try another filter or check back when the fixture feed refreshes." />;
  const groups = onReminder ? matches.reduce<Record<string, StreamedMatch[]>>((acc, match) => { const key = dateLabel(match.date); (acc[key] ||= []).push(match); return acc; }, {}) : { Matches: matches };
  return <div className="space-y-7">{Object.entries(groups).map(([date, group]) => <section key={date}><h2 className="mb-3 text-lg font-bold text-white">{onReminder ? date : null}</h2><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{group.map((match) => <div key={match.id}><MatchCard match={match} /><WatchlistToggle matchId={match.id} />{onReminder ? <button type="button" onClick={() => onReminder(match.id)} className="mt-2 w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-200">{reminders?.includes(match.id) ? 'Reminder set' : 'Remind Me'}</button> : null}{onRemove ? <button type="button" onClick={() => onRemove(match.id)} className="mt-2 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200">Remove from watchlist</button> : null}</div>)}</div></section>)}</div>;
}

function ChannelList({ channels }: { channels: Array<{ source: string; id: string; match: StreamedMatch }> }) { if (!channels.length) return <EmptyState title="No channels available" message="The current feed has not supplied any playable channel sources." />; return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{channels.map((channel) => <Link key={`${channel.match.id}-${channel.source}-${channel.id}`} href={`/match/${channel.match.id}`} className="group rounded-2xl border border-white/12 bg-[#0b1720] p-5 shadow-[0_14px_30px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:border-emerald-400/60 hover:bg-[#10232d]"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">{channel.source}</p><h2 className="mt-2 font-bold text-white">{channel.match.title}</h2><p className="mt-2 flex items-center gap-1.5 text-sm text-slate-300">Open match player <ArrowRight size={14} className="text-emerald-300 transition-transform group-hover:translate-x-1" aria-hidden="true" /></p></Link>)}</div>; }

function SettingsContent({ watchlist, onClear }: { watchlist: string[]; onClear: () => void }) { const [permission, setPermission] = useState('Checking...'); useEffect(() => { setPermission('Notification' in window ? Notification.permission : 'Unsupported'); }, []); return <div className="space-y-4"><div className="rounded-[24px] border border-white/8 bg-[#071018]/90 p-5"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Notifications</p><h2 className="mt-2 text-xl font-bold text-white">Permission status: {permission}</h2><p className="mt-2 text-sm text-slate-400">Use Enable Notifications in the sidebar to request browser permission.</p></div><div className="rounded-[24px] border border-white/8 bg-[#071018]/90 p-5"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Watchlist</p><h2 className="mt-2 text-xl font-bold text-white">{watchlist.length} saved matches</h2><button type="button" onClick={onClear} disabled={!watchlist.length} className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 disabled:cursor-not-allowed disabled:opacity-40">Clear watchlist</button></div></div>; }
