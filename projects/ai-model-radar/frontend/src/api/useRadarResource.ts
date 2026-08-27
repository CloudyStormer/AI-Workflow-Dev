import { useCallback, useEffect, useRef, useState } from 'react'

import type { RadarEnvelope } from './radar'

interface ResourceState<T> {
  readonly data: RadarEnvelope<T> | null
  readonly error: Error | null
  readonly loading: boolean
}

export function useRadarResource<T>(loader: () => Promise<RadarEnvelope<T>>): ResourceState<T> & {
  reload: () => Promise<void>
} {
  const loaderRef = useRef(loader)
  loaderRef.current = loader
  const [state, setState] = useState<ResourceState<T>>({ data: null, error: null, loading: true })

  const reload = useCallback(async () => {
    setState((current) => ({ ...current, error: null, loading: true }))
    try {
      const data = await loaderRef.current()
      setState({ data, error: null, loading: false })
    } catch (error) {
      setState({ data: null, error: error instanceof Error ? error : new Error('加载失败'), loading: false })
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { ...state, reload }
}
