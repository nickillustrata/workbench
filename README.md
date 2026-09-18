# Workbench

Personal Illustrata-branded dashboard: **QuickLink** (link launcher) and
**Planner** (lightweight task capture + short-term planning), with a
Dashboard shell for future functionality.

Vite + React + TypeScript + Tailwind, Illustrata brand CSS
(`src/brand/illustrata-brand.css`, copied verbatim from the calculators
repo per brand rule zero).

## Run / build

```bash
npm install
npm run dev        # local dev at http://localhost:5173
npm run build      # typecheck + build to dist/ (commit dist/ to deploy)
```

The build uses relative paths (`base: './'`), so `dist/` works from any
static host or straight off the filesystem.

## Storage

State lives in one Supabase row (no login) with localStorage as an
offline cache. Create the table once in the Supabase SQL editor:

```sql
create table if not exists workbench_solo (
  id int primary key default 1,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table workbench_solo enable row level security;
create policy "solo read"   on workbench_solo for select using (true);
create policy "solo write"  on workbench_solo for insert with check (true);
create policy "solo update" on workbench_solo for update using (true);
```

Until the table exists the app quietly runs on localStorage alone.

## Migrating old data

The v1 app stored everything in `workbench_state` keyed by user id. Two
paths into the new app — either works, the app converts v1-shaped data
automatically on first load (buckets → categories, done/scheduled →
status; notes intentionally start fresh):

1. **Supabase copy (recommended):**

   ```sql
   insert into workbench_solo (id, data)
   select 1, data from workbench_state limit 1;
   ```

2. **Same-origin deploy:** if the new build is served from the same URL
   as the old app, it reads the old `workbench.v1` localStorage cache on
   first load and migrates it.
