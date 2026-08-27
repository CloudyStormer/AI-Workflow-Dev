const DEFAULT_API_BASE = 'http://127.0.0.1:4318'

export type FactLayer = 'externally-verifiable' | 'user-stated' | 'system-inference' | 'UNKNOWN'

export interface MaterialVersion {
  readonly materialId: string
  readonly versionId: string
  readonly versionNo: number
  readonly bodySha256: string
  readonly unicodeCount: number
  readonly createdAt: string
  readonly metadata: Readonly<Record<string, string | undefined>>
}

export interface ClassificationSuggestion {
  readonly suggestionId: string
  readonly materialId: string
  readonly materialVersionId: string
  readonly sourceChannel: string
  readonly contentType: string
  readonly basis: readonly string[]
  readonly confidence: number
  readonly ruleRevision: string
  readonly status: 'awaiting_confirmation'
}

export interface ClassificationDecision {
  readonly decisionId: string
  readonly revisionNo: number
  readonly sourceChannel: string
  readonly contentType: string
  readonly createdAt: string
}

export interface AnalysisFinding {
  readonly findingId: string
  readonly kind: 'skill' | 'tool' | 'framework' | 'responsibility' | 'project' | 'outcome' | 'unknown'
  readonly label: string
  readonly factLayer: FactLayer
  readonly confidence: number
  readonly ruleRevision: string
  readonly evidence: { readonly snippet: string; readonly startCodepoint: number; readonly endCodepoint: number; readonly relation: 'supports' | 'insufficient' } | null
}

export interface AnalysisRevision {
  readonly analysisRevisionId: string
  readonly materialId: string
  readonly materialVersionId: string
  readonly revisionNo: number
  readonly status: 'completed' | 'uncertain'
  readonly ruleBundleVersion: string
  readonly publicSnapshotId: string | null
  readonly summary: {
    readonly headline: string
    readonly strongestSignals: readonly string[]
    readonly unknownKinds: readonly string[]
    readonly truthNotice: string
  }
  readonly findings: readonly AnalysisFinding[]
  readonly createdAt: string
}

export interface MaterialHistory {
  readonly materialId: string
  readonly currentVersionNo: number
  readonly currentClassificationRevision: number
  readonly currentAnalysisRevision: number
  readonly versions: readonly MaterialVersion[]
  readonly classifications: readonly ClassificationDecision[]
  readonly analyses: readonly AnalysisRevision[]
}

export interface SaveMaterialInput {
  readonly materialId: string
  readonly body: string
  readonly sourceChannel: string
  readonly contentType: string
  readonly metadata: Readonly<Record<string, string | undefined>>
  readonly rightsConfirmation: {
    readonly userHasRights: boolean
    readonly sensitiveDataAcknowledged: boolean
  }
}

export class CareerApiError extends Error {
  constructor(readonly code: string, message: string, readonly status: number) {
    super(message)
    this.name = 'CareerApiError'
  }
}

function baseUrl() {
  return (import.meta.env.VITE_CAREER_API_BASE?.trim() || DEFAULT_API_BASE).replace(/\/$/, '')
}

function key(scope: string) {
  const nonce = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${scope}-${nonce}`
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function unwrap<T>(payload: unknown): T {
  if (!isRecord(payload)) throw new CareerApiError('INVALID_RESPONSE', '服务返回了无法识别的数据格式。', 200)
  if ('data' in payload) return payload.data as T
  return payload as T
}

function message(payload: unknown, fallback: string): { code: string; text: string } {
  if (!isRecord(payload)) return { code: 'REQUEST_FAILED', text: fallback }
  const errors = Array.isArray(payload.errors) ? payload.errors.filter(isRecord) : []
  const first = errors[0]
  const text = first?.message_zh_cn ?? first?.message ?? payload.message_zh_cn ?? payload.message
  const code = first?.code ?? payload.code
  return { code: typeof code === 'string' ? code : 'REQUEST_FAILED', text: typeof text === 'string' ? text : fallback }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${baseUrl()}${path}`, { ...init, cache: 'no-store', headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init?.headers } })
  } catch {
    throw new CareerApiError('NETWORK_UNREACHABLE', '无法连接本地职业分析服务，请确认服务已启动。', 0)
  }
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = message(payload, `请求失败（HTTP ${response.status}）`)
    throw new CareerApiError(detail.code, detail.text, response.status)
  }
  return unwrap<T>(payload)
}

export const careerApi = {
  saveMaterial: (input: SaveMaterialInput) => request<MaterialVersion>('/api/v1/materials', { method: 'POST', headers: { 'Idempotency-Key': key('material') }, body: JSON.stringify({ materialId: input.materialId, body: input.body, storageScope: 'private_user', metadata: { ...input.metadata, sourceChannel: input.sourceChannel, contentType: input.contentType, locale: 'zh-CN', timezone: 'Asia/Shanghai' }, rightsConfirmation: { ...input.rightsConfirmation, policyRevision: 'career-private-rights-1.0.0' }, idempotencyKey: key('material-body') }) }),
  classify: (materialId: string, versionId: string) => request<ClassificationSuggestion>(`/api/v1/materials/${encodeURIComponent(materialId)}:classify`, { method: 'POST', headers: { 'Idempotency-Key': key('classify') }, body: JSON.stringify({ materialId, materialVersionId: versionId, idempotencyKey: key('classify-body') }) }),
  confirmClassification: (input: { readonly materialId: string; readonly versionId: string; readonly sourceChannel: string; readonly contentType: string; readonly expectedRevision: number }) => request<ClassificationDecision>(`/api/v1/materials/${encodeURIComponent(input.materialId)}/classification`, { method: 'PATCH', headers: { 'If-Match': String(input.expectedRevision) }, body: JSON.stringify({ materialId: input.materialId, materialVersionId: input.versionId, sourceChannel: input.sourceChannel, contentType: input.contentType, expectedBaseRevision: input.expectedRevision, reason: '用户在信息源工作台确认' }) }),
  analyze: (input: { readonly materialId: string; readonly versionId: string; readonly classificationDecisionId: string }) => request<AnalysisRevision>(`/api/v1/materials/${encodeURIComponent(input.materialId)}:analyze`, { method: 'POST', headers: { 'Idempotency-Key': key('analyze') }, body: JSON.stringify({ materialId: input.materialId, materialVersionId: input.versionId, classificationDecisionId: input.classificationDecisionId, idempotencyKey: key('analyze-body') }) }),
  history: () => request<readonly MaterialHistory[]>('/api/v1/history'),
  materialHistory: (materialId: string) => request<MaterialHistory>(`/api/v1/materials/${encodeURIComponent(materialId)}/versions`),
}

export function createMaterialId() {
  return `material-${typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now().toString(36)}`
}
