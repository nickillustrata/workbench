import { createClient } from '@supabase/supabase-js'
import type { AppState, LinkGroup, Task, TaskStatus } from './types'
import { uid } from './types'

/* ============================================================
   STORAGE — Supabase-backed, localStorage as the offline cache.
   No auth: one shared row (id = 1) in `workbench_solo`.
   Run once in the Supabase SQL editor:

     create table if not exists workbench_solo (
       id int primary key default 1,
       data jsonb not null,
       updated_at timestamptz not null default now()
     );
     alter table workbench_solo enable row level security;
     create policy "solo read"  on workbench_solo for select using (true);
     create policy "solo write" on workbench_solo for insert with check (true);
     create policy "solo update" on workbench_solo for update using (true);

   If the table doesn't exist yet the app quietly runs on
   localStorage alone and retries Supabase on each save.
============================================================= */

const SUPABASE_URL = 'https://ujogoeyyzxfwnzkhzksn.supabase.co'
const SUPABASE_KEY = 'sb_publishable_ituTPyOjYzNwY7v62MSNMw_Iu5FmRb4'
const STORAGE_KEY = 'workbench.v2'
const LEGACY_KEY = 'workbench.v1'

const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

function cacheLocal(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('local cache failed', e)
  }
}

function loadLocal(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AppState) : null
  } catch {
    return null
  }
}

/* ---------- v1 → v2 migration ----------
   The old app cached its whole state under `workbench.v1`. Links map
   across directly; tasks gain a status derived from done/scheduled;
   old buckets become categories. Notes intentionally start fresh. */

interface V1Task {
  id: string
  title: string
  bucketId: string | null
  priority: 'high' | 'med' | 'low' | null
  done: boolean
  dueDate: string
  notes: string
  scheduledDate: string
  client: string
  future: boolean
  subtasks: { id: string; title: string; done: boolean }[]
  createdAt: number
}

interface V1State {
  buckets: { id: string; name: string }[]
  tasks: V1Task[]
  links: LinkGroup[]
  clients: string[]
}

/** True when a stored blob is old-app (v1) shaped rather than v2. */
function isV1(x: unknown): x is V1State {
  return (
    !!x &&
    typeof x === 'object' &&
    !('version' in x) &&
    Array.isArray((x as V1State).buckets)
  )
}

function migrateFromLegacyCache(): AppState | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    const v1 = JSON.parse(raw) as V1State
    return transformV1(v1)
  } catch (e) {
    console.warn('v1 migration failed', e)
    return null
  }
}

function transformV1(v1: V1State): AppState {
  const bucketName = new Map(
      (v1.buckets ?? []).map((b) => [b.id, b.name]),
    )
    const tasks: Task[] = (v1.tasks ?? []).map((t) => {
      let status: TaskStatus = 'backlog'
      if (t.done) status = 'done'
      else if (t.scheduledDate) status = 'week'
      return {
        id: t.id,
        title: t.title,
        status,
        priority: t.priority ?? null,
        dueDate: t.dueDate ?? '',
        scheduledDate: t.scheduledDate ?? '',
        category: (t.bucketId && bucketName.get(t.bucketId)) || '',
        client: t.client ?? '',
        notes: t.notes ?? '',
        subtasks: (t.subtasks ?? []).map((s) => ({
          id: s.id,
          title: s.title,
          done: !!s.done,
        })),
        createdAt: t.createdAt ?? Date.now(),
        completedAt: t.done ? Date.now() : null,
      }
    })
    return {
      version: 2,
      tasks,
      links: (v1.links ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        items: (g.items ?? []).map((i) => ({
          id: i.id,
          label: i.label,
          url: i.url,
          hits: 0,
          lastUsedAt: null,
          fav: false,
        })),
      })),
      notes: [],
      categories: (v1.buckets ?? []).map((b) => b.name),
      clients: v1.clients ?? [],
  }
}

function seed(): AppState {
  return {
    version: 2,
    tasks: [],
    links: [
      {
        id: uid(),
        name: 'Tools',
        items: [
          { id: uid(), label: 'GitHub', url: 'https://github.com', hits: 0, lastUsedAt: null, fav: false },
          { id: uid(), label: 'Supabase', url: 'https://supabase.com/dashboard', hits: 0, lastUsedAt: null, fav: false },
        ],
      },
    ],
    notes: [],
    categories: [],
    clients: [],
  }
}

export function normalize(s: AppState): AppState {
  s.tasks ??= []
  s.links ??= []
  s.notes ??= []
  s.categories ??= []
  s.clients ??= []
  s.links.forEach((g) =>
    g.items.forEach((i) => {
      i.hits ??= 0
      i.lastUsedAt ??= null
      i.fav ??= false
    }),
  )
  s.tasks.forEach((t) => {
    t.status ??= 'backlog'
    t.priority ??= null
    t.dueDate ??= ''
    t.scheduledDate ??= ''
    t.category ??= ''
    t.client ??= ''
    t.notes ??= ''
    t.subtasks ??= []
    t.completedAt ??= null
  })
  return s
}

export async function loadState(): Promise<AppState> {
  // 1. remote wins when reachable (a v1-shaped row — e.g. copied over from
  //    the old workbench_state table — is migrated in place)
  try {
    const { data, error } = await sb
      .from('workbench_solo')
      .select('data')
      .eq('id', 1)
      .maybeSingle()
    if (!error && data?.data) {
      const raw = data.data as unknown
      const state = isV1(raw)
        ? transformV1(raw)
        : normalize(raw as AppState)
      cacheLocal(state)
      if (isV1(raw)) void pushRemote(state)
      return state
    }
  } catch (e) {
    console.warn('Supabase load failed — using local cache', e)
  }
  // 2. local v2 cache
  const local = loadLocal()
  if (local) return isV1(local) ? transformV1(local) : normalize(local)
  // 3. migrate from the old app's local cache (same-origin deploys)
  const migrated = migrateFromLegacyCache()
  if (migrated) {
    cacheLocal(migrated)
    void pushRemote(migrated)
    return migrated
  }
  // 4. fresh
  const fresh = seed()
  cacheLocal(fresh)
  return fresh
}

async function pushRemote(state: AppState) {
  try {
    const { error } = await sb
      .from('workbench_solo')
      .upsert({ id: 1, data: state, updated_at: new Date().toISOString() })
    if (error) throw error
  } catch (e) {
    console.warn('Supabase save failed — cached locally', e)
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

/** Cache locally immediately; push to Supabase at most every ~750ms. */
export function saveState(state: AppState) {
  cacheLocal(state)
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    void pushRemote(state)
  }, 750)
}

export function flushSave(state: AppState) {
  if (saveTimer) clearTimeout(saveTimer)
  void pushRemote(state)
}
