import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  LoaderCircle,
  RefreshCcw,
  ServerOff,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import type { RadarEnvelope, TruthState, UnknownRecord } from '../api/radar'
import { textValue } from '../api/radar'
import styles from './RadarUi.module.css'

const truthCopy: Record<TruthState, { label: string; detail: string }> = {
  loading: { label: '正在读取真实数据', detail: '正在连接本地服务并核对已发布快照。' },
  live: { label: '真实数据已发布', detail: '当前内容来自后端持久化的已发布快照。' },
  empty: { label: '本日无符合标准的事件', detail: '查询成功，当前快照中没有符合条件的记录。' },
  not_ready: { label: '数据尚未就绪', detail: '真实查询链尚未形成可读取的已发布快照。' },
  stale: { label: '当前仅有历史快照', detail: '展示的是最近成功记录，不会被标成今天。' },
  degraded: { label: '部分来源失败', detail: '已保留可核验内容，同时明确展示来源缺口。' },
  failed: { label: '本次读取或刷新失败', detail: '未用演示数据替代；最近安全快照如可用仍会保留。' },
  no_new_items: { label: '本次刷新无新增', detail: '当前快照保持不变，可继续查看历史。' },
  refreshing: { label: '正在刷新', detail: '刷新正在进行，旧快照在新快照安全发布前保持可读。' },
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '尚无记录'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(parsed)
}

export function truthState(envelope?: RadarEnvelope<unknown> | null, loading = false, failed = false): TruthState {
  if (loading) return 'loading'
  if (failed) return 'failed'
  return envelope?.truth ?? 'not_ready'
}

export function TruthBar({ envelope, loading = false, failed = false }: {
  readonly envelope?: RadarEnvelope<unknown> | null
  readonly loading?: boolean
  readonly failed?: boolean
}) {
  const state = truthState(envelope, loading, failed)
  const copy = truthCopy[state]
  const coverage = envelope?.coverage
  const icon = state === 'live' ? <CheckCircle2 /> : state === 'loading' || state === 'refreshing' ? <LoaderCircle className={styles.spin} /> : state === 'failed' || state === 'degraded' ? <AlertTriangle /> : <ServerOff />

  return (
    <section className={`${styles.truthBar} ${styles[`truth_${state}`]}`} aria-label={`数据状态：${copy.label}`} aria-live="polite" role="status">
      <div className={styles.truthLead}>
        <span className={styles.truthIcon} aria-hidden="true">{icon}</span>
        <div>
          <strong>{copy.label}</strong>
          <p>{copy.detail}</p>
        </div>
      </div>
      <dl className={styles.truthFacts}>
        <div><dt>数据模式</dt><dd>{envelope?.data_mode === 'live' ? '真实服务' : '未就绪'}</dd></div>
        <div><dt>快照</dt><dd>{envelope?.snapshot_id ?? '无已发布快照'}</dd></div>
        <div><dt>数据截至</dt><dd>{formatDateTime(envelope?.as_of)}</dd></div>
        <div><dt>最近成功</dt><dd>{formatDateTime(envelope?.last_success_at)}</dd></div>
        <div><dt>来源运行</dt><dd>{coverage?.succeeded ?? '—'} / {coverage?.runtime_enabled ?? '—'}</dd></div>
        <div><dt>失败来源</dt><dd>{coverage?.blocked ?? '—'}</dd></div>
      </dl>
    </section>
  )
}

export function PageHeader({ eyebrow, title, summary, actions }: {
  readonly eyebrow: string
  readonly title: string
  readonly summary: string
  readonly actions?: ReactNode
}) {
  return (
    <header className={styles.pageHeader}>
      <div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1>{title}</h1>
        <p className={styles.summary}>{summary}</p>
      </div>
      {actions ? <div className={styles.headerActions}>{actions}</div> : null}
    </header>
  )
}

export function LoadBoundary({ loading, error, onRetry, children }: {
  readonly loading: boolean
  readonly error: Error | null
  readonly onRetry: () => void
  readonly children: ReactNode
}) {
  if (loading) {
    return <StatusPanel icon={<LoaderCircle className={styles.spin} />} title="正在读取真实数据" detail="正在连接本地 API，不会回退到演示内容。" />
  }
  if (error) {
    return <StatusPanel tone="danger" icon={<AlertTriangle />} title="真实数据读取失败" detail={error.message} action={<button type="button" onClick={onRetry}><RefreshCcw size={16} />重新连接</button>} />
  }
  return <>{children}</>
}

export function StatusPanel({ icon, title, detail, action, tone = 'neutral' }: {
  readonly icon?: ReactNode
  readonly title: string
  readonly detail: string
  readonly action?: ReactNode
  readonly tone?: 'neutral' | 'danger' | 'warning'
}) {
  return (
    <section className={`${styles.statusPanel} ${styles[`status_${tone}`]}`} role="status">
      <span aria-hidden="true">{icon ?? <Database />}</span>
      <div><h2>{title}</h2><p>{detail}</p>{action ? <div className={styles.statusAction}>{action}</div> : null}</div>
    </section>
  )
}

export function EventCard({ event }: { readonly event: UnknownRecord }) {
  const id = textValue(event, 'event_id', 'id') ?? 'unknown-event'
  const title = textValue(event, 'title', 'title_zh_cn') ?? '未命名事件'
  const publisher = textValue(event, 'publisher', 'organization') ?? '发布方未知'
  const summary = textValue(event, 'summary', 'fact_summary', 'description') ?? '服务未提供摘要。'
  const href = textValue(event, 'canonical_url', 'url')
  const publishedAt = textValue(event, 'published_at', 'occurred_at')
  const category = textValue(event, 'category', 'event_kind') ?? '未分类'
  const status = textValue(event, 'status', 'release_status') ?? '事实记录'
  return (
    <article className={styles.eventCard}>
      <div className={styles.badges}><span>{category}</span><span>{status}</span></div>
      <h2><Link to={`/events/${encodeURIComponent(id)}`}>{title}</Link></h2>
      <p className={styles.identity}>{publisher}{publishedAt ? ` · ${formatDateTime(publishedAt)}` : ''}</p>
      <p>{summary}</p>
      <div className={styles.cardActions}>
        <Link to={`/events/${encodeURIComponent(id)}`}>查看证据与修订</Link>
        {href ? <a href={href} target="_blank" rel="noreferrer">打开原始来源（新标签页）</a> : <span>原始来源未提供</span>}
      </div>
    </article>
  )
}

export function DataTable({ caption, rows, columns }: {
  readonly caption: string
  readonly rows: readonly UnknownRecord[]
  readonly columns: readonly { readonly key: string; readonly label: string; readonly render?: (row: UnknownRecord) => ReactNode }[]
}) {
  return (
    <div className={styles.tableScroll} tabIndex={0} aria-label={`${caption}，可横向滚动`}>
      <table className={styles.table}>
        <caption>{caption}</caption>
        <thead><tr>{columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={textValue(row, 'id', 'event_id', 'snapshot_id', 'source_id') ?? String(index)}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : textValue(row, column.key) ?? '—'}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

export function Metric({ label, value, icon }: { readonly label: string; readonly value: ReactNode; readonly icon?: ReactNode }) {
  return <div className={styles.metric}>{icon ? <span aria-hidden="true">{icon}</span> : null}<div><span>{label}</span><strong>{value}</strong></div></div>
}

export function TimeFact({ label, value }: { readonly label: string; readonly value?: string | null }) {
  return <div className={styles.timeFact}><dt><Clock3 size={14} aria-hidden="true" />{label}</dt><dd>{formatDateTime(value)}</dd></div>
}
