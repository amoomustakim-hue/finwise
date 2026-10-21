// The current Personal/Business mode, shared by every page and remembered per device.
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { useAuth } from './auth'
import type { Mode } from './lib/api'

const KEY = 'fw_mode'

type ModeState = { mode: Mode; setMode: (m: Mode) => void; both: boolean }
const ModeContext = createContext<ModeState | null>(null)

function remembered(): Mode | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'personal' || v === 'business' ? v : null
  } catch {
    return null // storage unavailable (private window etc.)
  }
}

export function ModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const both = !!user?.uses_personal && !!user?.uses_business
  const fallback: Mode = user?.uses_personal === false ? 'business' : 'personal'
  const [chosen, setChosen] = useState<Mode | null>(() => remembered())

  // A remembered mode only applies if the user still has it turned on.
  const allowed = (m: Mode | null) => m && ((m === 'personal' && user?.uses_personal) || (m === 'business' && user?.uses_business))
  const mode: Mode = allowed(chosen) ? chosen! : fallback

  const setMode = useCallback((m: Mode) => {
    setChosen(m)
    try {
      localStorage.setItem(KEY, m)
    } catch {
      /* fine: switching still works for this visit */
    }
  }, [])

  return <ModeContext.Provider value={{ mode, setMode, both }}>{children}</ModeContext.Provider>
}

export function useMode(): ModeState {
  const ctx = useContext(ModeContext)
  if (!ctx) throw new Error('useMode must be used inside ModeProvider')
  return ctx
}
