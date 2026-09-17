import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { AppState } from './types'
import { flushSave, loadState, saveState } from './store'

interface Ctx {
  state: AppState
  /** Mutate a draft copy of state; the result is saved + re-rendered. */
  update: (fn: (draft: AppState) => void) => void
}

const StateCtx = createContext<Ctx | null>(null)

export function useApp(): Ctx {
  const ctx = useContext(StateCtx)
  if (!ctx) throw new Error('useApp outside provider')
  return ctx
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null)
  const stateRef = useRef<AppState | null>(null)
  stateRef.current = state

  useEffect(() => {
    void loadState().then(setState)
  }, [])

  useEffect(() => {
    const onUnload = () => {
      if (stateRef.current) flushSave(stateRef.current)
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [])

  const update = useCallback((fn: (draft: AppState) => void) => {
    setState((prev) => {
      if (!prev) return prev
      const next = structuredClone(prev)
      fn(next)
      saveState(next)
      return next
    })
  }, [])

  if (!state) {
    return (
      <div className="flex h-screen items-center justify-center bg-page">
        <span className="disp text-lg text-steel">Loading Workbench…</span>
      </div>
    )
  }

  return <StateCtx.Provider value={{ state, update }}>{children}</StateCtx.Provider>
}
