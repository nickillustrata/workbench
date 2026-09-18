import { useMemo, useState } from 'react'
import {
  AnimatePresence,
  motion,
  MotionConfig,
  type Transition,
} from 'motion/react'
import {
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { useApp, useLinkClick } from '../lib/state'
import { uid, type LinkGroup, type LinkItem } from '../lib/types'
import { Btn } from '../components/ui'

const spring: Transition = { type: 'spring', stiffness: 260, damping: 26, mass: 1 }

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function Favicon({ url, size = 24 }: { url: string; size?: number }) {
  const h = host(url)
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${h}&sz=64`}
      alt=""
      width={size}
      height={size}
      className="rounded-[3px] bg-white"
      loading="lazy"
    />
  )
}

/* ============================================================
   QuickLinks — searchable disclosure-card grid of link groups
============================================================= */

export function QuickLinks() {
  const { state, update } = useApp()
  const [q, setQ] = useState('')
  const [newGroupId, setNewGroupId] = useState<string | null>(null)
  const query = q.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!query) return null
    return state.links
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (i) =>
            i.label.toLowerCase().includes(query) ||
            i.url.toLowerCase().includes(query),
        ),
      }))
      .filter((g) => g.items.length > 0)
  }, [state.links, query])

  const addGroup = () => {
    const id = uid()
    update((d) => {
      d.links.push({ id, name: 'New group', items: [] })
    })
    setNewGroupId(id)
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] px-6 pt-8 pb-16">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="disp text-[26px]">QuickLink</h1>
          <p className="mt-2 text-[14px] text-muted">
            Every link you use, one keystroke away.
          </p>
        </div>
        <Btn variant="outline" onClick={addGroup}>
          <Plus size={16} /> New group
        </Btn>
      </div>

      <MostUsedBar />

      <div className="relative mb-8 max-w-[440px]">
        <Search
          size={16}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter links…"
          className="h-[42px] w-full rounded-[3px] border-[1.5px] border-hairline bg-white pl-9 text-[15px] shadow-brand-xs transition-colors placeholder:text-subtle focus:border-blue focus:outline-none"
        />
      </div>

      {filtered ? (
        <SearchResults groups={filtered} />
      ) : (
        <div className="columns-1 gap-4 md:columns-2 xl:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid">
          {state.links.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              startRenaming={group.id === newGroupId}
            />
          ))}
          {state.links.length === 0 && (
            <p className="text-[14px] text-subtle">
              No link groups yet — create one to get started.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/* Most-used links, ranked by click count (tracked on every open).
   Until clicks accumulate, unclicked links fill the row in saved order. */
function MostUsedBar() {
  const { state } = useApp()
  const onLinkClick = useLinkClick()

  const top = useMemo(
    () =>
      state.links
        .flatMap((g) => g.items)
        .sort(
          (a, b) =>
            (b.hits ?? 0) - (a.hits ?? 0) ||
            (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0),
        )
        .slice(0, 8),
    [state.links],
  )

  if (top.length === 0) return null

  return (
    <div className="mb-6">
      <div className="section-title mb-2">Most Used</div>
      <div className="flex flex-wrap gap-2">
        {top.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            onClick={() => onLinkClick(item.id)}
            title={`${item.label} · ${item.hits} open${item.hits === 1 ? '' : 's'}`}
            className="flex items-center gap-2 rounded-[4px] border border-hairline bg-white py-1.5 pr-3 pl-2 shadow-brand-xs transition-colors hover:border-blue"
          >
            <Favicon url={item.url} size={18} />
            <span className="max-w-[140px] truncate text-[13px] font-semibold text-ink">
              {item.label}
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}

function SearchResults({ groups }: { groups: LinkGroup[] }) {
  const onLinkClick = useLinkClick()
  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) => (
        <div key={g.id}>
          <div className="section-title mb-2">{g.name}</div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {g.items.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                onClick={() => onLinkClick(item.id)}
                className="flex items-center gap-3 rounded-[4px] border border-hairline bg-white px-3 py-2.5 shadow-brand-xs transition-colors hover:border-blue"
              >
                <Favicon url={item.url} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-ink">
                    {item.label}
                  </span>
                  <span className="block truncate text-[11px] text-subtle">
                    {host(item.url)}
                  </span>
                </span>
                <ExternalLink size={14} className="flex-none text-subtle" />
              </a>
            ))}
          </div>
        </div>
      ))}
      {groups.length === 0 && (
        <p className="text-[14px] text-subtle">No links match.</p>
      )}
    </div>
  )
}

/* ---------- disclosure group card ---------- */

function GroupCard({
  group,
  startRenaming = false,
}: {
  group: LinkGroup
  startRenaming?: boolean
}) {
  const { update } = useApp()
  const onLinkClick = useLinkClick()
  const [expanded, setExpanded] = useState(startRenaming)
  const [editing, setEditing] = useState<LinkItem | 'new' | null>(null)
  const [renaming, setRenaming] = useState(startRenaming)
  const [nameDraft, setNameDraft] = useState(group.name)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const startRename = () => {
    setNameDraft(group.name)
    setRenaming(true)
  }

  const commitRename = () => {
    const name = nameDraft.trim()
    if (name && name !== group.name) {
      update((d) => {
        const g = d.links.find((x) => x.id === group.id)
        if (g) g.name = name
      })
    }
    setRenaming(false)
  }

  const deleteGroup = () => {
    update((d) => {
      d.links = d.links.filter((x) => x.id !== group.id)
    })
  }

  return (
    <MotionConfig transition={spring}>
      <motion.div
        layout
        className="overflow-hidden rounded-[6px] border border-hairline bg-white shadow-brand-sm"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {!expanded ? (
            <motion.button
              key="collapsed"
              type="button"
              onClick={() => setExpanded(true)}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="flex w-full cursor-pointer items-center gap-3 p-4 text-left"
            >
              <div
                className={clsx(
                  'grid flex-none gap-1',
                  group.items.length > 1 ? 'grid-cols-2' : 'grid-cols-1',
                )}
              >
                {group.items.slice(0, 4).map((item) => (
                  <motion.div
                    key={item.id}
                    layoutId={`link-${item.id}`}
                    className="flex size-7 items-center justify-center rounded-[4px] border border-hairline bg-stripe p-1"
                  >
                    <Favicon url={item.url} size={18} />
                  </motion.div>
                ))}
                {group.items.length === 0 && (
                  <div className="flex size-7 items-center justify-center rounded-[4px] border border-dashed border-hairline-strong text-subtle">
                    <Plus size={14} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <motion.div
                  layoutId={`gtitle-${group.id}`}
                  layout="position"
                  className="section-title truncate text-[14px]"
                >
                  {group.name}
                </motion.div>
                <div className="mt-1 text-[12px] text-subtle">
                  {group.items.length} link{group.items.length === 1 ? '' : 's'}
                </div>
              </div>
              <ChevronRight size={18} className="flex-none text-subtle" />
            </motion.button>
          ) : (
            <motion.div
              key="expanded"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.08 }}
              className="flex flex-col gap-2 p-4"
            >
              <motion.div layout className="mb-1 flex items-center gap-2">
                {renaming ? (
                  <form
                    className="flex min-w-0 flex-1 items-center gap-1.5"
                    onSubmit={(e) => {
                      e.preventDefault()
                      commitRename()
                    }}
                  >
                    <input
                      autoFocus
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onBlur={commitRename}
                      onKeyDown={(e) => e.key === 'Escape' && setRenaming(false)}
                      className="section-title h-[28px] min-w-0 flex-1 rounded-[3px] border-[1.5px] border-blue bg-white px-2 text-[14px] focus:outline-none"
                    />
                    <button
                      type="submit"
                      title="Save name"
                      className="flex size-6 flex-none cursor-pointer items-center justify-center rounded-full bg-blue text-white"
                    >
                      <Check size={13} strokeWidth={3} />
                    </button>
                  </form>
                ) : (
                  <>
                    <motion.div
                      layoutId={`gtitle-${group.id}`}
                      layout="position"
                      className="section-title flex-1 truncate text-[14px]"
                    >
                      {group.name}
                    </motion.div>
                    <button
                      type="button"
                      onClick={startRename}
                      title="Rename group"
                      className="cursor-pointer rounded-[3px] p-1 text-subtle hover:bg-stripe hover:text-navy"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(true)}
                      title="Delete group"
                      className="cursor-pointer rounded-[3px] p-1 text-subtle hover:bg-[#fcecec] hover:text-danger"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpanded(false)}
                      title="Collapse group"
                      className="flex size-6 cursor-pointer items-center justify-center rounded-full bg-navy text-white"
                    >
                      <ChevronDown size={14} strokeWidth={3} className="rotate-180" />
                    </button>
                  </>
                )}
              </motion.div>

              {confirmingDelete && (
                <div className="mb-1 flex items-center justify-between gap-2 rounded-[4px] border border-danger/40 bg-[#fcecec] px-3 py-2">
                  <span className="text-[12.5px] font-semibold text-danger">
                    Delete “{group.name}”
                    {group.items.length > 0 &&
                      ` and its ${group.items.length} link${group.items.length === 1 ? '' : 's'}`}
                    ?
                  </span>
                  <span className="flex flex-none gap-1.5">
                    <button
                      type="button"
                      onClick={deleteGroup}
                      className="cursor-pointer rounded-[3px] bg-danger px-2.5 py-1 text-[12px] font-bold text-white hover:opacity-90"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      className="cursor-pointer rounded-[3px] border border-hairline-strong bg-white px-2.5 py-1 text-[12px] font-semibold text-muted hover:text-ink"
                    >
                      Cancel
                    </button>
                  </span>
                </div>
              )}

              {group.items.map((item) => (
                <div key={item.id} className="group flex items-center gap-2.5">
                  <motion.div
                    layoutId={`link-${item.id}`}
                    className="flex size-9 flex-none items-center justify-center rounded-[4px] border border-hairline bg-stripe p-1"
                  >
                    <Favicon url={item.url} />
                  </motion.div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => onLinkClick(item.id)}
                    className="min-w-0 flex-1"
                  >
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="truncate text-[14px] font-semibold text-ink hover:text-blue"
                    >
                      {item.label}
                    </motion.p>
                    <p className="truncate text-[11px] text-subtle">
                      {host(item.url)}
                    </p>
                  </a>
                  <button
                    type="button"
                    onClick={() => setEditing(item)}
                    className="cursor-pointer rounded-[3px] p-1 text-subtle opacity-0 transition-opacity group-hover:opacity-100 hover:bg-stripe hover:text-navy"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setEditing('new')}
                className="mt-1 flex cursor-pointer items-center gap-2 rounded-[4px] border border-dashed border-hairline-strong px-3 py-2 text-[13px] font-semibold text-muted transition-colors hover:border-blue hover:text-blue"
              >
                <Plus size={14} /> Add link
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {editing && (
            <LinkEditor
              groupId={group.id}
              item={editing === 'new' ? null : editing}
              onClose={() => setEditing(null)}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </MotionConfig>
  )
}

/* ---------- morphing link add/edit panel ---------- */

function LinkEditor({
  groupId,
  item,
  onClose,
}: {
  groupId: string
  item: LinkItem | null
  onClose: () => void
}) {
  const { update } = useApp()
  const [label, setLabel] = useState(item?.label ?? '')
  const [url, setUrl] = useState(item?.url ?? '')

  const save = (e?: { preventDefault: () => void }) => {
    e?.preventDefault()
    const cleanUrl = url.trim().match(/^https?:\/\//)
      ? url.trim()
      : `https://${url.trim()}`
    if (!url.trim()) return
    update((d) => {
      const g = d.links.find((x) => x.id === groupId)
      if (!g) return
      if (item) {
        const it = g.items.find((x) => x.id === item.id)
        if (it) {
          it.label = label.trim() || host(cleanUrl)
          it.url = cleanUrl
        }
      } else {
        g.items.push({
          id: uid(),
          label: label.trim() || host(cleanUrl),
          url: cleanUrl,
          hits: 0,
          lastUsedAt: null,
        })
      }
    })
    onClose()
  }

  const remove = () => {
    if (!item) return
    update((d) => {
      const g = d.links.find((x) => x.id === groupId)
      if (g) g.items = g.items.filter((x) => x.id !== item.id)
    })
    onClose()
  }

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden border-t border-hairline bg-[#f8fbff]"
    >
      <form onSubmit={save} className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <span className="eyebrow">{item ? 'Edit Link' : 'Add Link'}</span>
          <button
            type="button"
            onClick={onClose}
            className="flex size-6 cursor-pointer items-center justify-center rounded-full bg-hairline-strong text-white hover:bg-navy"
          >
            <X size={13} strokeWidth={3} />
          </button>
        </div>
        <input
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="h-[38px] rounded-[3px] border-[1.5px] border-hairline bg-white px-3 text-[14px] focus:border-blue focus:outline-none"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (optional)"
          className="h-[38px] rounded-[3px] border-[1.5px] border-hairline bg-white px-3 text-[14px] focus:border-blue focus:outline-none"
        />
        <div className="flex items-center justify-between">
          {item ? (
            <Btn variant="danger-ghost" onClick={remove} className="h-[30px] px-2 text-[12px]">
              <Trash2 size={13} /> Delete
            </Btn>
          ) : (
            <span />
          )}
          <Btn type="submit" className="h-[30px] px-4 text-[13px]">
            {item ? 'Save' : 'Add'}
          </Btn>
        </div>
      </form>
    </motion.div>
  )
}
