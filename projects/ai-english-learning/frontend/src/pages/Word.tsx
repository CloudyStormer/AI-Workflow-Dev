import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'
import cherryBlossoms from '../assets/ui/cherry-blossoms.png'
import Icon from '../components/Icon'
import RecallCenter, {
  type RecallCenterView,
  type RecallDialogState,
  type RecallHistoryEntry,
  type RecallItem,
  type RecallReminderSettings,
  type RecallStageNode,
} from '../components/RecallCenter'
import { learningWords } from '../data/content'
import { useLearningStore } from '../store/useLearningStore'
import {
  composeClozeAnswer,
  deleteClozeLetter,
  getAdjacentEditableIndex,
  getCompatibleAnswers,
  getFilledIndexes,
  getFirstEditableIndex,
  getLetterIndexes,
  getRemainingIndexes,
  getSeparatorPattern,
  insertClozeLetters,
  pasteClozeValue,
  type ClozeUserLetters,
} from '../utils/inlineCloze'
import { speakText } from '../utils/speech'
import {
  beginRecallAttempt,
  buildReviewQueue,
  confirmRecallReveal,
  createInitialSpacedRecallState,
  createRecallSession,
  detectDeviceTimeZoneChange,
  evaluateRecallReminder,
  keepLearningTimeZone,
  listEligibleSameDayItemIds,
  loadSpacedRecallState,
  markDataException,
  pauseRecallItem,
  recordIncorrectSubmission,
  recoverDataException,
  recordRecallHint,
  recordRecallReminderRequest,
  registerRecallItem,
  reserveNextSameDayItem,
  resetRecallMastery,
  resumeDueRecallItems,
  resumeRecallItem,
  saveSpacedRecallState,
  settleRecallAttempt,
  skipRecallItem,
  studyDayAt,
  switchLearningTimeZone,
  updateReminderSettings,
  type AttemptOutcome,
  type Connectivity,
  type DomainResult,
  type LoadResult,
  type NotificationPermissionState as DomainNotificationPermissionState,
  type RecallEvent,
  type RecallItemState,
  type ReviewQueueEntry,
  type ReminderDecision,
  type SpacedRecallState,
} from '../utils/spacedRecall'
import {
  buildLetterHint,
  buildLetterHintFromIndexes,
  createHintVariant,
  getMoreCompatibleHint,
  getRerolledCompatibleHint,
} from '../utils/wordHints'
import {
  clearClozeSession,
  createAttemptId,
  createRevealRecord,
  formatAnswerForScreenReader,
  getLearningOutcome,
  isRevealAnswerAvailable,
  loadClozeSession,
  saveClozeSession,
  setRevealRetryResult,
  startRevealRetry,
  type AnswerResult,
  type FeedbackState,
  type HintSnapshot,
  type PersistedClozeSession,
  type RevealAnswerRecord,
  type ClozeRecallContext,
} from '../utils/revealAnswer'

const learningWordIds = new Set(learningWords.map((item) => item.id))

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightWord(sentence: string, word: string) {
  const parts = sentence.split(new RegExp(`(${escapeRegExp(word)})`, 'gi'))

  return parts.map((part, index) =>
    part.toLowerCase() === word.toLowerCase() ? (
      <em key={`${part}-${index}`}>{part}</em>
    ) : (
      part
    ),
  )
}

type PracticeMode = 'study' | 'cloze'
type HintState = HintSnapshot

type ModeSwitchProps = {
  mode: PracticeMode
  onChange: (mode: PracticeMode) => void
}

function createInitialHintState(answer: string, showInitialHint = true): HintState {
  const variant = createHintVariant()
  if (!showInitialHint) {
    return {
      level: 1,
      variant,
      revealedIndexes: [],
    }
  }
  const hint = buildLetterHint(answer, 1, variant)

  return {
    level: hint.level,
    variant,
    revealedIndexes: hint.revealedIndexes,
  }
}

function isRestorableSession(session: PersistedClozeSession | null) {
  if (!session) return false
  const storedWord = learningWords[session.wordIndex]
  if (!storedWord) return false

  const answerIndexes = new Set(getLetterIndexes(storedWord.word))
  const validHintIndexes = [...session.initialHintState.revealedIndexes, ...session.hintState.revealedIndexes]
    .every((index) => answerIndexes.has(index))
  const validUserLetters = Object.entries(session.userLetters).every(([index]) => (
    answerIndexes.has(Number(index)) && !session.hintState.revealedIndexes.includes(Number(index))
  ))
  const validRevealRecord = !session.revealRecord
    || session.revealRecord.standardAnswer === storedWord.word
  const validWordKey = session.wordKey === storedWord.id
    || session.wordKey === `word-${session.wordIndex}`
  const validRecallHintState = !session.recallContext
    || session.recallContext.kind === 'ordinary'
    || session.initialHintState.revealedIndexes.length === 0

  return validWordKey
    && validHintIndexes
    && validUserLetters
    && validRevealRecord
    && validRecallHintState
}

type RecallStorageStatus = 'ready' | 'memory-only' | 'conflict' | 'corrupt'

function persistNormalizedRecallLoad(
  storage: Storage,
  loaded: Extract<LoadResult, { status: 'loaded' }>,
) {
  if (loaded.normalizedFromRevision === undefined) return 'saved' as const
  return saveSpacedRecallState(
    storage,
    loaded.state,
    loaded.normalizedFromRevision,
  )
}

function getDeviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai'
  } catch {
    return 'Asia/Shanghai'
  }
}

function getRecallSessionId(learningDay: string) {
  if (typeof window === 'undefined') return `learning-session:${learningDay}:server`
  const storageKey = `ai-english-learning:recall-session:${learningDay}`
  const existing = window.sessionStorage.getItem(storageKey)
  if (existing) return existing
  const uniquePart = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const sessionId = `learning-session:${learningDay}:${uniquePart}`
  window.sessionStorage.setItem(storageKey, sessionId)
  return sessionId
}

function stableRandomInt(minimum: number, maximum: number, key: string) {
  let hash = 2166136261
  for (const character of key) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  const span = maximum - minimum + 1
  return minimum + ((hash >>> 0) % span)
}

function getConnectivity(isOnline: boolean): Connectivity {
  return isOnline ? 'online' : 'offline'
}

function getBrowserNotificationPermission(): DomainNotificationPermissionState {
  if (typeof window === 'undefined' || typeof window.Notification === 'undefined') {
    return 'unsupported'
  }
  if (window.Notification.permission === 'default') return 'prompt'
  return window.Notification.permission
}

function describeReminderStatus(
  decision: ReminderDecision,
  localTime: string,
  timeZone: string,
) {
  if (decision.kind === 'request-browser-notification') {
    return '提醒时间已到，正在向浏览器请求一次通知；请求不等于已经送达。'
  }
  if (decision.kind === 'in-app-only') {
    return '提醒时间已到；外部通知不可用，页面已显示真实待复习状态。'
  }
  if (decision.kind === 'defer-until-quiet-end') {
    return `当前处于免打扰时段，将在 ${decision.localTime} 后检查一次。`
  }
  const messages: Record<Extract<ReminderDecision, { kind: 'none' }>['reason'], string> = {
    disabled: '提醒未开启；到期与逾期任务仍会正常累计。',
    paused: '提醒已暂停；到期与逾期任务仍会正常累计。',
    'before-reminder-time': `已开启 · ${localTime}（${timeZone}）检查到期项。`,
    'all-due-completed': '今天的到期复习已完成，不再请求提醒。',
    'already-requested-today': '今天已请求过一次浏览器通知；不把请求标记为已送达。',
    'time-zone-decision-pending': '时区待确认；确认前不会重排提醒或重复请求。',
  }
  return messages[decision.reason]
}

function initializeRecallState() {
  const learningTimeZone = getDeviceTimeZone()
  if (typeof window === 'undefined') {
    return {
      state: createInitialSpacedRecallState(learningTimeZone),
      storageStatus: 'memory-only' as RecallStorageStatus,
      statusMessage: '',
    }
  }

  let state: SpacedRecallState
  let storageStatus: RecallStorageStatus = 'ready'
  let statusMessage = ''
  let previousRevision = 0
  const loaded = loadSpacedRecallState(window.localStorage, learningTimeZone)
  if (loaded.status === 'storage-error') {
    state = createInitialSpacedRecallState(learningTimeZone)
    storageStatus = 'corrupt'
  } else {
    state = loaded.state
    previousRevision = loaded.status === 'loaded'
      ? loaded.normalizedFromRevision ?? state.revision
      : state.revision
    if (loaded.status === 'loaded' && loaded.isolatedItemIds?.length) {
      statusMessage = `已隔离 ${loaded.isolatedItemIds.length} 条到期时间异常记录；其余复习可继续，异常项可在队列中恢复。`
    }
  }

  for (const existingItem of Object.values(state.items)) {
    if (learningWordIds.has(existingItem.itemId) || existingItem.status === 'data-exception') continue
    const marked = markDataException(state, {
      itemId: existingItem.itemId,
      code: 'missing-content',
      detail: '当前题库中找不到这条学习内容，原始记录已保留且不会进入复习队列',
    }, new Date().toISOString())
    if (marked.status === 'applied') state = marked.state
  }

  for (const item of learningWords) {
    const registered = registerRecallItem(
      state,
      { itemId: item.id, targetAnswer: item.word, meaning: `${item.part} ${item.meaning}` },
      new Date().toISOString(),
    )
    if (registered.status === 'applied') state = registered.state
  }

  const resumed = resumeDueRecallItems(state, new Date().toISOString())
  if (resumed.status === 'applied') state = resumed.state
  const detected = detectDeviceTimeZoneChange(state, learningTimeZone)
  if (detected.status === 'applied') state = detected.state
  const learningDay = studyDayAt(new Date().toISOString(), state.learningTimeZone)
  const sessionId = getRecallSessionId(learningDay)
  const session = createRecallSession(state, {
    sessionId,
    basePlannedCount: 50,
    now: new Date().toISOString(),
  })
  if (session.status === 'applied') state = session.state

  if (storageStatus === 'ready' && state.revision !== previousRevision) {
    const saved = saveSpacedRecallState(window.localStorage, state, previousRevision)
    if (saved === 'revision-conflict') {
      const latest = loadSpacedRecallState(window.localStorage, learningTimeZone)
      if (latest.status === 'loaded') {
        state = latest.state
        const normalizedSaved = persistNormalizedRecallLoad(window.localStorage, latest)
        if (normalizedSaved === 'revision-conflict') storageStatus = 'conflict'
        if (normalizedSaved === 'storage-error') storageStatus = 'memory-only'
      } else {
        storageStatus = 'conflict'
      }
    }
    if (saved === 'storage-error') storageStatus = 'memory-only'
  }

  return { state, storageStatus, statusMessage }
}

function formatStudyDay(day: string | null, timeZone: string) {
  if (!day) return '待安排'
  const [year, month, date] = day.split('-').map(Number)
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    month: 'long',
    day: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, date, 12)))
}

function getStageLabel(stage: RecallItem['stage']) {
  const labels: Record<RecallItem['stage'], string> = {
    S0: '薄弱待加固',
    S1: '次日回忆',
    S2: '短期间隔',
    S3: '周期检查',
    S4: '掌握检查',
    M1: '维护复习',
  }
  return labels[stage]
}

function getEventTitle(event: RecallEvent) {
  const labels: Record<RecallEvent['type'], string> = {
    reveal: '查看答案',
    'submitted-incorrect': '完整拼写错误',
    'hint-used': '使用字母提示',
    'attempt-settled': '本次练习已结算',
    'stage-advanced': '掌握阶段推进',
    'same-day-reinforced': '今日加固完成',
    skipped: '跳过本题',
    paused: '暂停学习项',
    resumed: '恢复学习项',
    'mastery-reset': '重置掌握进度',
    'reminder-requested': '提醒请求已记录',
    'time-zone-switched': '学习时区已切换',
    'data-exception': '记录异常',
    'data-recovered': '异常记录已恢复',
  }
  return labels[event.type]
}

function formatEventDate(instant: string, timeZone: string) {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone,
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(instant))
  } catch {
    return instant
  }
}

function isAttemptOutcome(value: unknown): value is AttemptOutcome {
  return value === 'clean-independent-correct'
    || value === 'assisted-correct'
    || value === 'revealed'
    || value === 'correct-after-reveal'
    || value === 'submitted-incorrect'
    || value === 'same-day-correct'
}

function getRecallItemStage(item: RecallItemState): RecallItem['stage'] {
  if (item.status === 'mastered') return 'M1'
  return item.stage ?? 'S0'
}

function isSameDayEligible(item: RecallItemState, learningDay: string) {
  if (item.status !== 'weak' || item.sameDayPlan?.studyDay !== learningDay) return false
  if (item.suppressedUntilDay && item.suppressedUntilDay > learningDay) return false
  return item.sameDayPlan.opportunities.some((opportunity) => (
    opportunity.status === 'scheduled'
    || (
      opportunity.status === 'pending'
      && opportunity.otherItemsSettled >= opportunity.offset
      && opportunity.otherItemsSettled <= 7
    )
  ))
}

function getActionableRecallItemIds(
  state: SpacedRecallState,
  now: string,
  sessionId: string,
) {
  const learningDay = studyDayAt(now, state.learningTimeZone)
  const reviewIds = buildReviewQueue(state, now, 20).visible.map((entry) => entry.itemId)
  const sameDayIds = listEligibleSameDayItemIds(state, sessionId)
  const uniqueIds = [...new Set([...reviewIds, ...sameDayIds])]
    .filter((itemId) => learningWordIds.has(itemId))
  const regularIds = uniqueIds.filter((itemId) => (
    !state.items[itemId]?.queueTailAfterByDay?.[learningDay]
  ))
  const queueTailIds = uniqueIds
    .filter((itemId) => state.items[itemId]?.queueTailAfterByDay?.[learningDay])
    .sort((leftId, rightId) => {
      const left = state.items[leftId].queueTailAfterByDay?.[learningDay] ?? ''
      const right = state.items[rightId].queueTailAfterByDay?.[learningDay] ?? ''
      return left.localeCompare(right) || leftId.localeCompare(rightId)
    })
  return [...regularIds, ...queueTailIds]
}

function describeRecallRejection(reason: string) {
  const messages: Record<string, string> = {
    'offline-settlement-disabled': '当前离线，复习结果没有结算；联网后可继续。',
    'item-not-found': '没有找到这条学习项，已保留当前页面。',
    'attempt-not-found': '当前作答记录未准备好，请重试。',
    'attempt-already-settled': '本次作答已经结算，不会重复计分。',
    'item-unavailable': '这条学习项当前已暂停或存在数据异常。',
    'confirmation-required': '需要明确确认后才能重置掌握进度。',
    'session-cap-reached': '本次会话已达到今日加固上限，其余项目会保留。',
    'no-eligible-same-day-item': '今日加固仍在等待合格间隔，不会紧邻重复。',
  }
  return messages[reason] ?? '本次复习操作未完成，请稍后重试。'
}

function ModeSwitch({ mode, onChange }: ModeSwitchProps) {
  return (
    <div className="practice-mode-switch" role="group" aria-label="练习模式">
      <button
        type="button"
        className={mode === 'study' ? 'is-active' : ''}
        aria-pressed={mode === 'study'}
        onClick={() => onChange('study')}
      >
        单词
      </button>
      <button
        type="button"
        className={mode === 'cloze' ? 'is-active' : ''}
        aria-pressed={mode === 'cloze'}
        onClick={() => onChange('cloze')}
      >
        填空
      </button>
    </div>
  )
}

function Word() {
  const navigate = useNavigate()
  const [initialRecall] = useState(initializeRecallState)
  const [recallState, setRecallState] = useState(initialRecall.state)
  const recallStateRef = useRef(initialRecall.state)
  const [clockNow, setClockNow] = useState(() => new Date().toISOString())
  const [recallStorageStatus, setRecallStorageStatus] = useState<RecallStorageStatus>(
    initialRecall.storageStatus,
  )
  const [isOnline, setIsOnline] = useState(() => (
    typeof navigator === 'undefined' ? true : navigator.onLine
  ))
  const [notificationPermission, setNotificationPermission] = useState(
    getBrowserNotificationPermission,
  )
  const [recallStatusMessage, setRecallStatusMessage] = useState(initialRecall.statusMessage)
  const [recallDialog, setRecallDialog] = useState<RecallDialogState>({
    open: false,
    view: 'queue',
    selectedItemId: null,
    resetConfirmationItemId: null,
  })
  const storedWordIndex = useLearningStore((state) => state.wordIndex)
  const completed = useLearningStore((state) => state.sessionCompleted)
  const nextWord = useLearningStore((state) => state.nextWord)
  const [restoredSession] = useState(() => {
    const session = loadClozeSession()
    return isRestorableSession(session) ? session : null
  })
  const [restoredWordIndex, setRestoredWordIndex] = useState<number | null>(
    restoredSession?.wordIndex ?? null,
  )
  const wordIndex = restoredWordIndex ?? storedWordIndex
  const word = learningWords[wordIndex]
  const wordKey = word.id
  const [mode, setMode] = useState<PracticeMode>(restoredSession?.mode ?? 'study')
  const [initialHintState, setInitialHintState] = useState<HintState>(() => (
    restoredSession?.initialHintState ?? createInitialHintState(word.word)
  ))
  const [userLetters, setUserLetters] = useState<ClozeUserLetters>(restoredSession?.userLetters ?? {})
  const [result, setResult] = useState<AnswerResult>(restoredSession?.result ?? 'idle')
  const [feedback, setFeedback] = useState<FeedbackState>(
    restoredSession?.feedback ?? { kind: 'idle', message: '' },
  )
  const [liveMessage, setLiveMessage] = useState('')
  const [hintState, setHintState] = useState<HintState>(restoredSession?.hintState ?? initialHintState)
  const [hasRevealedAnswer, setHasRevealedAnswer] = useState(
    restoredSession?.hasRevealedAnswer ?? false,
  )
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(
    restoredSession?.isAnswerRevealed ?? false,
  )
  const [revealRecord, setRevealRecord] = useState<RevealAnswerRecord | null>(
    restoredSession?.revealRecord ?? null,
  )
  const [attemptId, setAttemptId] = useState(restoredSession?.attemptId ?? createAttemptId)
  const [hintUsed, setHintUsed] = useState(
    restoredSession?.hintUsed ?? (restoredSession?.hintState.revealedIndexes.length ?? 0) > 0,
  )
  const [hadIncorrectSubmission, setHadIncorrectSubmission] = useState(
    restoredSession?.hadIncorrectSubmission ?? false,
  )
  const [recallContext, setRecallContext] = useState<ClozeRecallContext | null>(
    restoredSession?.recallContext ?? null,
  )
  const [isRevealDialogOpen, setIsRevealDialogOpen] = useState(false)
  const [cursorIndex, setCursorIndex] = useState<number | null>(() =>
    isAnswerRevealed ? null : getFirstEditableIndex(word.word, hintState.revealedIndexes, userLetters),
  )
  const [isAnswerFocused, setIsAnswerFocused] = useState(false)
  const answerInputRef = useRef<HTMLInputElement>(null)
  const slotGroupRef = useRef<HTMLSpanElement>(null)
  const revealDialogRef = useRef<HTMLDialogElement>(null)
  const revealContinueRef = useRef<HTMLButtonElement>(null)
  const revealTriggerRef = useRef<HTMLButtonElement>(null)
  const resultSummaryRef = useRef<HTMLDivElement>(null)
  const activeWordKeyRef = useRef(wordKey)
  const isAdvancingRef = useRef(false)
  const notificationRequestedDayRef = useRef<string | null>(null)
  const progress = `${Math.round((completed / 50) * 100)}%`
  const letterHint = useMemo(
    () => buildLetterHintFromIndexes(word.word, hintState.revealedIndexes, hintState.level),
    [hintState.level, hintState.revealedIndexes, word.word],
  )
  const filledIndexes = useMemo(() => getFilledIndexes(userLetters), [userLetters])
  const remainingIndexes = useMemo(
    () => getRemainingIndexes(word.word, hintState.revealedIndexes, userLetters),
    [hintState.revealedIndexes, userLetters, word.word],
  )
  const compatibleAnswers = useMemo(
    () => getCompatibleAnswers(word.word, word.acceptedAnswers ?? [], hintState.revealedIndexes),
    [hintState.revealedIndexes, word.acceptedAnswers, word.word],
  )
  const moreHintUpdate = useMemo(
    () => getMoreCompatibleHint(
      word.word,
      hintState.revealedIndexes,
      filledIndexes,
      hintState.level,
      hintState.variant,
    ),
    [filledIndexes, hintState.level, hintState.revealedIndexes, hintState.variant, word.word],
  )
  const rerolledHintUpdate = useMemo(
    () => getRerolledCompatibleHint(
      word.word,
      hintState.revealedIndexes,
      filledIndexes,
      hintState.level,
      hintState.variant,
    ),
    [filledIndexes, hintState.level, hintState.revealedIndexes, hintState.variant, word.word],
  )
  const [beforeBlank, afterBlank] = word.clozeSentence.split('{{blank}}')
  const trailingPunctuationMatch = afterBlank.match(/^([,.;:!?，。！？；：]+)([\s\S]*)$/)
  const attachedPunctuation = trailingPunctuationMatch?.[1] ?? ''
  const afterBlankRemainder = trailingPunctuationMatch?.[2] ?? afterBlank
  const learningDay = studyDayAt(clockNow, recallState.learningTimeZone)
  const recallSessionId = useMemo(() => getRecallSessionId(learningDay), [learningDay])

  const getRecallEnv = useCallback(() => {
    return {
      now: new Date().toISOString(),
      connectivity: getConnectivity(isOnline),
      randomIntInclusive: stableRandomInt,
    }
  }, [isOnline])

  const commitRecallResult = useCallback(function commitRecallResult<T>(
    result: DomainResult<T>,
    successMessage = '',
  ): T | null {
    if (result.status === 'rejected') {
      setRecallStatusMessage(describeRecallRejection(result.reason))
      return null
    }
    if (result.status === 'duplicate') return result.value

    const previousRevision = recallStateRef.current.revision
    if (typeof window !== 'undefined' && recallStorageStatus !== 'corrupt') {
      const saved = saveSpacedRecallState(
        window.localStorage,
        result.state,
        previousRevision,
      )
      if (saved !== 'saved') {
        if (saved === 'revision-conflict') {
          const latest = loadSpacedRecallState(window.localStorage, result.state.learningTimeZone)
          if (latest.status === 'loaded') {
            const normalizedSaved = persistNormalizedRecallLoad(window.localStorage, latest)
            recallStateRef.current = latest.state
            setRecallState(latest.state)
            if (normalizedSaved === 'saved') {
              setRecallStorageStatus('ready')
              setRecallStatusMessage('检测到另一页面的新记录，已安全刷新；请重试刚才的操作。')
            } else if (normalizedSaved === 'revision-conflict') {
              setRecallStorageStatus('conflict')
              setRecallStatusMessage('另一页面在异常记录恢复期间继续更新，已停止覆盖；请刷新后重试。')
            } else {
              setRecallStorageStatus('memory-only')
              setRecallStatusMessage('异常记录已在内存中隔离，但暂时无法安全保存；本页不会伪装已同步。')
            }
          } else {
            setRecallStorageStatus('conflict')
            setRecallStatusMessage('检测到另一页面更新了复习记录，已停止覆盖；请刷新后继续。')
          }
        } else {
          setRecallStorageStatus('memory-only')
          setRecallStatusMessage('复习记录暂时无法保存，本次没有伪装成已同步。')
        }
        return null
      }
    } else if (recallStorageStatus === 'corrupt') {
      setRecallStatusMessage('本地复习记录格式异常，原始数据已保留；当前操作不会覆盖它。')
      return null
    }

    recallStateRef.current = result.state
    setRecallState(result.state)
    if (successMessage) setRecallStatusMessage(successMessage)
    return result.value
  }, [recallStorageStatus])

  useEffect(() => {
    const refreshClockAndBoundaries = () => {
      const now = new Date().toISOString()
      setClockNow(now)
      setNotificationPermission(getBrowserNotificationPermission())

      const resumed = resumeDueRecallItems(recallStateRef.current, now)
      if (resumed.status === 'applied') commitRecallResult(resumed)

      const detected = detectDeviceTimeZoneChange(
        recallStateRef.current,
        getDeviceTimeZone(),
      )
      if (detected.status === 'applied') commitRecallResult(detected)
    }

    const intervalId = window.setInterval(refreshClockAndBoundaries, 60_000)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshClockAndBoundaries()
    }
    window.addEventListener('focus', refreshClockAndBoundaries)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshClockAndBoundaries)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [commitRecallResult])

  const ensureRecallAttempt = useCallback(() => {
    const existingAttempt = recallStateRef.current.attempts[attemptId]
    let attempt = existingAttempt
    if (!attempt) {
      const context = recallContext?.kind === 'same-day'
        ? 'same-day'
        : recallContext
          ? 'auto'
          : 'ordinary'
      const started = beginRecallAttempt(
        recallStateRef.current,
        { attemptId, itemId: wordKey, context },
        { now: new Date().toISOString() },
      )
      const committedAttempt = commitRecallResult(started)
      if (!committedAttempt) return null
      attempt = committedAttempt
    }
    if (!attempt) return null
    if (isOnline && hasRevealedAnswer && revealRecord && !attempt.revealed) {
      const restoredInputSnapshot = Object.entries(revealRecord.beforeInputSnapshot)
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([, character]) => character)
        .join('')
      const revealed = confirmRecallReveal(
        recallStateRef.current,
        {
          attemptId,
          inputSnapshot: restoredInputSnapshot,
          standardAnswer: revealRecord.standardAnswer,
        },
        getRecallEnv(),
      )
      if (commitRecallResult(revealed) === null) return null
      attempt = recallStateRef.current.attempts[attemptId]
    }
    if (isOnline && hadIncorrectSubmission && !attempt.hadCompleteIncorrect) {
      const incorrect = recordIncorrectSubmission(
        recallStateRef.current,
        { attemptId, complete: true, inputSnapshot: '刷新恢复的完整错误记录' },
        getRecallEnv(),
      )
      if (commitRecallResult(incorrect) === null) return null
      attempt = recallStateRef.current.attempts[attemptId]
    }
    if (hintUsed && isOnline) {
      const recordedHint = commitRecallResult(
        recordRecallHint(recallStateRef.current, attemptId, getRecallEnv()),
      )
      if (!recordedHint) return null
      attempt = recordedHint
    }
    return recallStateRef.current.attempts[attemptId] ?? attempt
  }, [
    attemptId,
    commitRecallResult,
    getRecallEnv,
    hadIncorrectSubmission,
    hasRevealedAnswer,
    hintUsed,
    isOnline,
    recallContext,
    revealRecord,
    wordKey,
  ])

  useEffect(() => {
    const session = createRecallSession(recallStateRef.current, {
      sessionId: recallSessionId,
      basePlannedCount: 50,
      now: clockNow,
    })
    if (session.status === 'applied') commitRecallResult(session)
  }, [clockNow, commitRecallResult, recallSessionId])

  useEffect(() => {
    recallStateRef.current = recallState
  }, [recallState])

  useEffect(() => {
    const updateOnlineState = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', updateOnlineState)
    window.addEventListener('offline', updateOnlineState)
    return () => {
      window.removeEventListener('online', updateOnlineState)
      window.removeEventListener('offline', updateOnlineState)
    }
  }, [])

  useEffect(() => {
    if (mode !== 'cloze') return
    ensureRecallAttempt()
  }, [ensureRecallAttempt, mode])

  useEffect(() => {
    if (!hintUsed || mode !== 'cloze' || !isOnline) return
    const attempt = recallStateRef.current.attempts[attemptId]
    if (!attempt || attempt.usedHint) return
    commitRecallResult(recordRecallHint(recallStateRef.current, attemptId, getRecallEnv()))
  }, [attemptId, commitRecallResult, getRecallEnv, hintUsed, isOnline, mode])

  useEffect(() => {
    if (restoredWordIndex === null) return
    if (storedWordIndex !== restoredWordIndex) {
      useLearningStore.setState({ wordIndex: restoredWordIndex })
    }
    setRestoredWordIndex(null)
  }, [restoredWordIndex, storedWordIndex])

  useEffect(() => {
    if (activeWordKeyRef.current === wordKey) return

    const nextHintState = createInitialHintState(word.word, !recallContext)
    const nextSession: PersistedClozeSession = {
      version: 2,
      wordIndex,
      wordKey,
      attemptId: createAttemptId(),
      mode,
      initialHintState: nextHintState,
      hintState: nextHintState,
      userLetters: {},
      result: 'idle',
      feedback: { kind: 'idle', message: '' },
      hasRevealedAnswer: false,
      isAnswerRevealed: false,
      revealRecord: null,
      hintUsed: nextHintState.revealedIndexes.length > 0,
      hadIncorrectSubmission: false,
      recallContext,
    }

    activeWordKeyRef.current = wordKey
    setInitialHintState(nextHintState)
    setUserLetters({})
    setResult('idle')
    setFeedback({ kind: 'idle', message: '' })
    setHintState(nextHintState)
    setHasRevealedAnswer(false)
    setIsAnswerRevealed(false)
    setRevealRecord(null)
    setAttemptId(nextSession.attemptId)
    setHintUsed(nextSession.hintUsed)
    setHadIncorrectSubmission(false)
    setIsRevealDialogOpen(false)
    setCursorIndex(getFirstEditableIndex(word.word, nextHintState.revealedIndexes, {}))
    setLiveMessage('已进入下一题，答案输入已重置。')
    saveClozeSession(nextSession)

    const resetAdvancing = window.setTimeout(() => {
      isAdvancingRef.current = false
    }, 0)
    return () => window.clearTimeout(resetAdvancing)
  }, [mode, recallContext, word.word, wordIndex, wordKey])

  useEffect(() => {
    if (isAdvancingRef.current || activeWordKeyRef.current !== wordKey) return

    saveClozeSession({
      version: 2,
      wordIndex,
      wordKey,
      attemptId,
      mode,
      initialHintState,
      hintState,
      userLetters,
      result,
      feedback,
      hasRevealedAnswer,
      isAnswerRevealed,
      revealRecord,
      hintUsed,
      hadIncorrectSubmission,
      recallContext,
    })
  }, [
    feedback,
    hasRevealedAnswer,
    hadIncorrectSubmission,
    hintState,
    hintUsed,
    initialHintState,
    isAnswerRevealed,
    mode,
    result,
    revealRecord,
    recallContext,
    userLetters,
    attemptId,
    wordIndex,
    wordKey,
  ])

  useEffect(() => {
    const dialog = revealDialogRef.current
    if (!dialog) return

    if (isRevealDialogOpen && !dialog.open) {
      dialog.showModal()
      const frame = requestAnimationFrame(() => revealContinueRef.current?.focus({ preventScroll: true }))
      return () => cancelAnimationFrame(frame)
    }

    if (!isRevealDialogOpen && dialog.open) dialog.close()
  }, [isRevealDialogOpen])

  useEffect(() => {
    if (mode !== 'cloze') {
      setIsAnswerFocused(false)
      return
    }

    const frame = requestAnimationFrame(() => {
      if (isAnswerRevealed) {
        resultSummaryRef.current?.focus({ preventScroll: true })
      } else {
        answerInputRef.current?.focus({ preventScroll: true })
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [isAnswerRevealed, mode, wordKey])

  function scrollSlotIntoView(index: number | null) {
    if (index === null) return

    requestAnimationFrame(() => {
      slotGroupRef.current
        ?.querySelector<HTMLElement>(`[data-slot-index="${index}"]`)
        ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    })
  }

  function getCursorAnnouncement(index: number | null) {
    const letterPosition = getLetterIndexes(word.word).indexOf(index ?? -1)
    return letterPosition >= 0 ? `当前编辑第 ${letterPosition + 1} 个字母槽` : ''
  }

  function focusAnswerAt(index: number | null, announce = false) {
    if (index === null || isAnswerRevealed) return
    setCursorIndex(index)
    answerInputRef.current?.focus({ preventScroll: true })
    scrollSlotIntoView(index)
    if (announce) setLiveMessage(`${getCursorAnnouncement(index)}。`)
  }

  function closeRevealDialog(restoreTriggerFocus: boolean) {
    const dialog = revealDialogRef.current
    if (dialog?.open) dialog.close()
    setIsRevealDialogOpen(false)

    if (restoreTriggerFocus) {
      requestAnimationFrame(() => revealTriggerRef.current?.focus({ preventScroll: true }))
    }
  }

  function handleModeChange(nextMode: PracticeMode) {
    if (isRevealDialogOpen) closeRevealDialog(false)
    if (recallContext && nextMode === 'study') {
      const message = '当前是到期复习题，需要在填空模式完成或先跳过本题。'
      setRecallStatusMessage(message)
      setLiveMessage(message)
      return
    }
    setMode(nextMode)
  }

  function handleOpenRevealDialog() {
    if (mode !== 'cloze' || result === 'correct' || hasRevealedAnswer || isAnswerRevealed) return
    setIsRevealDialogOpen(true)
    setLiveMessage('查看答案确认；查看后不计独立答对。')
  }

  function handleCancelReveal() {
    closeRevealDialog(true)
    setLiveMessage('已取消，答案未查看。')
  }

  function handleConfirmReveal() {
    if (hasRevealedAnswer || isAnswerRevealed) {
      closeRevealDialog(false)
      return
    }

    if (!isOnline) {
      const message = '当前离线，答案没有揭晓，也没有伪记薄弱证据；联网后可再次确认。'
      closeRevealDialog(true)
      setFeedback({ kind: 'filtered', message })
      setLiveMessage(message)
      setRecallStatusMessage(message)
      return
    }

    const currentAttempt = ensureRecallAttempt()
    if (!currentAttempt) return
    const inputSnapshot = letterHint.characters
      .map(({ character, isHinted, isSeparator }, index) => (
        isSeparator ? character : userLetters[index] ?? (isHinted ? character : '_')
      ))
      .join('')
    const captured = confirmRecallReveal(
      recallStateRef.current,
      {
        attemptId,
        inputSnapshot,
        standardAnswer: word.word,
      },
      getRecallEnv(),
    )
    if (commitRecallResult(captured, '已登记“查看答案”薄弱证据，并安排今日加固与次日复习。') === null) {
      return
    }

    const nextRecord = createRevealRecord({
      existingRecord: revealRecord,
      result,
      feedbackKind: feedback.kind,
      filledCount: filledIndexes.length,
      userLetters,
      standardAnswer: word.word,
    })
    const revealedFeedback: FeedbackState = {
      kind: 'revealed',
      message: '已查看答案。本题不计为独立答对，也不会提高正确率或熟练度；进入下一题后记为已复习 / 未独立答对。',
    }

    answerInputRef.current?.blur()
    closeRevealDialog(false)
    setRevealRecord(nextRecord)
    setHasRevealedAnswer(true)
    setIsAnswerRevealed(true)
    setResult('idle')
    setFeedback(revealedFeedback)
    setCursorIndex(null)
    setIsAnswerFocused(false)
    setLiveMessage(
      `正确答案，已查看：${formatAnswerForScreenReader(word.word)}。进入下一题后，本题记为已复习、未独立答对。请选择下一题或重新作答本题。`,
    )
    saveClozeSession({
      version: 2,
      wordIndex,
      wordKey,
      attemptId,
      mode,
      initialHintState,
      hintState,
      userLetters,
      result: 'idle',
      feedback: revealedFeedback,
      hasRevealedAnswer: true,
      isAnswerRevealed: true,
      revealRecord: nextRecord,
      hintUsed,
      hadIncorrectSubmission,
      recallContext,
    })
  }

  function handleRetryRevealedAnswer() {
    if (!hasRevealedAnswer || !revealRecord) return

    const retryRecord = startRevealRetry(revealRecord)
    const retryCursor = getFirstEditableIndex(word.word, initialHintState.revealedIndexes, {})
    const message = '已查看答案后的辅助练习：请重新填写。本次答对不计独立答对、正确率或熟练度收益。'

    setRevealRecord(retryRecord)
    setIsAnswerRevealed(false)
    setUserLetters({})
    setHintState(initialHintState)
    setResult('idle')
    setFeedback({ kind: 'retrying', message })
    setCursorIndex(retryCursor)
    setLiveMessage(message)
  }

  function moveToSafeCursor(nextHintIndexes: number[], preferredIndex: number | null) {
    const editableIndexes = getLetterIndexes(word.word).filter((index) => !nextHintIndexes.includes(index))
    const nextCursor = preferredIndex !== null && editableIndexes.includes(preferredIndex)
      ? preferredIndex
      : getFirstEditableIndex(word.word, nextHintIndexes, userLetters)
    setCursorIndex(nextCursor)
    scrollSlotIntoView(nextCursor)
  }

  function enterEditingState(message = '') {
    if (result === 'incorrect') {
      const editingMessage = message || '已进入修改中，可以再次检查答案。'
      setResult('idle')
      setFeedback({ kind: 'editing', message: editingMessage })
      setLiveMessage(editingMessage)
      if (hasRevealedAnswer && revealRecord) {
        setRevealRecord(setRevealRetryResult(revealRecord, 'in-progress'))
      }
      return
    }

    if (message) {
      setFeedback({ kind: 'filtered', message })
      setLiveMessage(message)
    } else if (feedback.kind !== 'idle') {
      setFeedback({ kind: 'idle', message: '' })
      setLiveMessage('')
    }
  }

  function handleTextInput(value: string) {
    if (result === 'correct' || isAnswerRevealed) return

    const insertion = insertClozeLetters(
      word.word,
      hintState.revealedIndexes,
      userLetters,
      cursorIndex,
      value,
    )
    const filteredMessage = insertion.rejectedCount > 0
      ? `已过滤 ${insertion.rejectedCount} 个非英文字母或超出槽位的字符。`
      : ''

    if (insertion.acceptedCount > 0) {
      const wasIncorrect = result === 'incorrect'
      const nextFilledCount = getFilledIndexes(insertion.userLetters).length
      const nextRemainingCount = getRemainingIndexes(
        word.word,
        hintState.revealedIndexes,
        insertion.userLetters,
      ).length
      setUserLetters(insertion.userLetters)
      setCursorIndex(insertion.cursorIndex)
      scrollSlotIntoView(insertion.cursorIndex)
      enterEditingState(filteredMessage)
      if (
        !wasIncorrect
        && !filteredMessage
        && (nextFilledCount === 1 || nextFilledCount % 3 === 0 || nextRemainingCount === 0)
      ) {
        setLiveMessage(`已输入 ${nextFilledCount} 个，还差 ${nextRemainingCount} 个。`)
      }
    } else if (filteredMessage) {
      enterEditingState(filteredMessage)
    }
  }

  function handleBackspace() {
    if (result === 'correct' || isAnswerRevealed) return

    const deletion = deleteClozeLetter(
      word.word,
      hintState.revealedIndexes,
      userLetters,
      cursorIndex,
    )
    const didDelete = getFilledIndexes(deletion.userLetters).length < filledIndexes.length

    if (!didDelete) return

    setUserLetters(deletion.userLetters)
    setCursorIndex(deletion.cursorIndex)
    scrollSlotIntoView(deletion.cursorIndex)
    enterEditingState()
    if (result !== 'incorrect') {
      const nextRemainingCount = getRemainingIndexes(
        word.word,
        hintState.revealedIndexes,
        deletion.userLetters,
      ).length
      setLiveMessage(`已删除一个字母，还差 ${nextRemainingCount} 个。`)
    }
  }

  function activateWordQuestion(
    nextWordIndex: number,
    nextRecallContext: ClozeRecallContext | null,
    nextMode: PracticeMode = 'cloze',
    countProgress = false,
    requestedMastery = false,
  ) {
    const nextWordValue = learningWords[nextWordIndex]
    const nextWordKey = nextWordValue.id
    const nextHintState = createInitialHintState(nextWordValue.word, !nextRecallContext)
    const nextAttemptId = createAttemptId()
    const nextSession: PersistedClozeSession = {
      version: 2,
      wordIndex: nextWordIndex,
      wordKey: nextWordKey,
      attemptId: nextAttemptId,
      mode: nextMode,
      initialHintState: nextHintState,
      hintState: nextHintState,
      userLetters: {},
      result: 'idle',
      feedback: { kind: 'idle', message: '' },
      hasRevealedAnswer: false,
      isAnswerRevealed: false,
      revealRecord: null,
      hintUsed: nextHintState.revealedIndexes.length > 0,
      hadIncorrectSubmission: false,
      recallContext: nextRecallContext,
    }

    closeRevealDialog(false)
    clearClozeSession()
    activeWordKeyRef.current = nextWordKey
    setMode(nextMode)
    setInitialHintState(nextHintState)
    setHintState(nextHintState)
    setUserLetters({})
    setResult('idle')
    setFeedback({ kind: 'idle', message: '' })
    setHasRevealedAnswer(false)
    setIsAnswerRevealed(false)
    setRevealRecord(null)
    setAttemptId(nextAttemptId)
    setHintUsed(nextSession.hintUsed)
    setHadIncorrectSubmission(false)
    setRecallContext(nextRecallContext)
    setIsRevealDialogOpen(false)
    setCursorIndex(getFirstEditableIndex(nextWordValue.word, nextHintState.revealedIndexes, {}))
    setIsAnswerFocused(false)
    setLiveMessage(
      nextRecallContext
        ? `${nextRecallContext.reason}。本题从无提示字母开始，只有独立拼写正确才可推进阶段。`
        : '已进入下一题，答案输入已重置。',
    )
    saveClozeSession(nextSession)

    if (countProgress) {
      nextWord(nextMode === 'study' && requestedMastery, nextWordIndex)
    } else {
      useLearningStore.setState({ wordIndex: nextWordIndex })
    }
  }

  function getRecallContextForEntry(entry: ReviewQueueEntry): ClozeRecallContext {
    return {
      kind: entry.stage === 'maintenance' ? 'maintenance' : 'cross-day',
      stage: entry.stage === 'maintenance' ? 'M1' : entry.stage,
      reason: entry.reason,
      openedLearningDay: learningDay,
    }
  }

  function startRecallItem(itemId: string) {
    if (!learningWordIds.has(itemId)) {
      setRecallStatusMessage('当前题库中找不到这条学习内容，已停止启动；原始记录仍保留在异常队列。')
      return
    }
    if (!isOnline) {
      setRecallStatusMessage('当前离线，只能查看真实队列；联网后才能开始并结算复习。')
      return
    }

    const queue = buildReviewQueue(recallStateRef.current, new Date().toISOString(), 20)
    const queueEntry = queue.visible.find((entry) => entry.itemId === itemId)
    if (queueEntry) {
      const index = learningWords.findIndex((item) => item.id === itemId)
      if (index < 0) return
      setRecallDialog((current) => ({ ...current, open: false }))
      setRecallStatusMessage(`已开始：${queueEntry.reason}`)
      activateWordQuestion(index, getRecallContextForEntry(queueEntry))
      return
    }

    const currentItem = recallStateRef.current.items[itemId]
    if (!currentItem || !isSameDayEligible(currentItem, learningDay)) {
      setRecallStatusMessage('这条今日加固仍在等待 3～7 道其他学习项的间隔。')
      return
    }

    let reservedItemId = itemId
    const alreadyScheduled = currentItem.sameDayPlan?.opportunities.some(
      (opportunity) => opportunity.status === 'scheduled',
    )
    if (!alreadyScheduled) {
      const reserved = reserveNextSameDayItem(
        recallStateRef.current,
        recallSessionId,
        itemId,
      )
      const value = commitRecallResult(reserved)
      if (!value) return
      reservedItemId = value.itemId
    }
    const index = learningWords.findIndex((item) => item.id === reservedItemId)
    if (index < 0) return
    const item = recallStateRef.current.items[reservedItemId]
    const opportunity = item.sameDayPlan?.opportunities.find(
      (entry) => entry.status === 'scheduled',
    )
    const reason = opportunity
      ? `今天第 ${opportunity.ordinal} 次加固；已满足 ${opportunity.offset} 道其他题间隔`
      : '今天的薄弱词加固'
    setRecallDialog((current) => ({ ...current, open: false }))
    setRecallStatusMessage(`已开始：${reason}`)
    activateWordQuestion(index, {
      kind: 'same-day',
      stage: 'S0',
      reason,
      openedLearningDay: learningDay,
    })
  }

  function startNextAvailableReview() {
    const now = new Date().toISOString()
    const nextItemId = getActionableRecallItemIds(
      recallStateRef.current,
      now,
      recallSessionId,
    )[0]
    if (nextItemId) {
      startRecallItem(nextItemId)
      return
    }
    setRecallStatusMessage('今天没有到期复习，可以继续学习新单词。')
  }

  function getNextOrdinaryWordIndex(fromIndex: number) {
    for (let offset = 1; offset <= learningWords.length; offset += 1) {
      const candidateIndex = (fromIndex + offset) % learningWords.length
      const candidate = learningWords[candidateIndex]
      const recallItem = recallStateRef.current.items[candidate.id]
      if (!recallItem) continue
      if (
        recallItem.status === 'weak'
        || recallItem.status === 'paused'
        || recallItem.status === 'data-exception'
      ) continue
      return candidateIndex
    }
    return (fromIndex + 1) % learningWords.length
  }

  function advanceToNextWord(requestedMastery: boolean) {
    if (isAdvancingRef.current) return
    isAdvancingRef.current = true
    if (mode === 'cloze') {
      const attempt = ensureRecallAttempt()
      if (!attempt) {
        isAdvancingRef.current = false
        return
      }
      const settled = settleRecallAttempt(
        recallStateRef.current,
        {
          attemptId,
          correct: result === 'correct',
          sessionId: recallContext?.kind === 'same-day' ? recallSessionId : undefined,
        },
        getRecallEnv(),
      )
      if (commitRecallResult(settled) === null) {
        isAdvancingRef.current = false
        return
      }
    }

    const nextNow = new Date().toISOString()
    const queue = buildReviewQueue(recallStateRef.current, nextNow, 20)
    const nextItemId = getActionableRecallItemIds(
      recallStateRef.current,
      nextNow,
      recallSessionId,
    )[0]
    const nextEntry = queue.visible.find((entry) => entry.itemId === nextItemId)
    if (nextEntry) {
      const nextIndex = learningWords.findIndex((item) => item.id === nextEntry.itemId)
      if (nextIndex >= 0) {
        activateWordQuestion(
          nextIndex,
          getRecallContextForEntry(nextEntry),
          'cloze',
          true,
          requestedMastery,
        )
      }
    } else if (nextItemId) {
      const reserved = reserveNextSameDayItem(
        recallStateRef.current,
        recallSessionId,
        nextItemId,
      )
      const reservedValue = reserved.status === 'rejected'
        ? null
        : commitRecallResult(reserved)
      if (reservedValue) {
        const nextIndex = learningWords.findIndex((item) => item.id === reservedValue.itemId)
        const item = recallStateRef.current.items[reservedValue.itemId]
        const opportunity = item.sameDayPlan?.opportunities.find(
          (entry) => entry.status === 'scheduled',
        )
        if (nextIndex >= 0) {
          activateWordQuestion(nextIndex, {
            kind: 'same-day',
            stage: 'S0',
            reason: opportunity
              ? `今天第 ${opportunity.ordinal} 次加固；已间隔 ${opportunity.offset} 道其他题`
              : '今天的薄弱词加固',
            openedLearningDay: learningDay,
          }, 'cloze', true, requestedMastery)
        }
      } else {
        const nextIndex = getNextOrdinaryWordIndex(wordIndex)
        activateWordQuestion(nextIndex, null, mode, true, requestedMastery)
      }
    } else {
      const nextIndex = getNextOrdinaryWordIndex(wordIndex)
      activateWordQuestion(nextIndex, null, mode, true, requestedMastery)
    }

    window.setTimeout(() => {
      isAdvancingRef.current = false
    }, 0)
  }

  function handleSubmitAction() {
    if (isAnswerRevealed) {
      advanceToNextWord(false)
      return
    }

    if (result === 'correct') {
      advanceToNextWord(!hasRevealedAnswer)
      return
    }

    if (remainingIndexes.length > 0) {
      const firstRemainingIndex = remainingIndexes[0]
      const message = `还差 ${remainingIndexes.length} 个字母，请继续填写。`
      setFeedback({ kind: 'incomplete', message })
      setLiveMessage(message)
      focusAnswerAt(firstRemainingIndex)
      return
    }

    const candidateAnswer = composeClozeAnswer(word.word, hintState.revealedIndexes, userLetters)
    const isCorrect = compatibleAnswers.some(
      (answer) => answer.toLocaleLowerCase() === candidateAnswer.toLocaleLowerCase(),
    )

    if (!isOnline) {
      const message = '当前离线：输入已保留，但答案不会结算或推进掌握；联网后请再次检查。'
      setFeedback({ kind: 'filtered', message })
      setLiveMessage(message)
      setRecallStatusMessage(message)
      return
    }

    if (isCorrect) {
      const isAssisted = hasRevealedAnswer || hintUsed || hadIncorrectSubmission
      const message = hasRevealedAnswer
        ? '查看后练习答对！本次不计独立拼写正确或掌握收益。再次按 Enter 或选择下一题继续。'
        : hadIncorrectSubmission
          ? '已经改对；本次完整错误证据仍会保留，不推进掌握阶段。再次按 Enter 或选择下一题继续。'
          : hintUsed
            ? '辅助练习答对；因为使用过提示字母，本次不推进掌握阶段。再次按 Enter 或选择下一题继续。'
            : recallContext?.kind === 'same-day'
              ? '今日加固完成！跨日掌握检查从下一学习日开始。再次按 Enter 或选择下一题继续。'
            : '独立拼写正确！本学习日可以推进当前复习阶段。再次按 Enter 或选择下一题继续。'
      setResult('correct')
      setFeedback({ kind: isAssisted ? 'assisted-correct' : 'correct', message })
      setLiveMessage(message)
      if (hasRevealedAnswer && revealRecord) {
        setRevealRecord(setRevealRetryResult(revealRecord, 'correct'))
      }
      return
    }

    const message = hasRevealedAnswer
      ? '辅助练习还没答对，请直接修改后重试；本题仍不计独立答对。'
      : '再检查一下拼写，你可以直接修改后重试。'
    const currentAttempt = ensureRecallAttempt()
    if (!currentAttempt) return
    const captured = recordIncorrectSubmission(
      recallStateRef.current,
      { attemptId, complete: true, inputSnapshot: candidateAnswer },
      getRecallEnv(),
    )
    if (commitRecallResult(captured, '已登记完整拼写错误，并安排薄弱词加固。') === null) {
      return
    }
    setResult('incorrect')
    setHadIncorrectSubmission(true)
    setFeedback({ kind: 'incorrect', message })
    setLiveMessage(message)
    if (hasRevealedAnswer && revealRecord) {
      setRevealRecord(setRevealRetryResult(revealRecord, 'incorrect'))
    }
  }

  function handleAnswerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    handleSubmitAction()
  }

  function handleAnswerKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return
    if (isAnswerRevealed) return

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const direction = event.key === 'ArrowLeft' ? -1 : 1
      const nextCursor = getAdjacentEditableIndex(word.word, hintState.revealedIndexes, cursorIndex, direction)
      focusAnswerAt(nextCursor, result !== 'incorrect')
      if (result === 'incorrect') {
        enterEditingState(`已进入修改中。${getCursorAnnouncement(nextCursor)}。`)
      }
      return
    }

    if (event.key === 'Backspace') {
      event.preventDefault()
      handleBackspace()
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      if (!event.repeat) handleSubmitAction()
    }
  }

  function handleAnswerPaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()
    if (result === 'correct' || isAnswerRevealed) return

    const pasteResult = pasteClozeValue(
      word.word,
      hintState.revealedIndexes,
      userLetters,
      cursorIndex,
      event.clipboardData.getData('text'),
    )

    if (pasteResult.mode === 'rejected') {
      const message = '粘贴内容与当前槽位或提示字母不兼容，原有输入已保留。'
      enterEditingState(message)
      return
    }

    setUserLetters(pasteResult.userLetters)
    setCursorIndex(pasteResult.cursorIndex)
    scrollSlotIntoView(pasteResult.cursorIndex)
    setResult('idle')
    if (hasRevealedAnswer && revealRecord) {
      setRevealRecord(setRevealRetryResult(revealRecord, 'in-progress'))
    }

    const filteredCopy = pasteResult.rejectedCount > 0
      ? `，另有 ${pasteResult.rejectedCount} 个字符未进入槽位`
      : ''
    const message = pasteResult.mode === 'full'
      ? `已按完整答案结构填入${filteredCopy}。`
      : `已从当前槽填入 ${pasteResult.acceptedCount} 个字母${filteredCopy}。`
    setFeedback({ kind: pasteResult.rejectedCount > 0 ? 'filtered' : 'editing', message })
    setLiveMessage(message)
  }

  function handleSlotPointerDown(
    event: PointerEvent<HTMLSpanElement>,
    characterIndex: number,
    isEditable: boolean,
  ) {
    event.preventDefault()
    if (isAnswerRevealed) {
      resultSummaryRef.current?.focus({ preventScroll: true })
      return
    }

    if (result === 'correct') {
      answerInputRef.current?.focus({ preventScroll: true })
      return
    }

    if (isEditable) {
      focusAnswerAt(characterIndex, result !== 'incorrect')
      if (result === 'incorrect') {
        enterEditingState(`已进入修改中。${getCursorAnnouncement(characterIndex)}。`)
      }
      return
    }

    const nextEditableIndex = getAdjacentEditableIndex(
      word.word,
      hintState.revealedIndexes,
      characterIndex,
      1,
    )
    const safeIndex = getLetterIndexes(word.word).includes(nextEditableIndex ?? -1)
      && !hintState.revealedIndexes.includes(nextEditableIndex ?? -1)
      ? nextEditableIndex
      : getFirstEditableIndex(word.word, hintState.revealedIndexes, userLetters)
    focusAnswerAt(safeIndex, result !== 'incorrect')
    if (result === 'incorrect') {
      enterEditingState(`已进入修改中。${getCursorAnnouncement(safeIndex)}。`)
    }
  }

  function handleSlotGroupPointerDown(event: PointerEvent<HTMLSpanElement>) {
    if (event.target instanceof Element && event.target.closest('[data-slot-index]')) return
    event.preventDefault()

    if (isAnswerRevealed) {
      resultSummaryRef.current?.focus({ preventScroll: true })
      return
    }

    const safeIndex = cursorIndex
      ?? getFirstEditableIndex(word.word, hintState.revealedIndexes, userLetters)
    focusAnswerAt(safeIndex, result !== 'incorrect')
    if (result === 'incorrect') {
      enterEditingState(`已进入修改中。${getCursorAnnouncement(safeIndex)}。`)
    }
  }

  function handleMoreHint() {
    if (isAnswerRevealed) return
    if (!moreHintUpdate) {
      const message = '当前答案已无更多可用提示。'
      setFeedback({ kind: 'hint', message })
      setLiveMessage(message)
      return
    }

    setHintUsed(true)
    setHintState(moreHintUpdate)
    moveToSafeCursor(moreHintUpdate.revealedIndexes, cursorIndex)
    const addedCount = moreHintUpdate.revealedIndexes.length - hintState.revealedIndexes.length
    const message = `已增加 ${addedCount} 个提示字母，已填内容保持不变。`
    setFeedback({ kind: 'hint', message })
    setLiveMessage(message)
  }

  function handleNewHintPattern() {
    if (isAnswerRevealed) return
    if (!rerolledHintUpdate) {
      const message = '当前答案已无其他兼容提示组合。'
      setFeedback({ kind: 'hint', message })
      setLiveMessage(message)
      return
    }

    setHintUsed(true)
    setHintState(rerolledHintUpdate)
    moveToSafeCursor(rerolledHintUpdate.revealedIndexes, cursorIndex)
    const message = '已更换空槽中的提示字母，已填内容保持不变。'
    setFeedback({ kind: 'hint', message })
    setLiveMessage(message)
  }

  const separatorPattern = getSeparatorPattern(word.word)
  const cursorAnnouncement = getCursorAnnouncement(cursorIndex)
  const learningOutcome = getLearningOutcome(result, hasRevealedAnswer, isAnswerRevealed)
  const visualResult = learningOutcome === 'correct-after-reveal'
    ? 'assisted-correct'
    : learningOutcome === 'independent-correct'
      ? hintUsed || hadIncorrectSubmission ? 'assisted-correct' : 'correct'
      : learningOutcome === 'answering'
        ? 'idle'
        : learningOutcome
  const isRetryingAfterReveal = hasRevealedAnswer && !isAnswerRevealed
  const canRevealAnswer = isRevealAnswerAvailable(mode, result, hasRevealedAnswer, isAnswerRevealed)
  const accessibleAnswerPattern = isAnswerRevealed
    ? formatAnswerForScreenReader(word.word)
    : letterHint.characters
      .map(({ character, isHinted, isSeparator }, index) => {
        if (isSeparator) return character === ' ' ? '固定空格' : `固定${character}`
        if (isHinted) return `${character.toUpperCase()}，系统提示`
        return userLetters[index] ? userLetters[index].toUpperCase() : '空槽'
      })
      .join('；')
  const resultDescription = isAnswerRevealed
    ? '正确答案，已查看；进入下一题后记为已复习、未独立答对'
    : result === 'correct' && hasRevealedAnswer
      ? '辅助练习答对；不计独立答对、正确率或熟练度收益'
      : result === 'correct' && (hintUsed || hadIncorrectSubmission)
        ? '本次答案已改对，但使用过提示或已有完整错误，不推进掌握阶段'
      : result === 'correct'
        ? '当前答案已独立答对'
        : result === 'incorrect'
          ? '当前答案错误，可直接修改'
          : feedback.kind === 'incomplete'
            ? '当前答案未完成'
            : isRetryingAfterReveal
              ? '已查看答案后的辅助练习'
              : '当前处于作答或修改中'
  const answerDescription = isAnswerRevealed
    ? [
      `句子：${beforeBlank}正确答案${afterBlank}`,
      '正确答案，已查看',
      `完整答案逐字符：${accessibleAnswerPattern}`,
      `答案共 ${letterHint.letterCount} 个英文字母`,
      separatorPattern.includes('_') && separatorPattern !== '_'.repeat(letterHint.letterCount)
        ? `固定分隔符结构：${separatorPattern}`
        : '答案中没有固定分隔符',
      resultDescription,
      '下一步可以进入下一题或重新作答本题',
    ].join('。')
    : [
      `句子：${beforeBlank}空缺${afterBlank}`,
      `答案共 ${letterHint.letterCount} 个英文字母`,
      `已输入 ${filledIndexes.length} 个`,
      `还剩 ${remainingIndexes.length} 个`,
      cursorAnnouncement || '当前没有可编辑字母槽',
      `当前答案模式：${accessibleAnswerPattern}`,
      letterHint.ariaLabel,
      separatorPattern.includes('_') && separatorPattern !== '_'.repeat(letterHint.letterCount)
        ? `固定分隔符结构：${separatorPattern}`
        : '答案中没有固定分隔符',
      resultDescription,
    ].join('。')

  const reviewQueue = useMemo(
    () => buildReviewQueue(recallState, clockNow, 20),
    [clockNow, recallState],
  )
  const recallItems = useMemo<RecallItem[]>(() => {
    const queueEntries = new Map(reviewQueue.visible.map((entry) => [entry.itemId, entry]))
    const nowDay = studyDayAt(clockNow, recallState.learningTimeZone)
    const events = Object.values(recallState.eventsByEffectKey)

    const items = Object.values(recallState.items).flatMap((item) => {
      const contentAvailable = learningWordIds.has(item.itemId)
      const queueEntry = queueEntries.get(item.itemId)
      const eligibleSameDay = isSameDayEligible(item, nowDay)
      const hasSameDayPlan = item.status === 'weak'
        && item.sameDayPlan?.studyDay === nowDay
        && item.sameDayPlan.opportunities.some((entry) => entry.status !== 'completed')
      if (
        !queueEntry
        && !hasSameDayPlan
        && item.status !== 'paused'
        && item.status !== 'data-exception'
      ) return []

      const stage = getRecallItemStage(item)
      const itemEvents = events
        .filter((event) => event.itemId === item.itemId)
        .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
      const history: RecallHistoryEntry[] = itemEvents.map((event) => {
        const resultValue = event.metadata.outcome
        const stageBefore = event.metadata.fromStage
        const stageAfter = event.metadata.toStage
        const inputSnapshot = event.metadata.inputSnapshot
        return {
          id: event.eventId,
          occurredAtLabel: formatEventDate(event.occurredAt, event.learningTimeZone),
          timezoneLabel: event.learningTimeZone,
          title: getEventTitle(event),
          description: event.type === 'reveal'
            ? '确认查看了标准答案；本次不计独立答对，并重新安排薄弱词复习。'
            : event.type === 'submitted-incorrect'
              ? '完整拼写未命中可接受答案；错误证据已保留。'
              : event.type === 'stage-advanced'
                ? '无提示、未查看答案并独立拼写正确，当前阶段已推进。'
                : event.type === 'data-exception'
                  ? String(event.metadata.detail ?? '学习记录需要恢复。')
                  : event.type === 'data-recovered'
                    ? '异常到期记录已恢复为单一当前任务；原始异常快照继续保留在本地审计信息中。'
                  : '该操作已记录在本设备的复习历史中。',
          result: isAttemptOutcome(resultValue) ? resultValue : undefined,
          stageBefore: typeof stageBefore === 'string' && stageBefore !== 'maintenance'
            ? stageBefore as RecallItem['stage']
            : undefined,
          stageAfter: typeof stageAfter === 'string' && stageAfter !== 'maintenance'
            ? stageAfter as RecallItem['stage']
            : undefined,
          nextDueLabel: typeof event.metadata.dueDay === 'string'
            ? formatStudyDay(event.metadata.dueDay, event.learningTimeZone)
            : undefined,
          assistanceLabel: event.type === 'hint-used'
            ? '使用过提示字母'
            : event.type === 'reveal'
              ? '查看过完整答案'
              : undefined,
          inputSnapshot: typeof inputSnapshot === 'string' ? inputSnapshot : undefined,
        }
      })
      const stageOrder: RecallItem['stage'][] = ['S0', 'S1', 'S2', 'S3', 'S4', 'M1']
      const currentIndex = stageOrder.indexOf(stage)
      const stageTimeline: RecallStageNode[] = stageOrder.map((nodeStage, index) => {
        const completedDay = nodeStage !== 'S0' && nodeStage !== 'M1'
          ? item.cleanStageDays[nodeStage]
          : undefined
        let status: RecallStageNode['status'] = completedDay || index < currentIndex
          ? 'completed'
          : index === currentIndex
            ? 'current'
            : 'upcoming'
        if (index === currentIndex && item.status === 'paused') status = 'paused'
        if (index === currentIndex && item.status === 'data-exception') status = 'exception'
        if (index === currentIndex && queueEntry?.kind === 'overdue') status = 'overdue'
        return {
          stage: nodeStage,
          label: getStageLabel(nodeStage),
          status,
          dateLabel: completedDay
            ? formatStudyDay(completedDay, recallState.learningTimeZone)
            : index === currentIndex
              ? formatStudyDay(
                nodeStage === 'M1' ? item.maintenanceDueDay : item.dueDay ?? item.latestWeakDay,
                recallState.learningTimeZone,
              )
              : undefined,
        }
      })
      const opportunity = item.sameDayPlan?.opportunities.find((entry) => (
        entry.status === 'scheduled'
        || entry.status === 'pending'
      ))
      const remainingSameDayGap = opportunity?.status === 'pending'
        ? Math.max(0, opportunity.offset - opportunity.otherItemsSettled)
        : 0
      const missedSameDayWindow = opportunity?.status === 'pending'
        && opportunity.otherItemsSettled > 7
      const group: RecallItem['group'] = item.status === 'paused'
        ? 'paused'
        : item.status === 'data-exception' || !contentAvailable
          ? 'exception'
          : queueEntry?.kind ?? 'same-day'
      const dueDay = queueEntry?.dueDay
        ?? (stage === 'M1' ? item.maintenanceDueDay : item.dueDay)

      return [{
        id: item.itemId,
        word: item.targetAnswer,
        meaning: item.meaning,
        group,
        stage,
        stageLabel: getStageLabel(stage),
        reason: queueEntry?.reason
          ?? (item.status === 'paused'
            ? '学习项已暂停，阶段和历史保持不变'
            : item.status === 'data-exception' || !contentAvailable
              ? '记录异常，不计错也不推进阶段'
              : opportunity
                ? missedSameDayWindow
                  ? '本会话已错过 3～7 道题的合格窗口，将留到下一会话或下一学习日'
                  : remainingSameDayGap > 0
                  ? `今天第 ${opportunity.ordinal} 次加固还需完成 ${remainingSameDayGap} 道其他学习项，避免紧邻重复`
                  : `今天第 ${opportunity.ordinal} 次加固已满足 ${opportunity.offset} 道题间隔`
                : '今天的薄弱词加固'),
        dueLabel: queueEntry?.kind === 'overdue'
          ? `${formatStudyDay(dueDay, recallState.learningTimeZone)} · 已逾期`
          : eligibleSameDay
            ? '现在可练习'
            : missedSameDayWindow
              ? '等待下一会话或下一学习日'
            : hasSameDayPlan
              ? `等待间隔 · 还差 ${remainingSameDayGap} 道题`
              : formatStudyDay(dueDay, recallState.learningTimeZone),
        nextDueLabel: formatStudyDay(dueDay, recallState.learningTimeZone),
        recentResultLabel: itemEvents[0] ? getEventTitle(itemEvents[0]) : undefined,
        pausedUntilLabel: item.pause
          ? formatStudyDay(item.pause.resumeDay, recallState.learningTimeZone)
          : undefined,
        exceptionMessage: !contentAvailable
          ? `${item.dataException?.detail ?? '记录异常'}；当前题库中找不到对应学习内容，因此不能恢复或开始作答`
          : item.dataException?.detail,
        recoveryAvailable: contentAvailable && Boolean(item.dataException?.previous),
        movedToQueueTail: Boolean(item.queueTailAfterByDay?.[nowDay]),
        startDisabled: hasSameDayPlan && !eligibleSameDay,
        startDisabledLabel: hasSameDayPlan && !eligibleSameDay
          ? missedSameDayWindow
            ? '等待下一会话'
            : `再学 ${remainingSameDayGap} 题后可练`
          : undefined,
        stageTimeline,
        history,
      }]
    })
    const actionablePosition = new Map(
      getActionableRecallItemIds(recallState, clockNow, recallSessionId)
        .map((itemId, index) => [itemId, index]),
    )
    const groupPosition: Record<RecallItem['group'], number> = {
      overdue: 0,
      'due-today': 1,
      'same-day': 2,
      paused: 3,
      exception: 4,
    }
    return items.sort((left, right) => {
      const leftPosition = actionablePosition.get(left.id)
      const rightPosition = actionablePosition.get(right.id)
      if (leftPosition !== undefined || rightPosition !== undefined) {
        if (leftPosition === undefined) return 1
        if (rightPosition === undefined) return -1
        return leftPosition - rightPosition
      }
      return groupPosition[left.group] - groupPosition[right.group]
        || left.id.localeCompare(right.id)
    })
  }, [clockNow, recallSessionId, recallState, reviewQueue])
  const settledRecallAttempts = Object.values(recallState.attempts).filter((attempt) => (
    attempt.context !== 'ordinary' && attempt.outcome
  ))
  const independentCorrectCount = settledRecallAttempts.filter(
    (attempt) => attempt.outcome === 'clean-independent-correct',
  ).length
  const sameDayItems = Object.values(recallState.items).filter((item) => (
    item.status === 'weak'
    && item.sameDayPlan?.studyDay === learningDay
    && item.sameDayPlan.opportunities.some((opportunity) => opportunity.status !== 'completed')
  ))
  const sameDayCount = sameDayItems.length
  const sameDayReadyCount = sameDayItems.filter((item) => isSameDayEligible(item, learningDay)).length
  const recallSummary = {
    overdueCount: reviewQueue.totalOverdueCount,
    dueTodayCount: reviewQueue.totalDueTodayCount,
    sameDayCount,
    sameDayReadyCount,
    sameDayWaitingCount: sameDayCount - sameDayReadyCount,
    remainingOverdueCount: reviewQueue.remainingOverdueCount,
    remainingDueTodayCount: reviewQueue.remainingDueTodayCount,
    independentCorrectCount,
    settledIndependentAttemptCount: settledRecallAttempts.length,
    anomalyCount: Object.values(recallState.items).filter((item) => item.status === 'data-exception').length,
    isOffline: !isOnline,
  }
  const reminderDecision = useMemo(() => evaluateRecallReminder(recallState, {
    now: clockNow,
    connectivity: getConnectivity(isOnline),
    permission: notificationPermission,
  }), [clockNow, isOnline, notificationPermission, recallState])
  const reminderSettings: RecallReminderSettings = {
    enabled: recallState.reminderSettings.enabled && !recallState.reminderSettings.paused,
    time: recallState.reminderSettings.localTime,
    quietStart: recallState.reminderSettings.quietStart,
    quietEnd: recallState.reminderSettings.quietEnd,
    timezone: recallState.learningTimeZone,
    timezoneOptions: [],
    permission: notificationPermission === 'prompt' ? 'not-requested' : notificationPermission,
    externalNotificationMode: notificationPermission === 'granted'
      ? 'browser-ready'
      : 'in-app-only',
    statusText: describeReminderStatus(
      reminderDecision,
      recallState.reminderSettings.localTime,
      recallState.learningTimeZone,
    ),
  }
  const timezoneChange = recallState.pendingDeviceTimeZone
    ? {
      learningTimezone: recallState.learningTimeZone,
      learningTimezoneLabel: recallState.learningTimeZone,
      deviceTimezone: recallState.pendingDeviceTimeZone,
      deviceTimezoneLabel: recallState.pendingDeviceTimeZone,
    }
    : null

  useEffect(() => {
    if (reminderDecision.kind !== 'request-browser-notification') return
    if (notificationRequestedDayRef.current === reminderDecision.forStudyDay) return
    if (typeof window.Notification === 'undefined' || window.Notification.permission !== 'granted') return

    try {
      const browserNotification = new window.Notification('AI English Learning · 该复习了', {
        body: '今天仍有到期英语复习，打开学习中心即可继续。',
        tag: `ai-english-learning-recall-${reminderDecision.forStudyDay}`,
      })
      notificationRequestedDayRef.current = reminderDecision.forStudyDay
      browserNotification.onclick = () => {
        window.focus()
        setRecallDialog((current) => ({ ...current, open: true, view: 'queue' }))
      }
      const recorded = recordRecallReminderRequest(recallStateRef.current, {
        now: clockNow,
        connectivity: getConnectivity(isOnline),
        permission: notificationPermission,
      })
      if (commitRecallResult(
        recorded,
        '已向浏览器请求一次复习通知；本地只记录“已请求”，不声称已经送达。',
      ) === null) {
        setRecallStatusMessage('浏览器已接收通知请求，但本地记录未保存；本页面不会重复请求。')
      }
    } catch {
      setRecallStatusMessage('浏览器通知请求失败；页面内待复习状态仍然保留。')
    }
  }, [
    clockNow,
    commitRecallResult,
    isOnline,
    notificationPermission,
    reminderDecision,
  ])

  function changeRecallView(view: RecallCenterView) {
    setRecallDialog((current) => ({ ...current, view }))
  }

  function handleSkipRecallItem(itemId: string) {
    const result = skipRecallItem(recallStateRef.current, itemId, new Date().toISOString())
    const skipCount = commitRecallResult(result)
    if (!skipCount) return
    setRecallStatusMessage(
      skipCount === 1
        ? '已移到当前队列末尾；本次不计对错。'
        : '已安排到下一个学习日；原到期原因仍会保留。',
    )
  }

  function handlePauseRecallItem(itemId: string, learningDays: 1 | 3 | 7 | 30) {
    const result = pauseRecallItem(
      recallStateRef.current,
      { itemId, learningDays },
      new Date().toISOString(),
    )
    if (commitRecallResult(result, `已暂停 ${learningDays} 个学习日；阶段与历史保持不变。`)) {
      setRecallDialog((current) => ({ ...current, view: 'queue' }))
    }
  }

  function handleResumeRecallItem(itemId: string) {
    commitRecallResult(
      resumeRecallItem(recallStateRef.current, itemId, new Date().toISOString()),
      '已提前恢复，回到暂停前阶段；没有补造暂停期复习。',
    )
  }

  function handleRecoverRecallItem(itemId: string) {
    if (!learningWordIds.has(itemId)) {
      setRecallStatusMessage('当前题库中找不到这条学习内容，不能安全恢复；原始记录继续保留。')
      return
    }
    const recovered = commitRecallResult(
      recoverDataException(recallStateRef.current, itemId, new Date().toISOString()),
      '异常记录已恢复为单一当前任务；原始异常快照仍保留，不会补造多个阶段。',
    )
    if (recovered) {
      setRecallDialog((current) => ({ ...current, view: 'queue' }))
    }
  }

  function handleConfirmRecallReset(itemId: string) {
    const value = commitRecallResult(
      resetRecallMastery(
        recallStateRef.current,
        { itemId, confirmed: true },
        new Date().toISOString(),
      ),
      '掌握进度已回到薄弱待加固；重置前历史完整保留。',
    )
    if (value) {
      setRecallDialog((current) => ({ ...current, resetConfirmationItemId: null }))
    }
  }

  function handleReminderChange(settings: RecallReminderSettings) {
    commitRecallResult(
      updateReminderSettings(recallStateRef.current, {
        enabled: settings.enabled,
        paused: !settings.enabled,
        localTime: settings.time,
        quietStart: settings.quietStart,
        quietEnd: settings.quietEnd,
      }),
      settings.enabled
        ? `提醒偏好已保存为 ${settings.time}；通知只会在真实到期且满足权限与免打扰规则时请求。`
        : '已暂停提醒；到期任务仍会真实累计。',
    )

    if (
      settings.enabled
      && notificationPermission === 'prompt'
      && typeof window.Notification !== 'undefined'
    ) {
      void window.Notification.requestPermission().then((permission) => {
        setNotificationPermission(permission === 'default' ? 'prompt' : permission)
        setRecallStatusMessage(
          permission === 'granted'
            ? '浏览器通知权限已允许；到期时最多请求一次，且不会伪记为已送达。'
            : '浏览器通知未授权；页面内待复习状态仍会正常显示。',
        )
      }).catch(() => {
        setNotificationPermission('denied')
        setRecallStatusMessage('浏览器通知权限请求失败；页面内待复习状态仍会正常显示。')
      })
    }
  }

  function handleActiveRecallSkip() {
    if (!recallContext) return
    const beforeRevision = recallStateRef.current.revision
    handleSkipRecallItem(wordKey)
    if (recallStateRef.current.revision === beforeRevision) return
    const now = new Date().toISOString()
    const nextItemId = getActionableRecallItemIds(
      recallStateRef.current,
      now,
      recallSessionId,
    ).find((itemId) => itemId !== wordKey)
    if (nextItemId) {
      startRecallItem(nextItemId)
      return
    }
    activateWordQuestion(getNextOrdinaryWordIndex(wordIndex), null, 'cloze')
  }

  return (
    <div className="word-page">
      <div className="word-aqua-backdrop" aria-hidden="true" />

      <header className="word-header">
        <button type="button" className="plain-icon-button" onClick={() => navigate('/')} aria-label="返回首页">
          <Icon name="arrow-left" size={31} />
        </button>
        <div className="word-progress">
          <strong>{completed}/50</strong>
          <div
            className="word-progress__track"
            role="progressbar"
            aria-label={`单词进度 ${completed}/50`}
            aria-valuemin={0}
            aria-valuemax={50}
            aria-valuenow={completed}
          >
            <span style={{ width: progress }} />
          </div>
          <div className="word-progress__steps" aria-hidden="true">
            <span className="is-active" />
            <span />
            <span />
          </div>
        </div>
      </header>

      <div className="recall-center-shell">
        <RecallCenter
          summary={recallSummary}
          items={recallItems}
          dialog={recallDialog}
          reminder={reminderSettings}
          timezoneChange={timezoneChange}
          statusMessage={recallStatusMessage}
          truthBoundaryText={recallStorageStatus === 'ready'
            ? '复习记录只保存在当前浏览器与当前设备，不承诺跨设备同步；离线时不会结算或推进掌握。'
            : recallStorageStatus === 'conflict'
              ? '检测到另一页面更新，当前页面已停止覆盖；请刷新后继续。'
              : recallStorageStatus === 'corrupt'
                ? '检测到本地记录异常，原始数据已保留且不会被覆盖；异常项不计错。'
                : '浏览器存储当前不可用，本页不会把内存状态冒充为已保存或已同步。'}
          actions={{
            onStartReview: startNextAvailableReview,
            onViewQueue: () => setRecallDialog((current) => ({
              ...current,
              open: true,
              view: 'queue',
            })),
            onClose: () => setRecallDialog((current) => ({
              ...current,
              open: false,
              resetConfirmationItemId: null,
            })),
            onViewChange: changeRecallView,
            onSelectItem: (itemId) => setRecallDialog((current) => ({
              ...current,
              selectedItemId: itemId,
            })),
            onStartItem: startRecallItem,
            onSkipItem: handleSkipRecallItem,
            onPauseItem: handlePauseRecallItem,
            onResumeItem: handleResumeRecallItem,
            onRecoverItem: handleRecoverRecallItem,
            onRequestReset: (itemId) => setRecallDialog((current) => ({
              ...current,
              resetConfirmationItemId: itemId,
            })),
            onCancelReset: () => setRecallDialog((current) => ({
              ...current,
              resetConfirmationItemId: null,
            })),
            onConfirmReset: handleConfirmRecallReset,
            onReminderChange: handleReminderChange,
            onKeepLearningTimezone: () => {
              commitRecallResult(
                keepLearningTimeZone(recallStateRef.current),
                '继续使用原学习时区；历史与未来计划均未静默改写。',
              )
            },
            onSwitchToDeviceTimezone: () => {
              const pendingTimeZone = recallStateRef.current.pendingDeviceTimeZone
              if (!pendingTimeZone) return
              commitRecallResult(
                switchLearningTimeZone(
                  recallStateRef.current,
                  pendingTimeZone,
                  new Date().toISOString(),
                ),
                `学习时区已切换为 ${pendingTimeZone}；既有历史未改写。`,
              )
            },
            onDeferTimezoneChange: () => {
              setRecallStatusMessage('已暂缓决定；复习计划继续使用原学习时区。')
              setRecallDialog((current) => ({ ...current, view: 'queue' }))
            },
          }}
        />
      </div>

      <main className={`word-layout${mode === 'cloze' ? ' word-layout--cloze' : ''}`}>
        {mode === 'study' ? (
          <article className="word-card">
            <ModeSwitch mode={mode} onChange={handleModeChange} />
            <button
              type="button"
              className="pronounce-button"
              aria-label={`播放 ${word.word} 的发音`}
              onClick={() => speakText(word.word)}
            >
              <Icon name="speaker-high" size={23} />
            </button>
            <h1>{word.word}</h1>
            <p className="word-card__phonetic">{word.phonetic}</p>
            <p className="word-card__meaning">
              <strong>{word.part}</strong> {word.meaning}
            </p>
            <div className="word-card__examples">
              {word.examples.map((example) => (
                <p key={example}>{highlightWord(example, word.word)}</p>
              ))}
            </div>
          </article>
        ) : (
          <article className="word-card cloze-card">
            <ModeSwitch mode={mode} onChange={handleModeChange} />
            {recallContext && (
              <aside className="recall-attempt-banner" aria-label="当前复习任务">
                <div>
                  <span>{recallContext.stage ?? '复习'}</span>
                  <strong>{recallContext.reason}</strong>
                  <small>本题从无提示字母开始；提示、查看答案或完整错误都会保留，但不会推进掌握。</small>
                </div>
                <button type="button" onClick={handleActiveRecallSkip}>跳过本题</button>
              </aside>
            )}
            <p className="cloze-card__eyebrow">句中拼写练习</p>
            <h1>拼写填空</h1>
            <p className="cloze-card__instruction">在句子空缺处直接输入，提示字母会保持不变。</p>

            <form className="cloze-form" onSubmit={handleAnswerSubmit}>
              <label className="visually-hidden" htmlFor="cloze-answer">补全句子中的英文单词</label>
              <div id="cloze-question" className="cloze-sentence">
                <span>{beforeBlank}</span>
                <strong className="cloze-answer-slot">
                  <span
                    ref={slotGroupRef}
                    className={`cloze-letter-pattern cloze-letter-pattern--${visualResult}${isAnswerFocused ? ' is-focused' : ''}`}
                    data-testid="cloze-slot-group"
                    onPointerDown={handleSlotGroupPointerDown}
                  >
                    {letterHint.characters.map(({ character, isHinted, isSeparator }, index) => {
                      const userCharacter = userLetters[index] ?? ''
                      const isEditable = !isAnswerRevealed && !isHinted && !isSeparator
                      const isCurrent = isAnswerFocused && cursorIndex === index && isEditable
                      const slotClassName = [
                        'cloze-letter-pattern__slot',
                        isHinted && !isSeparator && !isAnswerRevealed ? 'is-hinted' : '',
                        isSeparator ? 'is-separator' : '',
                        userCharacter && !isAnswerRevealed ? 'is-user-filled' : '',
                        isAnswerRevealed && !isSeparator ? 'is-revealed' : '',
                        isCurrent ? 'is-current' : '',
                      ].filter(Boolean).join(' ')

                      const slot = (
                        <span
                          key={`${character}-${index}`}
                          className={slotClassName}
                          data-slot-index={index}
                          data-slot-kind={isSeparator ? 'separator' : isAnswerRevealed ? 'revealed' : isHinted ? 'hint' : userCharacter ? 'user' : 'empty'}
                          aria-hidden="true"
                          onPointerDown={(event) => handleSlotPointerDown(event, index, isEditable)}
                        >
                          {isAnswerRevealed ? character : isSeparator ? character : isHinted ? character : userCharacter}
                        </span>
                      )

                      if (attachedPunctuation && index === letterHint.characters.length - 1) {
                        return (
                          <span className="cloze-letter-pattern__tail" key={`${character}-${index}-tail`}>
                            {slot}
                            <span className="cloze-letter-pattern__punctuation" aria-hidden="true">
                              {attachedPunctuation}
                            </span>
                          </span>
                        )
                      }

                      return slot
                    })}
                    <input
                      ref={answerInputRef}
                      id="cloze-answer"
                      className="cloze-slot-input"
                      type="text"
                      value=""
                      onChange={(event) => handleTextInput(event.currentTarget.value)}
                      onKeyDown={handleAnswerKeyDown}
                      onPaste={handleAnswerPaste}
                      onFocus={() => {
                        setIsAnswerFocused(true)
                        if (cursorIndex === null) {
                          setCursorIndex(getFirstEditableIndex(word.word, hintState.revealedIndexes, userLetters))
                        }
                      }}
                      onBlur={() => setIsAnswerFocused(false)}
                      aria-label={isAnswerRevealed ? '正确答案，已查看' : '补全句子中的英文单词'}
                      aria-invalid={!isAnswerRevealed && result === 'incorrect'}
                      aria-readonly={isAnswerRevealed}
                      aria-describedby="cloze-answer-description cloze-translation cloze-feedback"
                      aria-controls="cloze-feedback"
                      readOnly={isAnswerRevealed}
                      tabIndex={isAnswerRevealed ? -1 : 0}
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      inputMode="text"
                      enterKeyHint={result === 'correct' || isAnswerRevealed ? 'next' : 'done'}
                    />
                  </span>
                </strong>
                <span>{afterBlankRemainder}</span>
                {isAnswerRevealed ? (
                  <span className="cloze-letter-meta cloze-letter-meta--revealed" aria-hidden="true">
                    <span className="cloze-letter-meta__status">
                      <Icon name="magnifying-glass" size={16} />
                      正确答案 · 已查看
                    </span>
                    <span>只读</span>
                  </span>
                ) : (
                  <span className="cloze-letter-meta" aria-hidden="true">
                    <span>已填 {filledIndexes.length}</span>
                    <span>还差 {remainingIndexes.length}</span>
                    <span>提示 {letterHint.revealedCount}</span>
                  </span>
                )}
              </div>
              {hintUsed && !isAnswerRevealed && (
                <p className="cloze-assistance-badge" role="status">
                  已使用提示 · 本次不推进掌握阶段
                </p>
              )}
              <p id="cloze-translation" className="cloze-translation">{word.clozeTranslation}</p>
              <p id="cloze-answer-description" className="visually-hidden">{answerDescription}</p>

              <div
                ref={resultSummaryRef}
                className={`cloze-feedback cloze-feedback--${feedback.kind}`}
                id="cloze-feedback"
                data-testid="cloze-feedback"
                tabIndex={-1}
                aria-describedby="cloze-answer-description"
              >
                {isRetryingAfterReveal && !isAnswerRevealed && (
                  <p className="cloze-assist-context">
                    <Icon name="book-open" size={19} />
                    已查看答案后的辅助练习
                  </p>
                )}
                {feedback.message && (
                  <p>
                    {feedback.kind === 'correct' && <Icon name="check-circle" size={20} />}
                    {feedback.kind === 'assisted-correct' && <Icon name="check-circle" size={20} />}
                    {feedback.kind === 'incorrect' && <Icon name="target" size={20} />}
                    {feedback.kind === 'revealed' && <Icon name="magnifying-glass" size={20} />}
                    {feedback.message}
                  </p>
                )}
              </div>

              <button className="cloze-primary-action" type="submit" data-testid="cloze-primary-action">
                {result === 'correct' || isAnswerRevealed ? '下一题' : '检查答案'}
              </button>

              {isAnswerRevealed && (
                <button
                  type="button"
                  className="cloze-retry-action"
                  onClick={handleRetryRevealedAnswer}
                >
                  重新作答本题
                </button>
              )}

              {!isAnswerRevealed && result !== 'correct' && (
                <div className="cloze-hint-actions">
                  <button
                    type="button"
                    className="hint-button"
                    onClick={handleMoreHint}
                    disabled={!moreHintUpdate}
                  >
                    {moreHintUpdate ? '再提示一些' : '当前已无更多提示'}
                  </button>
                  <button
                    type="button"
                    className="hint-button hint-button--secondary"
                    onClick={handleNewHintPattern}
                    disabled={!rerolledHintUpdate}
                  >
                    {rerolledHintUpdate ? '换一组字母' : '暂无兼容提示组合'}
                  </button>
                  {canRevealAnswer && (
                    <button
                      ref={revealTriggerRef}
                      type="button"
                      className="cloze-reveal-action"
                      onClick={handleOpenRevealDialog}
                      aria-haspopup="dialog"
                      aria-controls="reveal-answer-dialog"
                    >
                      查看答案
                    </button>
                  )}
                </div>
              )}
            </form>
            <p id="cloze-live-status" className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
              {liveMessage}
            </p>
          </article>
        )}

        {mode === 'study' && <aside className="examples-panel">
          <h2>例句与联想</h2>
          <div className="examples-panel__body">
            <article className="image-example-card">
              <img src={cherryBlossoms} alt="春日蓝天下的淡粉色樱花" />
              <div>
                <h3>{word.imageTitle}</h3>
                <p>{word.imageCaption}</p>
                <small>{word.examples[1]}</small>
              </div>
            </article>

            <div className="word-meta-stack">
              <section>
                <h3>相关词</h3>
                <div className="tag-list">
                  {word.tags.map((tag) => <span key={tag}>{tag}</span>)}
                </div>
              </section>
              <section>
                <h3>同义词</h3>
                <div className="tag-list">
                  {word.synonyms.map((synonym) => <span key={synonym}>{synonym}</span>)}
                </div>
              </section>
              <section className="memory-tip">
                <Icon name="check-circle" size={22} />
                <p>进入下一词前，先朗读一遍例句。</p>
              </section>
            </div>
          </div>
        </aside>}
      </main>

      {mode === 'study' && (
        <footer className="word-actions">
          <button type="button" className="secondary-pill" onClick={() => advanceToNextWord(false)}>
            还不认识
          </button>
          <button type="button" className="primary-pill" onClick={() => advanceToNextWord(true)}>
            下一个单词
          </button>
        </footer>
      )}

      <dialog
        ref={revealDialogRef}
        id="reveal-answer-dialog"
        className="reveal-answer-dialog"
        aria-labelledby="reveal-answer-title"
        aria-describedby="reveal-answer-description"
        onCancel={(event) => {
          event.preventDefault()
          handleCancelReveal()
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return
          event.preventDefault()
          handleCancelReveal()
        }}
        onClose={() => setIsRevealDialogOpen(false)}
      >
        <div className="reveal-answer-dialog__icon" aria-hidden="true">
          <Icon name="bell" size={24} />
        </div>
        <div className="reveal-answer-dialog__copy">
          <h2 id="reveal-answer-title">查看正确答案？</h2>
          <p id="reveal-answer-description">
            查看后，本题不会计为独立答对，也不会提高正确率或熟练度。
          </p>
        </div>
        <div className="reveal-answer-dialog__actions">
          <button ref={revealContinueRef} type="button" onClick={handleCancelReveal}>
            继续作答
          </button>
          <button type="button" className="is-confirm" onClick={handleConfirmReveal}>
            查看答案
          </button>
        </div>
      </dialog>
    </div>
  )
}

export default Word
