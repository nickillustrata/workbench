export type Priority = 'high' | 'med' | 'low' | null

export type TaskStatus = 'backlog' | 'week' | 'doing' | 'done'

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface Task {
  id: string
  title: string
  status: TaskStatus
  priority: Priority
  dueDate: string // ISO yyyy-mm-dd or ''
  scheduledDate: string // ISO yyyy-mm-dd or '' — which day of the week board
  category: string
  client: string
  notes: string
  subtasks: Subtask[]
  createdAt: number
  completedAt: number | null
}

export interface LinkItem {
  id: string
  label: string
  url: string
  /** click count — powers the Most Used bar */
  hits: number
  lastUsedAt: number | null
}

export interface LinkGroup {
  id: string
  name: string
  items: LinkItem[]
}

export interface Note {
  id: string
  title: string
  body: string
  updatedAt: number
}

export interface AppState {
  version: 2
  tasks: Task[]
  links: LinkGroup[]
  notes: Note[]
  categories: string[]
  clients: string[]
}

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

export const todayISO = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const parseISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const mondayOf = (d: Date) => {
  const z = new Date(d)
  z.setHours(0, 0, 0, 0)
  z.setDate(z.getDate() - ((z.getDay() + 6) % 7))
  return z
}

export const addDays = (d: Date, n: number) => {
  const z = new Date(d)
  z.setDate(z.getDate() + n)
  return z
}

/** Days until due: negative = overdue. null when no date. */
export const daysUntil = (iso: string): number | null => {
  if (!iso) return null
  return Math.round(
    (parseISO(iso).getTime() - parseISO(todayISO()).getTime()) / 864e5,
  )
}

export const fmtDue = (iso: string): string => {
  const diff = daysUntil(iso)
  if (diff === null) return ''
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff < 0) return `${-diff}d overdue`
  if (diff < 7) return parseISO(iso).toLocaleDateString('en-US', { weekday: 'short' })
  return parseISO(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
