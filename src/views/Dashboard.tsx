import { useMemo } from 'react'
import { ArrowRight, ExternalLink } from 'lucide-react'
import clsx from 'clsx'
import { useApp } from '../lib/state'
import { daysUntil, fmtDue, todayISO, type Task } from '../lib/types'
import type { Tab } from '../App'
import { Badge } from '../components/ui'

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function Dashboard({ onNav }: { onNav: (t: Tab) => void }) {
  const { state } = useApp()

  const stats = useMemo(() => {
    const open = state.tasks.filter((t) => t.status !== 'done')
    const overdue = open.filter((t) => {
      const d = daysUntil(t.dueDate)
      return d !== null && d < 0
    })
    const dueToday = open.filter((t) => daysUntil(t.dueDate) === 0)
    const scheduledToday = open.filter((t) => t.scheduledDate === todayISO())
    const doneThisWeek = state.tasks.filter(
      (t) =>
        t.status === 'done' &&
        t.completedAt !== null &&
        Date.now() - t.completedAt < 7 * 864e5,
    )
    const todays = [...new Map(
      [...overdue, ...dueToday, ...scheduledToday].map((t) => [t.id, t]),
    ).values()]
    return { open, overdue, dueToday, scheduledToday, doneThisWeek, todays }
  }, [state.tasks])

  const linkCount = state.links.reduce((n, g) => n + g.items.length, 0)
  const topLinks = state.links.flatMap((g) => g.items).slice(0, 8)

  return (
    <div className="mx-auto w-full max-w-[1180px] px-6 pt-8 pb-16">
      <div className="mb-8">
        <h1 className="disp text-[26px]">Dashboard</h1>
        <p className="mt-2 text-[14px] text-muted">
          The day at a glance. More to come here.
        </p>
      </div>

      {/* stat row — one key-figure callout per grid (gold on navy) */}
      <div className="mb-8 grid grid-cols-4 gap-4 max-md:grid-cols-2">
        <Stat label="Open Tasks" value={stats.open.length} />
        <Stat
          label="Due Or Overdue Today"
          value={stats.overdue.length + stats.dueToday.length}
          callout
        />
        <Stat label="Done This Week" value={stats.doneThisWeek.length} />
        <Stat label="Saved Links" value={linkCount} />
      </div>

      <div className="grid grid-cols-[7fr_5fr] gap-6 max-lg:grid-cols-1">
        {/* today's plate */}
        <section className="rounded-[4px] border border-hairline bg-white p-6 shadow-brand-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="section-title">Today's Plate</span>
            <button
              type="button"
              onClick={() => onNav('planner')}
              className="flex cursor-pointer items-center gap-1 text-[13px] font-semibold text-blue hover:underline underline-offset-2"
            >
              Open Planner <ArrowRight size={13} />
            </button>
          </div>
          {stats.todays.length === 0 ? (
            <p className="text-[14px] text-subtle">
              Nothing due or scheduled today. Clear runway.
            </p>
          ) : (
            <div className="flex flex-col">
              {stats.todays.map((t, i) => (
                <DashTaskRow key={t.id} task={t} striped={i % 2 === 0} />
              ))}
            </div>
          )}
        </section>

        {/* quick links */}
        <section className="rounded-[4px] border border-hairline bg-white p-6 shadow-brand-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="section-title">Quick Links</span>
            <button
              type="button"
              onClick={() => onNav('quicklink')}
              className="flex cursor-pointer items-center gap-1 text-[13px] font-semibold text-blue hover:underline underline-offset-2"
            >
              All links <ArrowRight size={13} />
            </button>
          </div>
          {topLinks.length === 0 ? (
            <p className="text-[14px] text-subtle">No links saved yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {topLinks.map((l) => (
                <a
                  key={l.id}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 rounded-[4px] border border-hairline px-2.5 py-2 transition-colors hover:border-blue"
                >
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${host(l.url)}&sz=64`}
                    alt=""
                    width={20}
                    height={20}
                    className="rounded-[3px]"
                    loading="lazy"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">
                      {l.label}
                    </span>
                  </span>
                  <ExternalLink size={12} className="flex-none text-subtle" />
                </a>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

/* stat card: Oswald value under an Oswald Title Case label; the single
   key figure renders as the navy callout with a gold value */
function Stat({
  label,
  value,
  callout = false,
}: {
  label: string
  value: number
  callout?: boolean
}) {
  return (
    <div
      className={clsx(
        'rounded-[4px] border p-4 shadow-brand-xs',
        callout ? 'border-navy bg-navy' : 'border-hairline bg-white',
      )}
    >
      <div
        className={clsx(
          'eyebrow text-[14px] tracking-[.04em]',
          callout && 'text-white',
        )}
      >
        {label}
      </div>
      <div
        className={clsx(
          'disp mt-2 text-[36px] tabular-nums',
          callout ? 'text-gold' : 'text-navy',
        )}
      >
        {value}
      </div>
    </div>
  )
}

function DashTaskRow({ task, striped }: { task: Task; striped: boolean }) {
  const d = daysUntil(task.dueDate)
  const overdue = d !== null && d < 0
  return (
    <div
      className={clsx(
        'flex items-center gap-3 px-3 py-2',
        striped && 'bg-stripe',
      )}
    >
      <span className="min-w-0 flex-1 truncate text-[14px]">{task.title}</span>
      {task.client && <Badge tone="mauve">{task.client}</Badge>}
      {task.dueDate ? (
        <Badge tone={overdue ? 'danger' : 'gold'}>{fmtDue(task.dueDate)}</Badge>
      ) : (
        <Badge tone="outline">Scheduled</Badge>
      )}
    </div>
  )
}
