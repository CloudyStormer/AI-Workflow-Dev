const DEFAULT_API_BASE = 'http://127.0.0.1:4317'

export type TruthState =
  | 'loading'
  | 'live'
  | 'empty'
  | 'not_ready'
  | 'stale'
  | 'degraded'
  | 'failed'
  | 'no_new_items'
  | 'refreshing'

export interface RadarError {
  readonly code?: string
  readonly message_zh_cn?: string
  readonly message?: string
}

export interface RadarEnvelope<T = unknown> {
  readonly schema_version?: string
  readonly request_id?: string
  readonly data_mode?: string | null
  readonly truth?: TruthState
  readonly project_state?: string
  readonly snapshot_id?: string | null
  readonly snapshot_revision?: string | null
  readonly as_of?: string | null
  readonly observed_at?: string | null
  readonly last_success_at?: string | null
  readonly freshness?: {
    readonly status?: string
    readonly age_seconds?: number | null
  } | null
  readonly coverage?: {
    readonly approved?: number | null
    readonly runtime_enabled?: number | null
    readonly succeeded?: number | null
    readonly blocked?: number | null
  } | null
  readonly data?: T
  readonly errors?: readonly RadarError[]
}

export interface RadarEvent {
  readonly event_id: string
  readonly title: string
  readonly publisher?: string
  readonly region?: string
  readonly category?: string
  readonly event_kind?: string
  readonly canonical_url?: string
  readonly summary?: string
  readonly published_at?: string
  readonly observed_at?: string
  readonly last_seen_at?: string
  readonly confidence?: string
  readonly version_label?: string | null
  readonly status?: string
  readonly source_id?: string
  readonly revisions?: readonly UnknownRecord[]
  readonly evidence?: readonly UnknownRecord[]
}

export interface RadarSnapshot {
  readonly snapshot_id: string
  readonly snapshot_date?: string
  readonly published_at?: string
  readonly as_of?: string
  readonly truth?: string
  readonly event_count?: number
  readonly source_success_count?: number
  readonly source_failure_count?: number
  readonly manifest_sha256?: string
  readonly previous_snapshot_id?: string | null
}

export type UnknownRecord = Readonly<Record<string, unknown>>

export class RadarApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'RadarApiError'
    this.status = status
    this.code = code
  }
}

function apiBase(): string {
  const configured = import.meta.env.VITE_RADAR_API_BASE?.trim()
  return (configured || DEFAULT_API_BASE).replace(/\/$/, '')
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function errorMessage(payload: unknown, fallback: string): { message: string; code?: string } {
  if (!isRecord(payload)) return { message: fallback }
  const errors = Array.isArray(payload.errors) ? payload.errors : []
  const first = errors.find(isRecord)
  const message = first?.message_zh_cn ?? first?.message ?? payload.message_zh_cn ?? payload.message
  const code = first?.code ?? payload.code
  return {
    message: typeof message === 'string' && message.trim() ? message : fallback,
    code: typeof code === 'string' ? code : undefined,
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<RadarEnvelope<T>> {
  let response: Response
  try {
    response = await fetch(`${apiBase()}${path}`, {
      ...init,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...init?.headers,
      },
    })
  } catch {
    throw new RadarApiError('无法连接本地真实数据服务，请确认后端服务已启动。', 0, 'NETWORK_UNREACHABLE')
  }

  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = errorMessage(payload, `请求失败（HTTP ${response.status}）`)
    throw new RadarApiError(detail.message, response.status, detail.code)
  }
  if (!isRecord(payload)) {
    throw new RadarApiError('服务返回了无法识别的数据格式。', response.status, 'INVALID_RESPONSE')
  }
  return payload as RadarEnvelope<T>
}

export const radarApi = {
  today: () => request<unknown>('/api/v1/radar/today'),
  events: () => request<unknown>('/api/v1/radar/events?limit=100'),
  event: (eventId: string) => request<unknown>(`/api/v1/radar/events/${encodeURIComponent(eventId)}`),
  history: () => request<unknown>('/api/v1/radar/history'),
  snapshots: () => request<unknown>('/api/v1/radar/history'),
  snapshot: (snapshotId: string) =>
    request<unknown>(`/api/v1/radar/snapshots/${encodeURIComponent(snapshotId)}`),
  sources: () => request<unknown>('/api/v1/radar/sources'),
  sourceQuality: () => request<unknown>('/api/v1/radar/source-quality'),
  trends: () => request<unknown>('/api/v1/radar/trends'),
  openSource: () => request<unknown>('/api/v1/radar/open-source'),
  refresh: () =>
    request<unknown>('/api/v1/radar/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': `web-manual-${typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`,
      },
      body: JSON.stringify({ trigger_kind: 'manual' }),
    }),
}

export function record(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null
}

export function records(value: unknown, preferredKeys: readonly string[] = []): readonly UnknownRecord[] {
  if (Array.isArray(value)) return value.filter(isRecord)
  const source = record(value)
  if (!source) return []
  for (const key of preferredKeys) {
    const candidate = source[key]
    if (Array.isArray(candidate)) return candidate.filter(isRecord)
  }
  for (const key of ['items', 'events', 'snapshots', 'sources', 'results', 'rows', 'history', 'trends']) {
    const candidate = source[key]
    if (Array.isArray(candidate)) return candidate.filter(isRecord)
  }
  return []
}

export function textValue(source: UnknownRecord, ...keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number') return String(value)
  }
  return undefined
}

export function numberValue(source: UnknownRecord, ...keys: readonly string[]): number | undefined {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return undefined
}
