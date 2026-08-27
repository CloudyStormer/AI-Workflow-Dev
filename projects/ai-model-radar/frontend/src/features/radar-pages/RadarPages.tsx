import { ArrowLeft, ExternalLink, History, Network, PackageOpen, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'

import { radarApi, numberValue, record, records, textValue, type RadarEnvelope } from '../../api/radar'
import { useRadarResource } from '../../api/useRadarResource'
import { DataTable, EventCard, formatDateTime, LoadBoundary, Metric, PageHeader, StatusPanel, TimeFact, TruthBar } from '../../components/RadarUi'
import styles from './RadarPages.module.css'

function PageFrame({ envelope, loading, error, title, eyebrow, summary, children }: { readonly envelope: RadarEnvelope<unknown> | null; readonly loading: boolean; readonly error: Error | null; readonly title: string; readonly eyebrow: string; readonly summary: string; readonly children: ReactNode }) {
  return <div className={styles.page}><TruthBar envelope={envelope} loading={loading} failed={Boolean(error)} /><PageHeader eyebrow={eyebrow} title={title} summary={summary} />{children}</div>
}

export function EventsPage() {
  const resource = useRadarResource(radarApi.events)
  const items = records(resource.data?.data, ['events', 'items'])
  return <PageFrame envelope={resource.data} loading={resource.loading} error={resource.error} eyebrow="不可变快照内检索" title="全部事件" summary="事件列表绑定当前后端快照；接口失败时不会回退演示内容。"><LoadBoundary loading={resource.loading} error={resource.error} onRetry={() => void resource.reload()}>{items.length ? <div className={styles.cards}>{items.map((item, index) => <EventCard key={textValue(item, 'event_id', 'id') ?? String(index)} event={item} />)}</div> : <StatusPanel title="没有可显示的事件" detail="当前真实查询结果为空。请查看快照日期、来源状态或历史记录。" />}</LoadBoundary></PageFrame>
}

export function EventDetailPage() {
  const { eventId = '' } = useParams()
  const resource = useRadarResource(() => radarApi.event(eventId))
  const eventPayload = record(resource.data?.data)
  const item = record(eventPayload?.event) ?? eventPayload
  const revisions = records(item?.revisions)
  const evidence = records(item?.evidence)
  const title = item ? textValue(item, 'title', 'title_zh_cn') ?? '事件详情' : '事件详情'
  const sourceUrl = item ? textValue(item, 'canonical_url', 'url') : undefined
  const hostname = sourceUrl ? safeHostname(sourceUrl) : null
  return <PageFrame envelope={resource.data} loading={resource.loading} error={resource.error} eyebrow="事实、证据与修订" title={title} summary="详情按服务端事件身份读取，事实、来源证据和修订历史分区呈现。"><LoadBoundary loading={resource.loading} error={resource.error} onRetry={() => void resource.reload()}>{item ? <><Link className={styles.backLink} to="/events"><ArrowLeft size={16} />返回全部事件</Link><section className={styles.detailGrid}><article className={styles.detailCard}><h2>发生了什么</h2><p>{textValue(item, 'summary', 'fact_summary', 'description') ?? '服务未提供事实摘要。'}</p><h2>开发者影响</h2><p>{textValue(item, 'developer_impact', 'impact') ?? '当前记录未提供独立影响评估。'}</p>{sourceUrl ? <a className={styles.external} href={sourceUrl} target="_blank" rel="noreferrer">打开 {hostname ?? '原始来源'}（新标签页）<ExternalLink size={15} /></a> : null}</article><aside className={styles.detailCard}><h2>时间与身份</h2><dl className={styles.factList}><TimeFact label="发布时间" value={textValue(item, 'published_at')} /><TimeFact label="观测时间" value={textValue(item, 'observed_at', 'collected_at')} /><TimeFact label="最近出现" value={textValue(item, 'last_seen_at')} /><div><dt>事件 ID</dt><dd>{textValue(item, 'event_id', 'id') ?? '—'}</dd></div><div><dt>发布方</dt><dd>{textValue(item, 'publisher') ?? '—'}</dd></div><div><dt>置信度</dt><dd>{textValue(item, 'confidence') ?? '—'}</dd></div></dl></aside></section><section><h2>证据清单</h2>{evidence.length ? <DataTable caption="事件证据等价表" rows={evidence} columns={[{ key: 'source_id', label: '来源' }, { key: 'evidence_kind', label: '证据角色' }, { key: 'fact_or_assessment', label: '事实分层' }, { key: 'confidence', label: '置信度' }, { key: 'collected_at', label: '取得时间', render: (row) => formatDateTime(textValue(row, 'collected_at')) }]} /> : <StatusPanel title="尚无证据记录" detail="服务没有返回该事件的证据关系。" />}</section><section><h2>修订历史</h2>{revisions.length ? <DataTable caption="事件修订等价表" rows={revisions} columns={[{ key: 'revision', label: '修订号' }, { key: 'revision_reason', label: '原因' }, { key: 'observed_at', label: '观测时间', render: (row) => formatDateTime(textValue(row, 'observed_at')) }, { key: 'payload_sha256', label: '内容指纹' }]} /> : <StatusPanel title="仅有当前版本" detail="服务未返回追加修订。" />}</section></> : <StatusPanel title="未找到该事件" detail="后端没有返回可识别的事件详情。" />}</LoadBoundary></PageFrame>
}

function safeHostname(value: string): string | null {
  try { return new URL(value).hostname } catch { return null }
}

export function HistoryPage() {
  const resource = useRadarResource(radarApi.history)
  const snapshots = records(resource.data?.data, ['snapshots', 'history', 'items'])
  return <PageFrame envelope={resource.data} loading={resource.loading} error={resource.error} eyebrow="只追加 · 不覆盖" title="历史快照" summary="按自然日回看不可变快照；无快照不等于零事件。"><LoadBoundary loading={resource.loading} error={resource.error} onRetry={() => void resource.reload()}>{snapshots.length ? <DataTable caption="历史快照等价表" rows={snapshots} columns={[{ key: 'snapshot_date', label: '自然日' }, { key: 'snapshot_id', label: '快照 ID', render: (row) => { const id = textValue(row, 'snapshot_id', 'id'); return id ? <Link to={`/snapshots/${encodeURIComponent(id)}`}>{id}</Link> : '—' } }, { key: 'event_count', label: '事件数' }, { key: 'published_at', label: '发布时间', render: (row) => formatDateTime(textValue(row, 'published_at')) }, { key: 'truth', label: '状态' }]} /> : <StatusPanel icon={<History />} title="尚无历史快照" detail="真实服务没有返回可回看的已发布快照。" />}</LoadBoundary></PageFrame>
}

export function SnapshotPage() {
  const { snapshotId = '' } = useParams()
  const resource = useRadarResource(() => radarApi.snapshot(snapshotId))
  const snapshotPayload = record(resource.data?.data)
  const snapshot = record(snapshotPayload?.snapshot) ?? snapshotPayload
  const items = records(snapshot, ['events', 'items'])
  return <PageFrame envelope={resource.data} loading={resource.loading} error={resource.error} eyebrow="不可变发布记录" title="快照详情" summary="展示快照元数据、来源覆盖和固定事件集合；不提供编辑或设为当前操作。"><LoadBoundary loading={resource.loading} error={resource.error} onRetry={() => void resource.reload()}>{snapshot ? <><section className={styles.metrics}><Metric label="快照 ID" value={textValue(snapshot, 'snapshot_id', 'id') ?? snapshotId} /><Metric label="事件数" value={numberValue(snapshot, 'event_count') ?? items.length} /><Metric label="发布状态" value={textValue(snapshot, 'truth', 'status') ?? '—'} /></section><DataTable caption="快照元数据" rows={[snapshot]} columns={[{ key: 'snapshot_date', label: '自然日' }, { key: 'as_of', label: '数据截至', render: (row) => formatDateTime(textValue(row, 'as_of')) }, { key: 'published_at', label: '发布时间', render: (row) => formatDateTime(textValue(row, 'published_at')) }, { key: 'manifest_sha256', label: '内容指纹' }, { key: 'previous_snapshot_id', label: '前一快照' }]} />{items.length ? <div className={styles.cards}>{items.map((item, index) => <EventCard key={textValue(item, 'event_id', 'id') ?? String(index)} event={item} />)}</div> : null}</> : <StatusPanel title="未找到快照" detail="服务没有返回该快照的不可变记录。" />}</LoadBoundary></PageFrame>
}

export function SourcesPage() {
  const resource = useRadarResource(radarApi.sources)
  const quality = useRadarResource(radarApi.sourceQuality)
  const sources = records(resource.data?.data, ['sources', 'items'])
  return <PageFrame envelope={resource.data} loading={resource.loading} error={resource.error} eyebrow="政策允许 ≠ 运行成功" title="来源与质量" summary="来源政策、运行状态、水位和失败原因分轴展示，不用单一绿灯概括。"><LoadBoundary loading={resource.loading || quality.loading} error={resource.error ?? quality.error} onRetry={() => { void resource.reload(); void quality.reload() }}>{sources.length ? <DataTable caption="真实来源运行状态" rows={sources} columns={[{ key: 'name', label: '来源' }, { key: 'region', label: '地区' }, { key: 'source_kind', label: '类型' }, { key: 'runtime_enabled', label: '运行启用', render: (row) => row.runtime_enabled === 1 || row.runtime_enabled === true ? '已启用' : '未启用' }, { key: 'last_outcome', label: '最近结果' }, { key: 'last_success_at', label: '最近成功', render: (row) => formatDateTime(textValue(row, 'last_success_at')) }, { key: 'safe_error', label: '安全错误' }]} /> : <StatusPanel icon={<Network />} title="尚无来源运行记录" detail="后端没有返回真实来源目录或运行水位；不会据此计算虚构成功率。" />}</LoadBoundary></PageFrame>
}

export function TrendsPage() {
  const resource = useRadarResource(radarApi.trends)
  const rows = records(resource.data?.data, ['points', 'trends', 'items'])
  return <PageFrame envelope={resource.data} loading={resource.loading} error={resource.error} eyebrow="已接入来源样本" title="趋势与版本" summary="趋势只统计真实服务样本，并提供与图形同源的完整等价表。"><LoadBoundary loading={resource.loading} error={resource.error} onRetry={() => void resource.reload()}>{rows.length ? <><section className={styles.metrics}><Metric icon={<TrendingUp />} label="有记录日期" value={rows.length} /><Metric label="样本总数" value={rows.reduce((sum, row) => sum + (numberValue(row, 'event_count') ?? 0), 0)} /><Metric label="数据截至" value={formatDateTime(resource.data?.as_of)} /></section><DataTable caption="趋势数据等价表" rows={rows} columns={[{ key: 'date', label: '日期' }, { key: 'event_count', label: '事件数' }, { key: 'source_count', label: '来源数' }]} /></> : <StatusPanel icon={<TrendingUp />} title="尚无趋势样本" detail="真实事件记录不足时不绘制趋势线。" />}</LoadBoundary></PageFrame>
}

export function OpenSourcePage() {
  const resource = useRadarResource(radarApi.openSource)
  const rows = records(resource.data?.data, ['events', 'releases', 'items'])
  return <PageFrame envelope={resource.data} loading={resource.loading} error={resource.error} eyebrow="版本、Tag 与开放语义" title="开源与发布" summary="仅展示后端标识为开源发布的真实记录，版本和许可证未知时保持未知。"><LoadBoundary loading={resource.loading} error={resource.error} onRetry={() => void resource.reload()}>{rows.length ? <div className={styles.cards}>{rows.map((row, index) => <EventCard key={textValue(row, 'event_id', 'id') ?? String(index)} event={row} />)}</div> : <StatusPanel icon={<PackageOpen />} title="尚无开源发布记录" detail="当前真实服务未返回符合条件的开源发布。" />}</LoadBoundary></PageFrame>
}
