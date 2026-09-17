import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarCheck,
  LayoutDashboard,
  Link as LinkIcon,
  Search,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import Wordmark from './components/Wordmark'
import { Dashboard } from './views/Dashboard'
import { QuickLinks } from './views/QuickLinks'
import { Planner } from './views/Planner'
import { useApp } from './lib/state'
import { fmtDue } from './lib/types'

export type Tab = 'dashboard' | 'quicklink' | 'planner'

const NAV: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'quicklink', label: 'QuickLink', icon: LinkIcon },
  { id: 'planner', label: 'Planner', icon: CalendarCheck },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard')

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar tab={tab} onNav={setTab} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onNav={setTab} />
        <main className="min-h-0 flex-1 overflow-y-auto">
          {tab === 'dashboard' && <Dashboard onNav={setTab} />}
          {tab === 'quicklink' && <QuickLinks />}
          {tab === 'planner' && <Planner />}
        </main>
      </div>
    </div>
  )
}

function Sidebar({ tab, onNav }: { tab: Tab; onNav: (t: Tab) => void }) {
  return (
    <aside className="flex w-[232px] flex-none flex-col bg-navy">
      <div className="px-6 pt-8 pb-6">
        <Wordmark white width={148} />
        <div className="disp mt-2 text-[13px] font-normal tracking-[.08em] text-blue-light">
          Workbench
        </div>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onNav(id)}
            className={clsx(
              'flex cursor-pointer items-center gap-3 rounded-[4px] px-3 py-2.5 text-left text-[14px] font-semibold transition-colors duration-120',
              tab === id
                ? 'bg-white/12 text-white'
                : 'text-[#b9c6dc] hover:bg-white/6 hover:text-white',
            )}
          >
            <Icon size={18} strokeWidth={2} />
            {label}
            {tab === id && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold" />
            )}
          </button>
        ))}
      </nav>
      <div className="mt-auto px-6 pb-6 text-[11px] leading-relaxed text-[#8fa5c4]">
        Illustrata internal · v2
      </div>
    </aside>
  )
}

/* ---------- top bar with global search ---------- */

function TopBar({ onNav }: { onNav: (t: Tab) => void }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        boxRef.current?.querySelector('input')?.focus()
      }
      if (e.key === 'Escape') setOpen(false)
    }
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node))
        setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
    }
  }, [])

  return (
    <header className="flex h-16 flex-none items-center justify-between border-b border-hairline bg-white px-6 shadow-brand-xs">
      <div className="eyebrow text-[14px]">
        {new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })}
      </div>
      <div ref={boxRef} className="relative w-[340px]">
        <Search
          size={16}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle"
        />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => q && setOpen(true)}
          placeholder="Search links, tasks, notes…  (⌘K)"
          className="h-[38px] w-full rounded-[3px] border-[1.5px] border-hairline bg-white pr-8 pl-9 text-[14px] transition-colors placeholder:text-subtle focus:border-blue focus:outline-none"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ('')
              setOpen(false)
            }}
            className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer text-subtle hover:text-ink"
          >
            <X size={15} />
          </button>
        )}
        {open && q.trim() && (
          <SearchResults
            q={q}
            onGo={(t) => {
              onNav(t)
              setOpen(false)
              setQ('')
            }}
          />
        )}
      </div>
    </header>
  )
}

function SearchResults({ q, onGo }: { q: string; onGo: (t: Tab) => void }) {
  const { state } = useApp()
  const query = q.trim().toLowerCase()

  const results = useMemo(() => {
    const links = state.links.flatMap((g) =>
      g.items
        .filter(
          (i) =>
            i.label.toLowerCase().includes(query) ||
            i.url.toLowerCase().includes(query),
        )
        .map((i) => ({ ...i, group: g.name })),
    )
    const tasks = state.tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.notes.toLowerCase().includes(query) ||
        t.client.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query),
    )
    const notes = state.notes.filter(
      (n) =>
        n.title.toLowerCase().includes(query) ||
        n.body.toLowerCase().includes(query),
    )
    return { links: links.slice(0, 6), tasks: tasks.slice(0, 6), notes: notes.slice(0, 4) }
  }, [state, query])

  const empty =
    !results.links.length && !results.tasks.length && !results.notes.length

  return (
    <div className="absolute top-[calc(100%+6px)] right-0 left-0 z-50 max-h-[420px] overflow-y-auto rounded-[4px] border border-hairline bg-white py-2 shadow-brand-md">
      {empty && (
        <p className="px-4 py-3 text-[13px] text-subtle">No matches.</p>
      )}
      {results.links.length > 0 && (
        <ResultSection title="Links">
          {results.links.map((l) => (
            <a
              key={l.id}
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-baseline justify-between gap-3 px-4 py-1.5 hover:bg-stripe"
            >
              <span className="truncate text-[14px] font-semibold text-blue">
                {l.label}
              </span>
              <span className="text-[11px] whitespace-nowrap text-subtle">
                {l.group}
              </span>
            </a>
          ))}
        </ResultSection>
      )}
      {results.tasks.length > 0 && (
        <ResultSection title="Tasks">
          {results.tasks.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onGo('planner')}
              className="flex w-full cursor-pointer items-baseline justify-between gap-3 px-4 py-1.5 text-left hover:bg-stripe"
            >
              <span
                className={clsx(
                  'truncate text-[14px]',
                  t.status === 'done' && 'text-subtle line-through',
                )}
              >
                {t.title}
              </span>
              {t.dueDate && (
                <span className="text-[11px] whitespace-nowrap text-muted">
                  {fmtDue(t.dueDate)}
                </span>
              )}
            </button>
          ))}
        </ResultSection>
      )}
      {results.notes.length > 0 && (
        <ResultSection title="Notes">
          {results.notes.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => onGo('planner')}
              className="block w-full cursor-pointer truncate px-4 py-1.5 text-left text-[14px] hover:bg-stripe"
            >
              {n.title || 'Untitled note'}
            </button>
          ))}
        </ResultSection>
      )}
    </div>
  )
}

function ResultSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="py-1">
      <div className="section-title px-4 pt-2 pb-1.5">{title}</div>
      {children}
    </div>
  )
}
