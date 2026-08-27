import { CalendarDays, DatabaseZap, RefreshCcw, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { radarApi, record, records, textValue } from '../../api/radar'
import { useRadarResource } from '../../api/useRadarResource'
import { EventCard, LoadBoundary, Metric, PageHeader, StatusPanel, TruthBar } from '../../components/RadarUi'
import styles from './TodayRadarPage.module.css'

export function TodayRadarPage() {
  const resource = useRadarResource(radarApi.today)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null)
  const events = records(resource.data?.data, ['events', 'items'])
  const truth = resource.data?.truth ?? 'not_ready'
  const snapshotDate = resource.data?.as_of?.slice(0, 10)
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date())
  const isHistorical = Boolean(snapshotDate && snapshotDate !== today)

  async function refresh() {
    setRefreshing(true)
    setRefreshMessage(null)
    try {
      const result = await radarApi.refresh()
      const outcome = record(result.data)
      const status = outcome ? textValue(outcome, 'status', 'truth') : undefined
      setRefreshMessage(status === 'failed' ? '刷新未发布新快照，已保留最近安全内容。' : '刷新请求已完成，正在读取最新快照。')
      await resource.reload()
    } catch (error) {
      setRefreshMessage(error instanceof Error ? error.message : '刷新失败，已保留最近安全内容。')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className={styles.page}>
      <TruthBar envelope={resource.data} loading={resource.loading} failed={Boolean(resource.error)} />
      <PageHeader eyebrow="真实快照 · Asia/Shanghai" title={isHistorical ? '最近成功的 AI 模型事件' : '今日 AI 模型雷达'} summary={isHistorical ? `当前没有 ${today} 的成功快照，以下内容属于 ${snapshotDate} 历史记录。` : '仅展示后端已持久化并发布的真实快照，不读取静态文件或浏览器缓存。'} actions={<button type="button" onClick={() => void refresh()} disabled={refreshing}><RefreshCcw size={16} aria-hidden="true" />{refreshing ? '刷新中…' : '请求刷新'}</button>} />
      {refreshMessage ? <p className={styles.refreshMessage} role="status">{refreshMessage}</p> : null}
      <LoadBoundary loading={resource.loading} error={resource.error} onRetry={() => void resource.reload()}>
        {truth === 'not_ready' && events.length === 0 ? <StatusPanel title="真实快照尚未就绪" detail="后端已响应，但当前没有可读取的已发布快照。请查看来源与质量，确认数据库、来源运行和发布链。" action={<Link to="/sources">查看来源与质量</Link>} /> : truth === 'empty' || events.length === 0 ? <StatusPanel title={truth === 'failed' ? '刷新失败，且没有安全快照可读' : '当前快照没有符合标准的事件'} detail="这里不会使用旧演示卡片补位。可查看历史快照或来源运行状态。" action={<Link to="/history">查看历史快照</Link>} /> : <><section className={styles.metrics} aria-label="快照摘要"><Metric icon={<DatabaseZap size={19} />} label="已发布事件" value={events.length} /><Metric icon={<CalendarDays size={19} />} label="快照日期" value={snapshotDate ?? '未知'} /><Metric icon={<ShieldCheck size={19} />} label="成功来源" value={`${resource.data?.coverage?.succeeded ?? '—'} / ${resource.data?.coverage?.runtime_enabled ?? '—'}`} /></section><section className={styles.events} aria-labelledby="today-events-title"><div className={styles.sectionHeading}><h2 id="today-events-title">{isHistorical ? '历史快照事件' : '今日已发布事件'}</h2><Link to="/events">查看全部事件</Link></div><div className={styles.eventGrid}>{events.map((event, index) => <EventCard key={String(event.event_id ?? index)} event={event} />)}</div></section></>}
      </LoadBoundary>
    </div>
  )
}
