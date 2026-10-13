import { useEffect, useState } from 'react'
import { getHealth } from '../api'
import type { HealthResponse } from '../types'

export type HealthState =
  | { status: 'checking' }
  | { status: 'online'; health: HealthResponse }
  | { status: 'offline' }

/** Polls GET /api/health so the header pill tracks the backend coming and going. */
export function useHealth(intervalMs = 20000): HealthState {
  const [state, setState] = useState<HealthState>({ status: 'checking' })

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined

    const check = async () => {
      try {
        const health = await getHealth()
        if (!cancelled) setState({ status: 'online', health })
      } catch {
        if (!cancelled) setState({ status: 'offline' })
      } finally {
        if (!cancelled) timer = window.setTimeout(check, intervalMs)
      }
    }
    check()

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [intervalMs])

  return state
}

export function isLive(state: HealthState): boolean {
  return state.status === 'online' && state.health.live && !state.health.demo_mode
}
