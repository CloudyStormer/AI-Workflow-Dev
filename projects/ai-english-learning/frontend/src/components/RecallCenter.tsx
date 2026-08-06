import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'

export type RecallCenterView = 'queue' | 'detail' | 'settings'

export type RecallQueueGroup =
  | 'overdue'
  | 'due-today'
  | 'same-day'
  | 'paused'
  | 'exception'

export type RecallStage = 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'M1'

export type RecallStageStatus =
  | 'completed'
  | 'current'
  | 'upcoming'
  | 'overdue'
  | 'paused'
  | 'exception'

export type RecallResult =
  | 'clean-independent-correct'
  | 'assisted-correct'
  | 'correct-after-reveal'
  | 'revealed'
  | 'submitted-incorrect'
  | 'same-day-correct'
  | 'mastered'
  | 'maintenance-correct'
  | 'skipped'
  | 'paused'
  | 'resumed'
  | 'reset'
  | 'data-exception'

export type RecallHistoryEntry = {
  id: string
  occurredAtLabel: string
  timezoneLabel: string
  title: string
  description: string
  result?: RecallResult
  stageBefore?: RecallStage
  stageAfter?: RecallStage
  nextDueLabel?: string
  assistanceLabel?: string
  inputSnapshot?: string
}

export type RecallStageNode = {
  stage: RecallStage
  label: string
  status: RecallStageStatus
  dateLabel?: string
}

export type RecallItem = {
  id: string
  word: string
  meaning: string
  group: RecallQueueGroup
  stage: RecallStage
  stageLabel: string
  reason: string
  dueLabel: string
  nextDueLabel?: string
  recentResultLabel?: string
  pausedUntilLabel?: string
  exceptionMessage?: string
  startDisabled?: boolean
  startDisabledLabel?: string
  stageTimeline?: readonly RecallStageNode[]
  history: readonly RecallHistoryEntry[]
}

export type RecallSummary = {
  overdueCount: number
  dueTodayCount: number
  sameDayCount: number
  sameDayReadyCount: number
  sameDayWaitingCount: number
  remainingOverdueCount: number
  remainingDueTodayCount: number
  independentCorrectCount: number
  settledIndependentAttemptCount: number
  anomalyCount: number
  isOffline: boolean
}

export type NotificationPermissionState =
  | 'not-requested'
  | 'granted'
  | 'denied'
  | 'unsupported'

export type ExternalNotificationMode = 'browser-ready' | 'in-app-only'

export type RecallTimezoneOption = {
  value: string
  label: string
}

export type RecallReminderSettings = {
  enabled: boolean
  time: string
  quietStart: string
  quietEnd: string
  timezone: string
  timezoneOptions: readonly RecallTimezoneOption[]
  permission: NotificationPermissionState
  externalNotificationMode: ExternalNotificationMode
  statusText: string
}

export type RecallTimezoneChange = {
  learningTimezone: string
  learningTimezoneLabel: string
  deviceTimezone: string
  deviceTimezoneLabel: string
}

export type RecallDialogState = {
  open: boolean
  view: RecallCenterView
  selectedItemId: string | null
  resetConfirmationItemId: string | null
}

export type RecallCenterActions = {
  onStartReview: () => void
  onViewQueue: () => void
  onClose: () => void
  onViewChange: (view: RecallCenterView) => void
  onSelectItem: (itemId: string) => void
  onStartItem: (itemId: string) => void
  onSkipItem: (itemId: string) => void
  onPauseItem: (itemId: string, learningDays: 1 | 3 | 7 | 30) => void
  onResumeItem: (itemId: string) => void
  onRequestReset: (itemId: string) => void
  onCancelReset: () => void
  onConfirmReset: (itemId: string) => void
  onReminderChange: (settings: RecallReminderSettings) => void
  onKeepLearningTimezone: () => void
  onSwitchToDeviceTimezone: () => void
  onDeferTimezoneChange: () => void
}

export type RecallCenterProps = {
  summary: RecallSummary
  items: readonly RecallItem[]
  dialog: RecallDialogState
  reminder: RecallReminderSettings
  actions: RecallCenterActions
  timezoneChange?: RecallTimezoneChange | null
  statusMessage?: string
  title?: string
  truthBoundaryText?: string
}

const STAGES: readonly Omit<RecallStageNode, 'status'>[] = [
  { stage: 'S0', label: '薄弱待加固' },
  { stage: 'S1', label: '次日回忆' },
  { stage: 'S2', label: '短期间隔' },
  { stage: 'S3', label: '周期检查' },
  { stage: 'S4', label: '掌握检查' },
  { stage: 'M1', label: '30 天维护' },
]

const QUEUE_GROUPS: readonly {
  key: Extract<RecallQueueGroup, 'overdue' | 'due-today' | 'same-day'>
  title: string
  description: string
}[] = [
  { key: 'overdue', title: '逾期复习', description: '优先完成已经到期的复习' },
  { key: 'due-today', title: '今日到期', description: '今天需要完成的跨日复习' },
  { key: 'same-day', title: '今日加固', description: '今天答错或查看答案后安排的再次练习' },
]

const PAUSE_DAYS = [1, 3, 7, 30] as const

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getIndependentCorrectRate(summary: RecallSummary) {
  if (summary.settledIndependentAttemptCount <= 0) return null

  return Math.round(
    (summary.independentCorrectCount / summary.settledIndependentAttemptCount) * 100,
  )
}

function getStageStatusLabel(status: RecallStageStatus) {
  const labels: Record<RecallStageStatus, string> = {
    completed: '已完成',
    current: '当前阶段',
    upcoming: '未到期',
    overdue: '已逾期',
    paused: '已暂停',
    exception: '记录异常',
  }
  return labels[status]
}

function getPermissionText(
  permission: NotificationPermissionState,
  externalMode: ExternalNotificationMode,
) {
  if (externalMode === 'browser-ready') {
    return '浏览器通知权限已允许；系统只记录通知请求，不会把请求伪装成已经送达。'
  }
  if (externalMode === 'in-app-only') {
    return '当前仅在页面内展示真实待复习状态，不会发送外部通知。'
  }

  switch (permission) {
    case 'granted':
      return '浏览器通知权限已允许，但外部通知通道仍待接入。'
    case 'denied':
      return '系统通知未授权；应用内待复习仍会正常显示。'
    case 'unsupported':
      return '当前平台不支持外部通知，页面内待复习状态仍会正常显示。'
    case 'not-requested':
      return '外部通知待接入；当前不会请求系统通知权限，页面内待复习状态仍会正常显示。'
  }
}

function getDefaultTimeline(item: RecallItem): readonly RecallStageNode[] {
  const currentIndex = STAGES.findIndex((node) => node.stage === item.stage)

  return STAGES.map((node, index) => ({
    ...node,
    status: index < currentIndex ? 'completed' : index === currentIndex ? 'current' : 'upcoming',
    dateLabel: index === currentIndex ? item.dueLabel : undefined,
  }))
}

function getResultLabel(result: RecallResult | undefined) {
  switch (result) {
    case 'clean-independent-correct':
      return '独立拼写正确'
    case 'assisted-correct':
      return '辅助练习答对'
    case 'correct-after-reveal':
      return '查看后练习答对'
    case 'revealed':
      return '已查看答案'
    case 'submitted-incorrect':
      return '需要再巩固'
    case 'same-day-correct':
      return '今日加固完成'
    case 'mastered':
      return '达到当前掌握标准'
    case 'maintenance-correct':
      return '维护复习完成'
    case 'skipped':
      return '已跳过'
    case 'paused':
      return '已暂停'
    case 'resumed':
      return '已恢复'
    case 'reset':
      return '已重置掌握进度'
    case 'data-exception':
      return '记录异常'
    case undefined:
      return null
  }
}

type ItemActionsProps = {
  item: RecallItem
  isOffline: boolean
  actions: RecallCenterActions
  showDetailAction?: boolean
}

function ItemActions({ item, isOffline, actions, showDetailAction = true }: ItemActionsProps) {
  const isPaused = item.group === 'paused'
  const hasException = item.group === 'exception'
  const writeActionDisabled = isOffline || hasException || item.startDisabled

  return (
    <div className="recall-item-actions" aria-label={`${item.word} 的复习操作`}>
      {!isPaused && (
        <button
          type="button"
          className="recall-item-actions__start"
          disabled={writeActionDisabled}
          onClick={() => actions.onStartItem(item.id)}
        >
          {isOffline ? '联网后开始' : item.startDisabledLabel ?? '开始本题'}
        </button>
      )}

      {showDetailAction && (
        <button
          type="button"
          className="recall-item-actions__detail"
          onClick={() => {
            actions.onSelectItem(item.id)
            actions.onViewChange('detail')
          }}
        >
          查看详情
        </button>
      )}

      {!isPaused && !hasException && (
        <button
          type="button"
          className="recall-item-actions__skip"
          disabled={isOffline}
          onClick={() => actions.onSkipItem(item.id)}
        >
          跳过本题
        </button>
      )}

      {isPaused ? (
        <button
          type="button"
          className="recall-item-actions__resume"
          disabled={isOffline}
          onClick={() => actions.onResumeItem(item.id)}
        >
          提前恢复
        </button>
      ) : (
        !hasException && (
          <fieldset className="recall-item-actions__pause-options" disabled={isOffline}>
            <legend>暂停学习项</legend>
            {PAUSE_DAYS.map((days) => (
              <button
                key={days}
                type="button"
                className="recall-item-actions__pause"
                onClick={() => actions.onPauseItem(item.id, days)}
              >
                {days} 个学习日
              </button>
            ))}
          </fieldset>
        )
      )}

      {!hasException && (
        <button
          type="button"
          className="recall-item-actions__reset"
          disabled={isOffline}
          onClick={() => actions.onRequestReset(item.id)}
        >
          重置掌握进度
        </button>
      )}
    </div>
  )
}

type QueueItemCardProps = {
  item: RecallItem
  isOffline: boolean
  actions: RecallCenterActions
}

function QueueItemCard({ item, isOffline, actions }: QueueItemCardProps) {
  return (
    <article className={`recall-queue-item recall-queue-item--${item.group}`}>
      <div className="recall-queue-item__heading">
        <h4>{item.word}</h4>
        <p>{item.meaning}</p>
      </div>
      <dl className="recall-queue-item__meta">
        <div>
          <dt>当前阶段</dt>
          <dd>{item.stage} · {item.stageLabel}</dd>
        </div>
        <div>
          <dt>复习原因</dt>
          <dd>{item.reason}</dd>
        </div>
        <div>
          <dt>到期状态</dt>
          <dd>{item.dueLabel}</dd>
        </div>
        {item.recentResultLabel && (
          <div>
            <dt>最近结果</dt>
            <dd>{item.recentResultLabel}</dd>
          </div>
        )}
        {item.pausedUntilLabel && (
          <div>
            <dt>恢复时间</dt>
            <dd>{item.pausedUntilLabel}</dd>
          </div>
        )}
      </dl>
      {item.exceptionMessage && (
        <p className="recall-queue-item__exception" role="status">
          记录异常：{item.exceptionMessage}。这条记录不会计错或推进阶段。
        </p>
      )}
      <ItemActions item={item} isOffline={isOffline} actions={actions} />
    </article>
  )
}

type QueueViewProps = {
  items: readonly RecallItem[]
  summary: RecallSummary
  actions: RecallCenterActions
}

function QueueView({ items, summary, actions }: QueueViewProps) {
  const activeQueueItems = items.filter((item) => (
    item.group === 'overdue' || item.group === 'due-today' || item.group === 'same-day'
  ))
  const pausedItems = items.filter((item) => item.group === 'paused')
  const exceptionItems = items.filter((item) => item.group === 'exception')

  return (
    <section
      id="recall-center-panel-queue"
      className="recall-center-panel recall-center-panel--queue"
      role="tabpanel"
      aria-labelledby="recall-center-tab-queue"
    >
      <header className="recall-center-panel__header">
        <h3>待复习队列</h3>
        <p>按“逾期、今日到期、今日加固”的顺序安排，不会把剩余逾期伪装成已完成。</p>
      </header>

      {summary.isOffline && (
        <p className="recall-center-state recall-center-state--offline" role="status">
          当前离线。你仍可查看真实队列，但不能结算、跳过、暂停、恢复或重置。
        </p>
      )}

      {summary.remainingOverdueCount > 0 && (
        <p className="recall-center-state recall-center-state--overflow">
          今天先呈现 20 个，另有 {summary.remainingOverdueCount} 个仍处于逾期；完成后可主动继续。
        </p>
      )}

      {summary.remainingDueTodayCount > 0 && (
        <p className="recall-center-state recall-center-state--overflow">
          当前列表之外还有 {summary.remainingDueTodayCount} 个今日到期；完成后可主动继续。
        </p>
      )}

      {activeQueueItems.length === 0 && (
        <div className="recall-center-empty">
          <h4>今天没有到期复习</h4>
          <p>可以继续普通学习；系统不会生成虚假任务来维持活跃度。</p>
        </div>
      )}

      {QUEUE_GROUPS.map((group) => {
        const groupedItems = items.filter((item) => item.group === group.key)
        if (groupedItems.length === 0) return null

        return (
          <section
            key={group.key}
            className={`recall-queue-group recall-queue-group--${group.key}`}
            aria-labelledby={`recall-queue-group-${group.key}`}
          >
            <header className="recall-queue-group__header">
              <h4 id={`recall-queue-group-${group.key}`}>
                {group.title} · {groupedItems.length} 个
              </h4>
              <p>{group.description}</p>
            </header>
            <div className="recall-queue-group__items">
              {groupedItems.map((item) => (
                <QueueItemCard
                  key={item.id}
                  item={item}
                  isOffline={summary.isOffline}
                  actions={actions}
                />
              ))}
            </div>
          </section>
        )
      })}

      {pausedItems.length > 0 && (
        <section className="recall-queue-group recall-queue-group--paused" aria-labelledby="recall-paused-title">
          <header className="recall-queue-group__header">
            <h4 id="recall-paused-title">已暂停 · {pausedItems.length} 个</h4>
            <p>暂停期间不出题、不触发该词提醒，也不会补造暂停期复习。</p>
          </header>
          {pausedItems.map((item) => (
            <QueueItemCard
              key={item.id}
              item={item}
              isOffline={summary.isOffline}
              actions={actions}
            />
          ))}
        </section>
      )}

      {exceptionItems.length > 0 && (
        <section className="recall-queue-group recall-queue-group--exception" aria-labelledby="recall-exception-title">
          <header className="recall-queue-group__header">
            <h4 id="recall-exception-title">需要恢复的记录 · {exceptionItems.length} 条</h4>
            <p>异常记录不计错、不推进阶段，并会跳到下一可用题。</p>
          </header>
          {exceptionItems.map((item) => (
            <QueueItemCard
              key={item.id}
              item={item}
              isOffline={summary.isOffline}
              actions={actions}
            />
          ))}
        </section>
      )}
    </section>
  )
}

type DetailViewProps = {
  item: RecallItem | null
  isOffline: boolean
  actions: RecallCenterActions
}

function DetailView({ item, isOffline, actions }: DetailViewProps) {
  return (
    <section
      id="recall-center-panel-detail"
      className="recall-center-panel recall-center-panel--detail"
      role="tabpanel"
      aria-labelledby="recall-center-tab-detail"
    >
      {!item ? (
        <div className="recall-center-empty">
          <h3>请选择一个学习项</h3>
          <p>从待复习队列进入，可查看阶段、下一到期日和完整历史。</p>
          <button type="button" onClick={() => actions.onViewChange('queue')}>
            返回队列
          </button>
        </div>
      ) : (
        <>
          <header className="recall-detail-header">
            <div>
              <p className="recall-detail-header__eyebrow">学习项详情</p>
              <h3>{item.word}</h3>
              <p>{item.meaning}</p>
            </div>
            <dl className="recall-detail-summary">
              <div>
                <dt>当前阶段</dt>
                <dd>{item.stage} · {item.stageLabel}</dd>
              </div>
              <div>
                <dt>当前原因</dt>
                <dd>{item.reason}</dd>
              </div>
              <div>
                <dt>下一安排</dt>
                <dd>{item.nextDueLabel ?? item.dueLabel}</dd>
              </div>
            </dl>
          </header>

          <section className="recall-stage-section" aria-labelledby="recall-stage-title">
            <h4 id="recall-stage-title">掌握阶段</h4>
            <p>同一学习日最多推进一个阶段；使用提示或查看答案后答对不会推进阶段。</p>
            <ol className="recall-stage-timeline">
              {(item.stageTimeline ?? getDefaultTimeline(item)).map((node) => (
                <li
                  key={node.stage}
                  className={`recall-stage-node recall-stage-node--${node.status}`}
                  aria-current={node.status === 'current' ? 'step' : undefined}
                >
                  <span className="recall-stage-node__code">{node.stage}</span>
                  <strong>{node.label}</strong>
                  <span>{node.dateLabel ?? '待安排'}</span>
                  <span className="recall-stage-node__status">{getStageStatusLabel(node.status)}</span>
                </li>
              ))}
            </ol>
            <p className="recall-stage-section__boundary">
              “已掌握”仅表示达到当前产品标准，不代表永久记住或永不遗忘。
            </p>
          </section>

          <section className="recall-history" aria-labelledby="recall-history-title">
            <h4 id="recall-history-title">复习历史</h4>
            {item.history.length === 0 ? (
              <p>暂无可追溯历史。</p>
            ) : (
              <ol className="recall-history__timeline">
                {item.history.map((entry) => {
                  const resultLabel = getResultLabel(entry.result)
                  return (
                    <li key={entry.id} className="recall-history-entry">
                      <header>
                        <strong>{entry.title}</strong>
                        <time>{entry.occurredAtLabel} · {entry.timezoneLabel}</time>
                      </header>
                      <p>{entry.description}</p>
                      {resultLabel && <p>结果：{resultLabel}</p>}
                      {entry.assistanceLabel && <p>辅助暴露：{entry.assistanceLabel}</p>}
                      {(entry.stageBefore || entry.stageAfter) && (
                        <p>阶段：{entry.stageBefore ?? '无'} → {entry.stageAfter ?? '无'}</p>
                      )}
                      {entry.nextDueLabel && <p>下一到期：{entry.nextDueLabel}</p>}
                      {entry.inputSnapshot && (
                        <details>
                          <summary>查看本次作答快照</summary>
                          <p>{entry.inputSnapshot}</p>
                        </details>
                      )}
                    </li>
                  )
                })}
              </ol>
            )}
          </section>

          <section className="recall-detail-management" aria-labelledby="recall-management-title">
            <h4 id="recall-management-title">管理学习项</h4>
            <ItemActions
              item={item}
              isOffline={isOffline}
              actions={actions}
              showDetailAction={false}
            />
          </section>
        </>
      )}
    </section>
  )
}

type SettingsViewProps = {
  reminder: RecallReminderSettings
  timezoneChange: RecallTimezoneChange | null | undefined
  actions: RecallCenterActions
}

function SettingsView({ reminder, timezoneChange, actions }: SettingsViewProps) {
  const updateReminder = (patch: Partial<RecallReminderSettings>) => {
    actions.onReminderChange({ ...reminder, ...patch })
  }

  return (
    <section
      id="recall-center-panel-settings"
      className="recall-center-panel recall-center-panel--settings"
      role="tabpanel"
      aria-labelledby="recall-center-tab-settings"
    >
      <header className="recall-center-panel__header">
        <h3>提醒与学习时区</h3>
        <p>关闭外部提醒不会清空到期任务，逾期数量仍会真实累计。</p>
      </header>

      <form className="recall-settings" onSubmit={(event) => event.preventDefault()}>
        <label className="recall-settings-field recall-settings-field--switch">
          <span>
            <strong>复习提醒偏好</strong>
            <small>当天仍有到期复习时，页面内最多显示一次提醒状态</small>
          </span>
          <input
            type="checkbox"
            checked={reminder.enabled}
            onChange={(event) => updateReminder({ enabled: event.currentTarget.checked })}
          />
        </label>

        <label className="recall-settings-field">
          <span>提醒偏好时间</span>
          <input
            type="time"
            value={reminder.time}
            disabled={!reminder.enabled}
            onChange={(event) => updateReminder({ time: event.currentTarget.value })}
          />
        </label>

        <fieldset className="recall-settings-group" disabled={!reminder.enabled}>
          <legend>免打扰时段</legend>
          <label className="recall-settings-field">
            <span>开始时间</span>
            <input
              type="time"
              value={reminder.quietStart}
              onChange={(event) => updateReminder({ quietStart: event.currentTarget.value })}
            />
          </label>
          <label className="recall-settings-field">
            <span>结束时间</span>
            <input
              type="time"
              value={reminder.quietEnd}
              onChange={(event) => updateReminder({ quietEnd: event.currentTarget.value })}
            />
          </label>
          <p>默认免打扰为 22:00–08:00；提醒落入该时段时最多顺延一次。</p>
        </fieldset>

        <label className="recall-settings-field">
          <span>学习时区</span>
          {reminder.timezoneOptions.length > 0 ? (
            <select
              value={reminder.timezone}
              onChange={(event) => updateReminder({ timezone: event.currentTarget.value })}
            >
              {reminder.timezoneOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          ) : (
            <input type="text" value={reminder.timezone} readOnly />
          )}
        </label>
      </form>

      <p className="recall-center-state">
        当前保存本设备提醒偏好并展示真实待复习状态；浏览器通知按权限与规则请求，短信和邮件通道待接入。
      </p>
      <p className="recall-center-state" role="status">
        当前提醒状态：{reminder.statusText}
      </p>

      <section className="recall-notification-boundary" aria-labelledby="recall-notification-title">
        <h4 id="recall-notification-title">
          {reminder.externalNotificationMode === 'browser-ready'
            ? '浏览器通知：已授权'
            : '外部通知：未授权或不可用'}
        </h4>
        <p>{getPermissionText(reminder.permission, reminder.externalNotificationMode)}</p>
        <p>页面不会把应用内提示、定时器或本地记录伪装成系统通知已送达。</p>
      </section>

      {timezoneChange && (
        <section
          className="recall-timezone-change"
          role="group"
          aria-labelledby="recall-timezone-change-title"
          aria-describedby="recall-timezone-change-description"
        >
          <h4 id="recall-timezone-change-title">检测到时区变化</h4>
          <p id="recall-timezone-change-description">
            请选择复习计划继续使用哪个时区。历史记录不会被改写；未决定前继续使用原学习时区。
          </p>
          <div className="recall-timezone-change__actions">
            <button type="button" onClick={actions.onKeepLearningTimezone}>
              继续使用原学习时区（{timezoneChange.learningTimezoneLabel}）
            </button>
            <button type="button" onClick={actions.onSwitchToDeviceTimezone}>
              切换到当前时区（{timezoneChange.deviceTimezoneLabel}）
            </button>
            <button type="button" onClick={actions.onDeferTimezoneChange}>
              稍后决定
            </button>
          </div>
        </section>
      )}
    </section>
  )
}

type ResetConfirmationProps = {
  item: RecallItem
  actions: RecallCenterActions
}

function ResetConfirmation({ item, actions }: ResetConfirmationProps) {
  const resetDialogRef = useRef<HTMLElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const firstButton = resetDialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
    firstButton?.focus()

    return () => {
      previousFocusRef.current?.focus()
      previousFocusRef.current = null
    }
  }, [])

  const handleResetKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      actions.onCancelReset()
      return
    }
    if (event.key !== 'Tab' || !resetDialogRef.current) return

    const focusableElements = Array.from(
      resetDialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    )
    if (focusableElements.length === 0) {
      event.preventDefault()
      resetDialogRef.current.focus()
      return
    }
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }

  return (
    <div className="recall-reset-backdrop">
      <section
        ref={resetDialogRef}
        className="recall-reset-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="recall-reset-title"
        aria-describedby="recall-reset-description"
        tabIndex={-1}
        onKeyDown={handleResetKeyDown}
      >
        <h3 id="recall-reset-title">重置“{item.word}”的掌握进度？</h3>
        <p id="recall-reset-description">
          当前阶段将回到“薄弱待加固”，下一学习日重新开始。历史记录会完整保留。
        </p>
        <div className="recall-reset-dialog__actions">
          <button type="button" onClick={actions.onCancelReset}>
            取消
          </button>
          <button type="button" onClick={() => actions.onConfirmReset(item.id)}>
            重置进度
          </button>
        </div>
      </section>
    </div>
  )
}

export function RecallCenter({
  summary,
  items,
  dialog,
  reminder,
  actions,
  timezoneChange,
  statusMessage = '',
  title = '今日复习',
  truthBoundaryText = '当前进度仅代表本设备内已结算的记录；跨设备同步尚未接入。离线时不会结算、推进掌握或伪记提醒送达。',
}: RecallCenterProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const independentCorrectRate = getIndependentCorrectRate(summary)
  const actionableCount = summary.overdueCount + summary.dueTodayCount + summary.sameDayReadyCount
  const selectedItem = items.find((item) => item.id === dialog.selectedItemId) ?? null
  const resetItem = items.find((item) => item.id === dialog.resetConfirmationItemId) ?? null

  useEffect(() => {
    if (!dialog.open) return

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    dialogRef.current?.focus()

    return () => {
      previousFocusRef.current?.focus()
      previousFocusRef.current = null
    }
  }, [dialog.open])

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (dialog.resetConfirmationItemId) {
        actions.onCancelReset()
      } else {
        actions.onClose()
      }
      return
    }

    if (event.key !== 'Tab' || !dialogRef.current) return

    const focusableElements = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((element) => element.getAttribute('aria-hidden') !== 'true')

    if (focusableElements.length === 0) {
      event.preventDefault()
      dialogRef.current.focus()
      return
    }

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && !dialog.resetConfirmationItemId) {
      actions.onClose()
    }
  }

  const handleTabsKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const views: RecallCenterView[] = ['queue', 'detail', 'settings']
    const currentIndex = views.indexOf(dialog.view)
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? views.length - 1
        : event.key === 'ArrowRight'
          ? (currentIndex + 1) % views.length
          : (currentIndex - 1 + views.length) % views.length
    const nextView = views[nextIndex]
    actions.onViewChange(nextView)
    window.requestAnimationFrame(() => {
      document.getElementById(`recall-center-tab-${nextView}`)?.focus()
    })
  }

  return (
    <section className="recall-center" aria-labelledby="recall-center-title">
      <header className="recall-center-summary">
        <div className="recall-center-summary__heading">
          <p className="recall-center-summary__eyebrow">单词学习中心</p>
          <h2 id="recall-center-title">{title}</h2>
          {actionableCount > 0 ? (
            <p>先完成到期复习，再学习新单词。</p>
          ) : summary.sameDayWaitingCount > 0 ? (
            <p>今日加固已登记，正在等待合格间隔；请先继续学习新单词。</p>
          ) : (
            <p>今天没有到期复习，可以继续学习新单词。</p>
          )}
        </div>

        <dl className="recall-center-summary__metrics">
          <div className="recall-metric recall-metric--overdue">
            <dt>逾期</dt>
            <dd>{summary.overdueCount} 个</dd>
          </div>
          <div className="recall-metric recall-metric--due-today">
            <dt>今日到期</dt>
            <dd>{summary.dueTodayCount} 个</dd>
          </div>
          <div className="recall-metric recall-metric--same-day">
            <dt>今日加固</dt>
            <dd>
              {summary.sameDayCount} 个
              {summary.sameDayWaitingCount > 0 && `（${summary.sameDayWaitingCount} 个等待间隔）`}
            </dd>
          </div>
          <div className="recall-metric recall-metric--accuracy">
            <dt>独立拼写正确率</dt>
            <dd>
              {independentCorrectRate === null
                ? '暂无已结算复习'
                : `${independentCorrectRate}%（${summary.independentCorrectCount}/${summary.settledIndependentAttemptCount}）`}
            </dd>
          </div>
        </dl>

        {summary.remainingOverdueCount > 0 && (
          <p className="recall-center-summary__overflow">
            今天先复习 20 个，另有 {summary.remainingOverdueCount} 个仍处于逾期。
          </p>
        )}
        {summary.remainingDueTodayCount > 0 && (
          <p className="recall-center-summary__overflow">
            当前 20 项之外还有 {summary.remainingDueTodayCount} 个今日到期；完成后可继续复习。
          </p>
        )}
        {summary.anomalyCount > 0 && (
          <p className="recall-center-summary__anomaly">
            {summary.anomalyCount} 条记录需要恢复；异常项不会计错或推进阶段。
          </p>
        )}
        <p className="recall-center-summary__reminder" role="status">
          <strong>提醒状态：</strong>{reminder.statusText}
        </p>
        {summary.isOffline && (
          <p className="recall-center-summary__offline" role="status">
            当前离线：可查看队列，但复习结果不会结算。
          </p>
        )}

        <div className="recall-center-summary__actions">
          <button
            type="button"
            className="recall-center-summary__primary"
            disabled={summary.isOffline || actionableCount === 0}
            onClick={actions.onStartReview}
          >
            {summary.isOffline
              ? '联网后开始复习'
              : actionableCount > 0
                ? '开始复习'
                : summary.sameDayWaitingCount > 0
                  ? '加固等待间隔'
                  : '今天没有到期复习'}
          </button>
          <button
            type="button"
            className="recall-center-summary__secondary"
            onClick={actions.onViewQueue}
          >
            查看队列
          </button>
        </div>

        <aside className="recall-center-truth-boundary" aria-label="功能真实性边界">
          <strong>真实性边界</strong>
          <p>{truthBoundaryText}</p>
          <p>浏览器通知只会在用户开启、权限允许且真实到期时请求；短信和邮件通道待接入，任何请求都不标记为“已送达”。</p>
        </aside>
      </header>

      {statusMessage && !dialog.open && (
        <p className="recall-center-live-status" role="status" aria-live="polite">
          {statusMessage}
        </p>
      )}

      {dialog.open && (
        <div
          className="recall-center-backdrop"
          onMouseDown={handleBackdropMouseDown}
          aria-hidden={resetItem ? true : undefined}
        >
          <div
            ref={dialogRef}
            className="recall-center-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="recall-center-dialog-title"
            tabIndex={-1}
            onKeyDown={handleDialogKeyDown}
          >
            <header className="recall-center-dialog__header">
              <div>
                <p>间隔复习</p>
                <h2 id="recall-center-dialog-title">复习中心</h2>
              </div>
              <button
                type="button"
                className="recall-center-dialog__close"
                onClick={actions.onClose}
                aria-label="关闭复习中心"
              >
                关闭
              </button>
            </header>

            <nav
              className="recall-center-tabs"
              role="tablist"
              aria-label="复习中心视图"
              onKeyDown={handleTabsKeyDown}
            >
              <button
                id="recall-center-tab-queue"
                type="button"
                role="tab"
                aria-selected={dialog.view === 'queue'}
                aria-controls="recall-center-panel-queue"
                tabIndex={dialog.view === 'queue' ? 0 : -1}
                onClick={() => actions.onViewChange('queue')}
              >
                待复习队列
              </button>
              <button
                id="recall-center-tab-detail"
                type="button"
                role="tab"
                aria-selected={dialog.view === 'detail'}
                aria-controls="recall-center-panel-detail"
                tabIndex={dialog.view === 'detail' ? 0 : -1}
                onClick={() => actions.onViewChange('detail')}
              >
                学习项详情
              </button>
              <button
                id="recall-center-tab-settings"
                type="button"
                role="tab"
                aria-selected={dialog.view === 'settings'}
                aria-controls="recall-center-panel-settings"
                tabIndex={dialog.view === 'settings' ? 0 : -1}
                onClick={() => actions.onViewChange('settings')}
              >
                提醒与时区
              </button>
            </nav>

            {statusMessage && (
              <p className="recall-center-live-status" role="status" aria-live="polite">
                {statusMessage}
              </p>
            )}

            <div className="recall-center-dialog__body">
              {dialog.view === 'queue' && (
                <QueueView items={items} summary={summary} actions={actions} />
              )}
              {dialog.view === 'detail' && (
                <DetailView item={selectedItem} isOffline={summary.isOffline} actions={actions} />
              )}
              {dialog.view === 'settings' && (
                <SettingsView
                  reminder={reminder}
                  timezoneChange={timezoneChange}
                  actions={actions}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {resetItem && <ResetConfirmation item={resetItem} actions={actions} />}
    </section>
  )
}

export default RecallCenter
