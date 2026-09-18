import { useMemo, useState, type DragEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flag,
  NotebookPen,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { useApp } from '../lib/state'
import {
  addDays,
  daysUntil,
  fmtDue,
  mondayOf,
  parseISO,
  todayISO,
  toISO,
  uid,
  type Priority,
  type Task,
  type TaskStatus,
} from '../lib/types'
import { Badge, Btn, Segmented } from '../components/ui'

type View = 'list' | 'week' | 'kanban'

const PRIORITY_META: Record<Exclude<Priority, null>, { label: string; cls: string }> = {
  high: { label: 'High', cls: 'text-danger' },
  med: { label: 'Med', cls: 'text-gold' },
  low: { label: 'Low', cls: 'text-steel' },
}

const STATUS_META: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  week: 'This Week',
  doing: 'Doing',
  done: 'Done',
}

export function Planner() {
  const [view, setView] = useState<View>('list')
  const [notesOpen, setNotesOpen] = useState(true)

  return (
    <div className="flex h-full min-h-0">
      <div className="min-w-0 flex-1 overflow-y-auto px-6 pt-8 pb-16">
        <div className="@container mx-auto w-full max-w-[980px]">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="disp text-[26px]">Planner</h1>
              <p className="mt-2 text-[14px] text-muted">
                Capture fast, plan the short term.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Segmented
                value={view}
                onChange={setView}
                options={[
                  { value: 'list', label: 'List' },
                  { value: 'week', label: 'Week' },
                  { value: 'kanban', label: 'Board' },
                ]}
              />
              <Btn
                variant={notesOpen ? 'secondary' : 'outline'}
                onClick={() => setNotesOpen((v) => !v)}
                title="Toggle notes"
              >
                <NotebookPen size={15} /> Notes
              </Btn>
            </div>
          </div>

          <QuickAdd />

          {view === 'list' && <ListView />}
          {view === 'week' && <WeekView />}
          {view === 'kanban' && <KanbanView />}
        </div>
      </div>
      {notesOpen && <NotesRail onClose={() => setNotesOpen(false)} />}
    </div>
  )
}

/* ============================================================
   Quick capture
============================================================= */

function QuickAdd() {
  const { update } = useApp()
  const [title, setTitle] = useState('')

  const add = (e?: { preventDefault: () => void }) => {
    e?.preventDefault()
    const t = title.trim()
    if (!t) return
    update((d) => {
      d.tasks.unshift({
        id: uid(),
        title: t,
        status: 'backlog',
        priority: null,
        dueDate: '',
        scheduledDate: '',
        category: '',
        client: '',
        notes: '',
        subtasks: [],
        createdAt: Date.now(),
        completedAt: null,
      })
    })
    setTitle('')
  }

  return (
    <form
      onSubmit={add}
      className="mb-8 flex items-center gap-2 rounded-[6px] border border-[#B9CDE6] bg-[#f8fbff] p-2"
    >
      <Plus size={17} className="ml-2 flex-none text-steel" />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Type a task and press Enter…"
        className="h-[38px] min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-subtle focus:outline-none"
      />
      {title.trim() && (
        <Btn type="submit" className="h-[32px]">
          Add
        </Btn>
      )}
    </form>
  )
}

/* ============================================================
   Shared task row + editor
============================================================= */

function useTaskOps() {
  const { update } = useApp()
  return {
    toggleDone: (id: string) =>
      update((d) => {
        const t = d.tasks.find((x) => x.id === id)
        if (!t) return
        const done = t.status !== 'done'
        t.status = done ? 'done' : 'backlog'
        t.completedAt = done ? Date.now() : null
      }),
    patch: (id: string, fn: (t: Task) => void) =>
      update((d) => {
        const t = d.tasks.find((x) => x.id === id)
        if (t) fn(t)
      }),
    remove: (id: string) =>
      update((d) => {
        d.tasks = d.tasks.filter((x) => x.id !== id)
      }),
  }
}

function TaskRow({
  task,
  compact = false,
  draggable = false,
}: {
  task: Task
  compact?: boolean
  draggable?: boolean
}) {
  const { toggleDone } = useTaskOps()
  const [open, setOpen] = useState(false)
  const done = task.status === 'done'
  const due = daysUntil(task.dueDate)

  return (
    <div
      className={clsx(
        'relative rounded-[4px] border bg-white transition-colors',
        done ? 'border-hairline bg-stripe' : 'border-hairline hover:border-hairline-strong',
        draggable && 'cursor-grab active:cursor-grabbing',
      )}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/task-id', task.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
    >
      {/* priority bar (compact) */}
      {compact && task.priority && !done && (
        <span
          className={clsx(
            'absolute top-2 bottom-2 left-0 w-[3px] rounded-r-[3px]',
            task.priority === 'high' && 'bg-danger',
            task.priority === 'med' && 'bg-gold',
            task.priority === 'low' && 'bg-steel',
          )}
        />
      )}
      <div
        className={clsx(
          'flex items-start gap-2.5',
          compact ? 'px-2.5 py-2' : 'px-3 py-2.5',
        )}
      >
        <button
          type="button"
          onClick={() => toggleDone(task.id)}
          className={clsx(
            'mt-0.5 flex flex-none cursor-pointer items-center justify-center rounded-[3px] border-[1.5px] transition-colors',
            compact ? 'size-4' : 'size-[18px]',
            done
              ? 'border-success bg-success text-white'
              : 'border-hairline-strong bg-white hover:border-blue',
          )}
        >
          {done && <Check size={compact ? 10 : 12} strokeWidth={3} />}
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="min-w-0 flex-1 cursor-pointer text-left"
        >
          <span
            className={clsx(
              'leading-snug',
              compact
                ? 'line-clamp-2 text-[12.5px] break-words'
                : 'block text-[14px] break-words',
              done ? 'text-subtle line-through' : 'text-ink',
            )}
          >
            {task.title}
          </span>
          {!compact && (
            <span className="mt-1 flex flex-wrap items-center gap-1.5 empty:hidden">
              {task.dueDate && !done && (
                <Badge tone={due !== null && due < 0 ? 'danger' : due !== null && due <= 1 ? 'gold' : 'outline'}>
                  {fmtDue(task.dueDate)}
                </Badge>
              )}
              {task.category && <Badge tone="navy">{task.category}</Badge>}
              {task.client && <Badge tone="mauve">{task.client}</Badge>}
              {task.subtasks.length > 0 && (
                <span className="text-[11px] font-semibold text-subtle">
                  {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}
                </span>
              )}
            </span>
          )}
          {compact && task.dueDate && !done && (
            <span
              className={clsx(
                'mt-0.5 block text-[10.5px] font-bold uppercase',
                due !== null && due < 0 ? 'text-danger' : 'text-muted',
              )}
            >
              {fmtDue(task.dueDate)}
            </span>
          )}
        </button>
        {!compact && task.priority && (
          <Flag
            size={14}
            className={clsx('mt-1 flex-none', PRIORITY_META[task.priority].cls)}
            fill="currentColor"
          />
        )}
        {!compact && (
          <ChevronDown
            size={15}
            onClick={() => setOpen((v) => !v)}
            className={clsx(
              'mt-1 flex-none cursor-pointer text-subtle transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        )}
      </div>
      {compact ? (
        <AnimatePresence>
          {open && (
            <TaskModal task={task} onClose={() => setOpen(false)} />
          )}
        </AnimatePresence>
      ) : (
        <AnimatePresence initial={false}>
          {open && <TaskEditor task={task} onClose={() => setOpen(false)} />}
        </AnimatePresence>
      )}
    </div>
  )
}

/* modal wrapper for editing from tight layouts (week / board columns) */
function TaskModal({ task, onClose }: { task: Task; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="fixed inset-0 z-50 flex cursor-default items-center justify-center bg-navy-900/40 p-6"
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
    >
      <div
        className="max-h-[85vh] w-full max-w-[600px] overflow-y-auto rounded-[6px] bg-white shadow-brand-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-hairline px-4 py-3">
          <span className="section-title">Edit Task</span>
        </div>
        <TaskEditor task={task} onClose={onClose} />
      </div>
    </motion.div>
  )
}

function TaskEditor({ task, onClose }: { task: Task; onClose: () => void }) {
  const { state } = useApp()
  const { patch, remove } = useTaskOps()
  const [subTitle, setSubTitle] = useState('')

  const set = (fn: (t: Task) => void) => patch(task.id, fn)

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.16, ease: [0.2, 0.7, 0.2, 1] }}
      className="overflow-hidden"
    >
      <div className="flex flex-col gap-4 border-t border-hairline bg-[#f8fbff] p-4">
        <input
          value={task.title}
          onChange={(e) => set((t) => (t.title = e.target.value))}
          className="h-[38px] rounded-[3px] border-[1.5px] border-hairline bg-white px-3 text-[14px] font-semibold focus:border-blue focus:outline-none"
        />
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Due Date">
            <input
              type="date"
              value={task.dueDate}
              onChange={(e) => set((t) => (t.dueDate = e.target.value))}
              className="h-[34px] rounded-[3px] border-[1.5px] border-hairline bg-white px-2 text-[13px] focus:border-blue focus:outline-none"
            />
          </Field>
          <Field label="Priority">
            <div className="flex gap-1">
              {(['high', 'med', 'low'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() =>
                    set((t) => (t.priority = t.priority === p ? null : p))
                  }
                  className={clsx(
                    'cursor-pointer rounded-[3px] border-[1.5px] px-2.5 py-1 text-[12px] font-semibold transition-colors',
                    task.priority === p
                      ? p === 'high'
                        ? 'border-danger bg-[#fcecec] text-danger'
                        : p === 'med'
                          ? 'border-gold bg-[#fff7e0] text-[#9a7400]'
                          : 'border-steel bg-blue-100 text-steel'
                      : 'border-hairline bg-white text-muted hover:border-hairline-strong',
                  )}
                >
                  {PRIORITY_META[p].label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Status">
            <select
              value={task.status}
              onChange={(e) =>
                set((t) => {
                  t.status = e.target.value as TaskStatus
                  t.completedAt = t.status === 'done' ? Date.now() : null
                })
              }
              className="h-[34px] cursor-pointer rounded-[3px] border-[1.5px] border-hairline bg-white px-2 text-[13px] focus:border-blue focus:outline-none"
            >
              {Object.entries(STATUS_META).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <input
              list={`cats-${task.id}`}
              value={task.category}
              onChange={(e) => set((t) => (t.category = e.target.value))}
              placeholder="—"
              className="h-[34px] w-[130px] rounded-[3px] border-[1.5px] border-hairline bg-white px-2 text-[13px] focus:border-blue focus:outline-none"
            />
            <datalist id={`cats-${task.id}`}>
              {state.categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Client">
            <input
              list={`clients-${task.id}`}
              value={task.client}
              onChange={(e) => set((t) => (t.client = e.target.value))}
              placeholder="—"
              className="h-[34px] w-[120px] rounded-[3px] border-[1.5px] border-hairline bg-white px-2 text-[13px] focus:border-blue focus:outline-none"
            />
            <datalist id={`clients-${task.id}`}>
              {state.clients.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
        </div>

        <Field label="Notes">
          <textarea
            value={task.notes}
            onChange={(e) => set((t) => (t.notes = e.target.value))}
            rows={2}
            className="w-full resize-y rounded-[3px] border-[1.5px] border-hairline bg-white px-3 py-2 text-[13px] leading-relaxed focus:border-blue focus:outline-none"
          />
        </Field>

        <Field label="Subtasks">
          <div className="flex flex-col gap-1.5">
            {task.subtasks.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    set((t) => {
                      const st = t.subtasks.find((x) => x.id === s.id)
                      if (st) st.done = !st.done
                    })
                  }
                  className={clsx(
                    'flex size-4 flex-none cursor-pointer items-center justify-center rounded-[3px] border-[1.5px]',
                    s.done
                      ? 'border-success bg-success text-white'
                      : 'border-hairline-strong bg-white hover:border-blue',
                  )}
                >
                  {s.done && <Check size={10} strokeWidth={3} />}
                </button>
                <span
                  className={clsx(
                    'flex-1 text-[13px]',
                    s.done && 'text-subtle line-through',
                  )}
                >
                  {s.title}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    set((t) => {
                      t.subtasks = t.subtasks.filter((x) => x.id !== s.id)
                    })
                  }
                  className="cursor-pointer text-subtle hover:text-danger"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
            <input
              value={subTitle}
              onChange={(e) => setSubTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && subTitle.trim()) {
                  set((t) =>
                    t.subtasks.push({ id: uid(), title: subTitle.trim(), done: false }),
                  )
                  setSubTitle('')
                }
              }}
              placeholder="Add subtask + Enter"
              className="h-[30px] max-w-[280px] rounded-[3px] border-[1.5px] border-dashed border-hairline bg-white px-2 text-[13px] focus:border-blue focus:outline-none"
            />
          </div>
        </Field>

        <div className="flex items-center justify-between">
          <Btn
            variant="danger-ghost"
            className="h-[28px] px-2 text-[12px]"
            onClick={() => remove(task.id)}
          >
            <Trash2 size={13} /> Delete task
          </Btn>
          <Btn variant="outline" className="h-[28px] px-3 text-[12px]" onClick={onClose}>
            Close
          </Btn>
        </div>
      </div>
    </motion.div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="eyebrow">{label}</span>
      {children}
    </div>
  )
}

/* ============================================================
   List view — grouped by urgency
============================================================= */

function ListView() {
  const { state } = useApp()
  const [showDone, setShowDone] = useState(false)

  const groups = useMemo(() => {
    const open = state.tasks.filter((t) => t.status !== 'done')
    const done = state.tasks
      .filter((t) => t.status === 'done')
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
    const overdue: Task[] = []
    const today: Task[] = []
    const upcoming: Task[] = []
    const someday: Task[] = []
    for (const t of open) {
      const d = daysUntil(t.dueDate)
      if (d === null) someday.push(t)
      else if (d < 0) overdue.push(t)
      else if (d === 0) today.push(t)
      else upcoming.push(t)
    }
    const byDue = (a: Task, b: Task) => a.dueDate.localeCompare(b.dueDate)
    overdue.sort(byDue)
    upcoming.sort(byDue)
    return { overdue, today, upcoming, someday, done }
  }, [state.tasks])

  const Section = ({ title, tasks }: { title: string; tasks: Task[] }) =>
    tasks.length === 0 ? null : (
      <div className="mb-6">
        <div className="mb-2 flex items-baseline gap-2">
          <span className="section-title">{title}</span>
          <span className="text-[11px] font-bold text-subtle">{tasks.length}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </div>
      </div>
    )

  const openCount =
    groups.overdue.length + groups.today.length + groups.upcoming.length + groups.someday.length

  return (
    <div>
      <Section title="Overdue" tasks={groups.overdue} />
      <Section title="Today" tasks={groups.today} />
      <Section title="Upcoming" tasks={groups.upcoming} />
      <Section title="No Date" tasks={groups.someday} />
      {openCount === 0 && (
        <p className="mb-6 text-[14px] text-subtle">
          Nothing open — capture something above.
        </p>
      )}
      {groups.done.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            className="mb-2 flex cursor-pointer items-center gap-1.5"
          >
            <span className="section-title">Done</span>
            <span className="text-[11px] font-bold text-subtle">
              {groups.done.length}
            </span>
            <ChevronDown
              size={14}
              className={clsx(
                'text-subtle transition-transform duration-200',
                showDone && 'rotate-180',
              )}
            />
          </button>
          {showDone && (
            <div className="flex flex-col gap-1.5">
              {groups.done.slice(0, 30).map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ============================================================
   Week view — Mon–Fri drop columns + unscheduled rail
============================================================= */

function WeekView() {
  const { state } = useApp()
  const { patch } = useTaskOps()
  const [weekStart, setWeekStart] = useState(() => toISO(mondayOf(new Date())))
  const [hot, setHot] = useState<string | null>(null)

  const days = useMemo(() => {
    const start = parseISO(weekStart)
    return Array.from({ length: 5 }, (_, i) => toISO(addDays(start, i)))
  }, [weekStart])

  const unscheduled = state.tasks.filter(
    (t) => t.status !== 'done' && !t.scheduledDate,
  )

  const range = `${parseISO(days[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${parseISO(days[4]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  const onDrop = (e: DragEvent, dateISO: string) => {
    e.preventDefault()
    setHot(null)
    const id = e.dataTransfer.getData('text/task-id')
    if (!id) return
    patch(id, (t) => {
      t.scheduledDate = dateISO
      if (t.status === 'backlog') t.status = 'week'
    })
  }

  const allowDrop = (e: DragEvent, key: string) => {
    e.preventDefault()
    setHot(key)
  }

  return (
    <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-[220px_1fr]">
      <div
        className={clsx(
          'flex h-fit flex-col gap-1.5 rounded-[6px] border bg-white p-3 shadow-brand-xs transition-colors',
          hot === 'none' ? 'border-blue' : 'border-hairline',
        )}
        onDragOver={(e) => allowDrop(e, 'none')}
        onDragLeave={() => setHot(null)}
        onDrop={(e) => {
          e.preventDefault()
          setHot(null)
          const id = e.dataTransfer.getData('text/task-id')
          if (id) patch(id, (t) => (t.scheduledDate = ''))
        }}
      >
        <div className="section-title mb-1">Unscheduled</div>
        {unscheduled.length === 0 && (
          <p className="text-[12px] text-subtle">Everything is placed.</p>
        )}
        {unscheduled.map((t) => (
          <TaskRow key={t.id} task={t} compact draggable />
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setWeekStart(toISO(addDays(parseISO(weekStart), -7)))
            }
            className="flex size-8 cursor-pointer items-center justify-center rounded-[3px] border-[1.5px] border-hairline bg-white text-muted hover:border-blue hover:text-blue"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="eyebrow text-[14px] whitespace-nowrap">{range}</span>
          <button
            type="button"
            onClick={() => setWeekStart(toISO(addDays(parseISO(weekStart), 7)))}
            className="flex size-8 cursor-pointer items-center justify-center rounded-[3px] border-[1.5px] border-hairline bg-white text-muted hover:border-blue hover:text-blue"
          >
            <ChevronRight size={16} />
          </button>
          <Btn
            variant="ghost"
            className="h-[30px] px-2 text-[12px]"
            onClick={() => setWeekStart(toISO(mondayOf(new Date())))}
          >
            <Calendar size={13} /> This week
          </Btn>
        </div>
        <div className="grid grid-cols-1 gap-2 @xl:grid-cols-5">
          {days.map((iso) => {
            const d = parseISO(iso)
            const isToday = iso === todayISO()
            const dayTasks = state.tasks.filter(
              (t) => t.scheduledDate === iso && t.status !== 'done',
            )
            const doneTasks = state.tasks.filter(
              (t) => t.scheduledDate === iso && t.status === 'done',
            )
            return (
              <div
                key={iso}
                onDragOver={(e) => allowDrop(e, iso)}
                onDragLeave={() => setHot(null)}
                onDrop={(e) => onDrop(e, iso)}
                className={clsx(
                  'flex min-h-[180px] flex-col rounded-[6px] border bg-white shadow-brand-xs transition-colors',
                  hot === iso ? 'border-blue' : isToday ? 'border-steel' : 'border-hairline',
                )}
              >
                <div className="flex items-baseline justify-between border-b border-hairline px-2.5 py-2">
                  <span className="section-title text-[11px]">
                    {d.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span
                    className={clsx(
                      'disp text-[15px]',
                      isToday ? 'text-blue' : 'text-navy',
                    )}
                  >
                    {d.getDate()}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-2">
                  {dayTasks.map((t) => (
                    <TaskRow key={t.id} task={t} compact draggable />
                  ))}
                  {doneTasks.map((t) => (
                    <TaskRow key={t.id} task={t} compact draggable />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-[12px] text-subtle">
          Drag tasks onto a day to schedule them; drag back to Unscheduled to clear.
        </p>
      </div>
    </div>
  )
}

/* ============================================================
   Kanban view — status columns
============================================================= */

function KanbanView() {
  const { state } = useApp()
  const { patch } = useTaskOps()
  const [hot, setHot] = useState<TaskStatus | null>(null)

  const cols: TaskStatus[] = ['backlog', 'week', 'doing', 'done']

  return (
    <div className="grid grid-cols-1 gap-3 @lg:grid-cols-2 @3xl:grid-cols-4">
      {cols.map((status) => {
        const tasks = state.tasks
          .filter((t) => t.status === status)
          .sort((a, b) =>
            status === 'done'
              ? (b.completedAt ?? 0) - (a.completedAt ?? 0)
              : a.createdAt - b.createdAt,
          )
        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault()
              setHot(status)
            }}
            onDragLeave={() => setHot(null)}
            onDrop={(e) => {
              e.preventDefault()
              setHot(null)
              const id = e.dataTransfer.getData('text/task-id')
              if (!id) return
              patch(id, (t) => {
                t.status = status
                t.completedAt = status === 'done' ? Date.now() : null
              })
            }}
            className={clsx(
              'flex min-h-[260px] flex-col rounded-[6px] border bg-white shadow-brand-xs transition-colors',
              hot === status ? 'border-blue' : 'border-hairline',
            )}
          >
            <div className="flex items-center justify-between border-b border-hairline px-3 py-2.5">
              <span className="section-title">{STATUS_META[status]}</span>
              <span className="text-[11px] font-bold text-subtle">
                {tasks.length}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-1.5 p-2">
              {(status === 'done' ? tasks.slice(0, 15) : tasks).map((t) => (
                <TaskRow key={t.id} task={t} compact draggable />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ============================================================
   Notes rail
============================================================= */

function NotesRail({ onClose }: { onClose: () => void }) {
  const { state, update } = useApp()
  const [activeId, setActiveId] = useState<string | null>(
    state.notes[0]?.id ?? null,
  )
  const active = state.notes.find((n) => n.id === activeId) ?? null

  const addNote = () => {
    const id = uid()
    update((d) => {
      d.notes.unshift({ id, title: 'New note', body: '', updatedAt: Date.now() })
    })
    setActiveId(id)
  }

  const deleteNote = (id: string) => {
    if (!window.confirm('Delete this note?')) return
    update((d) => {
      d.notes = d.notes.filter((n) => n.id !== id)
    })
    if (activeId === id) setActiveId(state.notes.find((n) => n.id !== id)?.id ?? null)
  }

  return (
    <aside className="flex w-[340px] flex-none flex-col border-l border-hairline bg-white">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="section-title">Notes</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={addNote}
            title="New note"
            className="flex size-7 cursor-pointer items-center justify-center rounded-[3px] text-muted hover:bg-stripe hover:text-navy"
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 cursor-pointer items-center justify-center rounded-[3px] text-muted hover:bg-stripe hover:text-navy"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 border-b border-hairline px-4 pb-3">
        {state.notes.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => setActiveId(n.id)}
            className={clsx(
              'max-w-[140px] cursor-pointer truncate rounded-[3px] px-2.5 py-1 text-[12px] font-semibold transition-colors',
              n.id === activeId
                ? 'bg-navy text-white'
                : 'bg-stripe text-muted hover:text-navy',
            )}
          >
            {n.title || 'Untitled'}
          </button>
        ))}
        {state.notes.length === 0 && (
          <span className="text-[12px] text-subtle">
            No notes yet — add one with +.
          </span>
        )}
      </div>
      {active ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
          <div className="flex items-center gap-2">
            <input
              value={active.title}
              onChange={(e) =>
                update((d) => {
                  const n = d.notes.find((x) => x.id === active.id)
                  if (n) {
                    n.title = e.target.value
                    n.updatedAt = Date.now()
                  }
                })
              }
              className="h-[34px] min-w-0 flex-1 rounded-[3px] border-[1.5px] border-hairline bg-white px-2 text-[14px] font-semibold focus:border-blue focus:outline-none"
            />
            <button
              type="button"
              onClick={() => deleteNote(active.id)}
              className="cursor-pointer rounded-[3px] p-1.5 text-subtle hover:bg-[#fcecec] hover:text-danger"
            >
              <Trash2 size={15} />
            </button>
          </div>
          <textarea
            value={active.body}
            onChange={(e) =>
              update((d) => {
                const n = d.notes.find((x) => x.id === active.id)
                if (n) {
                  n.body = e.target.value
                  n.updatedAt = Date.now()
                }
              })
            }
            placeholder="Jot anything…"
            className="min-h-0 flex-1 resize-none rounded-[3px] border-[1.5px] border-hairline bg-white p-3 text-[13.5px] leading-relaxed focus:border-blue focus:outline-none"
          />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-[13px] text-subtle">
          Select or create a note.
        </div>
      )}
    </aside>
  )
}
