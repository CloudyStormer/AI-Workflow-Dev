import {
  ArrowDown,
  CalendarDays,
  CircleCheck,
  Clock3,
  Info,
  ShieldCheck,
} from 'lucide-react'

import styles from './TodayRadarPage.module.css'

const demoEvent = {
  title: '示例模型 A1 发布兼容性说明',
  organization: '示例厂商 A',
  model: '示例模型 A1',
  occurredAt: '2026年8月4日 17:10（北京时间）',
  summary: '该条目用于验证今日雷达的信息层级，不代表任何真实厂商、模型或外部事件。',
  impact: '演示影响说明：帮助确认标题、状态、时间与摘要在桌面和移动端都能清晰阅读。',
} as const

export function TodayRadarPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="today-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            <CalendarDays size={16} strokeWidth={1.9} aria-hidden="true" />
            今日雷达 · 中性演示
          </p>
          <h1 id="today-title">今天值得关注的 AI 模型事件</h1>
          <p className={styles.intro}>
            先用一条中性演示内容验证浏览、阅读和真实性表达；当前不连接外部来源，也不代表完整日榜。
          </p>
          <a className={styles.primaryAction} href="#today-events">
            查看演示事件
            <ArrowDown size={17} strokeWidth={2} aria-hidden="true" />
          </a>
        </div>

        <aside className={styles.snapshotCard} aria-label="人工快照摘要">
          <div className={styles.snapshotHeading}>
            <span>当前人工快照</span>
            <span className={styles.demoBadge}>演示</span>
          </div>
          <strong className={styles.eventCount}>1 条</strong>
          <span className={styles.eventCountLabel}>中性演示事件</span>
          <dl className={styles.snapshotDetails}>
            <div>
              <dt>截至时间</dt>
              <dd>
                <time dateTime="2026-08-04T17:25:00+08:00">8月4日 17:25</time>
              </dd>
            </div>
            <div>
              <dt>数据方式</dt>
              <dd>人工演示</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section
        id="today-events"
        className={styles.eventsSection}
        aria-labelledby="events-title"
      >
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionEyebrow}>首条可见纵切</p>
            <h2 id="events-title">今日演示事件</h2>
          </div>
          <p className={styles.sectionCount}>共 1 条演示内容</p>
        </div>

        <article className={styles.eventCard} data-demo-event="true">
          <div className={styles.eventMain}>
            <div className={styles.eventBadges} aria-label="事件状态">
              <span className={styles.primaryBadge}>演示事件</span>
              <span className={styles.factBadge}>
                <CircleCheck size={14} strokeWidth={2} aria-hidden="true" />
                事实标签：已确认事实（演示）
              </span>
            </div>

            <h3>{demoEvent.title}</h3>
            <p className={styles.eventIdentity}>
              {demoEvent.organization} <span aria-hidden="true">/</span> {demoEvent.model}
            </p>
            <p className={styles.summary}>{demoEvent.summary}</p>

            <div className={styles.impact}>
              <Info size={18} strokeWidth={1.9} aria-hidden="true" />
              <div>
                <strong>影响说明</strong>
                <p>{demoEvent.impact}</p>
              </div>
            </div>
          </div>

          <aside className={styles.eventMeta} aria-label="演示事件元数据">
            <dl>
              <div>
                <dt>
                  <Clock3 size={15} strokeWidth={1.9} aria-hidden="true" />
                  事件时间
                </dt>
                <dd>
                  <time dateTime="2026-08-04T17:10:00+08:00">
                    {demoEvent.occurredAt}
                  </time>
                </dd>
              </div>
              <div>
                <dt>重要性</dt>
                <dd>中（演示）</dd>
              </div>
              <div>
                <dt>置信度</dt>
                <dd>中（演示）</dd>
              </div>
              <div>
                <dt>
                  <ShieldCheck size={15} strokeWidth={1.9} aria-hidden="true" />
                  来源状态
                </dt>
                <dd>不连接外部来源</dd>
              </div>
            </dl>
          </aside>
        </article>

        <p className={styles.scopeNote}>
          当前只展示一条中性演示事件。完整日榜、证据链、筛选与日期切换属于后续任务。
        </p>
      </section>
    </div>
  )
}
