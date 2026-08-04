import {
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
  buildLetterHint,
  buildLetterHintFromIndexes,
  createHintVariant,
  getMoreCompatibleHint,
  getRerolledCompatibleHint,
} from '../utils/wordHints'

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
type AnswerResult = 'idle' | 'correct' | 'incorrect'
type FeedbackKind = 'idle' | 'incomplete' | 'incorrect' | 'correct' | 'editing' | 'filtered' | 'hint'

type FeedbackState = {
  kind: FeedbackKind
  message: string
}

type HintState = {
  level: number
  variant: number
  revealedIndexes: number[]
}

type ModeSwitchProps = {
  mode: PracticeMode
  onChange: (mode: PracticeMode) => void
}

function createInitialHintState(answer: string): HintState {
  const variant = createHintVariant()
  const hint = buildLetterHint(answer, 1, variant)

  return {
    level: hint.level,
    variant,
    revealedIndexes: hint.revealedIndexes,
  }
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
  const wordIndex = useLearningStore((state) => state.wordIndex)
  const completed = useLearningStore((state) => state.sessionCompleted)
  const nextWord = useLearningStore((state) => state.nextWord)
  const word = learningWords[wordIndex]
  const wordKey = `${wordIndex}:${word.word}`
  const [mode, setMode] = useState<PracticeMode>('study')
  const [userLetters, setUserLetters] = useState<ClozeUserLetters>({})
  const [result, setResult] = useState<AnswerResult>('idle')
  const [feedback, setFeedback] = useState<FeedbackState>({ kind: 'idle', message: '' })
  const [liveMessage, setLiveMessage] = useState('')
  const [hintState, setHintState] = useState<HintState>(() => createInitialHintState(word.word))
  const [cursorIndex, setCursorIndex] = useState<number | null>(() =>
    getFirstEditableIndex(word.word, hintState.revealedIndexes, {}),
  )
  const [isAnswerFocused, setIsAnswerFocused] = useState(false)
  const answerInputRef = useRef<HTMLInputElement>(null)
  const slotGroupRef = useRef<HTMLSpanElement>(null)
  const activeWordKeyRef = useRef(wordKey)
  const isAdvancingRef = useRef(false)
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

  useEffect(() => {
    if (activeWordKeyRef.current === wordKey) return

    const nextHintState = createInitialHintState(word.word)
    activeWordKeyRef.current = wordKey
    isAdvancingRef.current = false
    setUserLetters({})
    setResult('idle')
    setFeedback({ kind: 'idle', message: '' })
    setHintState(nextHintState)
    setCursorIndex(getFirstEditableIndex(word.word, nextHintState.revealedIndexes, {}))
    setLiveMessage('已进入下一题，答案输入已重置。')
  }, [word.word, wordKey])

  useEffect(() => {
    if (mode !== 'cloze') {
      setIsAnswerFocused(false)
      return
    }

    const frame = requestAnimationFrame(() => answerInputRef.current?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(frame)
  }, [mode, wordKey])

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
    if (index === null) return
    setCursorIndex(index)
    answerInputRef.current?.focus({ preventScroll: true })
    scrollSlotIntoView(index)
    if (announce) setLiveMessage(`${getCursorAnnouncement(index)}。`)
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
    if (result === 'correct') return

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
    if (result === 'correct') return

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

  function advanceToNextWord() {
    if (isAdvancingRef.current) return
    isAdvancingRef.current = true
    nextWord(true)
  }

  function handleSubmitAction() {
    if (result === 'correct') {
      advanceToNextWord()
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

    if (isCorrect) {
      const message = '回答正确，做得很好！再次按 Enter 或选择下一题继续。'
      setResult('correct')
      setFeedback({ kind: 'correct', message })
      setLiveMessage(message)
      return
    }

    const message = '再检查一下拼写，你可以直接修改后重试。'
    setResult('incorrect')
    setFeedback({ kind: 'incorrect', message })
    setLiveMessage(message)
  }

  function handleAnswerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    handleSubmitAction()
  }

  function handleAnswerKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return

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
    if (result === 'correct') return

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

    const safeIndex = cursorIndex
      ?? getFirstEditableIndex(word.word, hintState.revealedIndexes, userLetters)
    focusAnswerAt(safeIndex, result !== 'incorrect')
    if (result === 'incorrect') {
      enterEditingState(`已进入修改中。${getCursorAnnouncement(safeIndex)}。`)
    }
  }

  function handleMoreHint() {
    if (!moreHintUpdate) {
      const message = '当前答案已无更多可用提示。'
      setFeedback({ kind: 'hint', message })
      setLiveMessage(message)
      return
    }

    setHintState(moreHintUpdate)
    moveToSafeCursor(moreHintUpdate.revealedIndexes, cursorIndex)
    const addedCount = moreHintUpdate.revealedIndexes.length - hintState.revealedIndexes.length
    const message = `已增加 ${addedCount} 个提示字母，已填内容保持不变。`
    setFeedback({ kind: 'hint', message })
    setLiveMessage(message)
  }

  function handleNewHintPattern() {
    if (!rerolledHintUpdate) {
      const message = '当前答案已无其他兼容提示组合。'
      setFeedback({ kind: 'hint', message })
      setLiveMessage(message)
      return
    }

    setHintState(rerolledHintUpdate)
    moveToSafeCursor(rerolledHintUpdate.revealedIndexes, cursorIndex)
    const message = '已更换空槽中的提示字母，已填内容保持不变。'
    setFeedback({ kind: 'hint', message })
    setLiveMessage(message)
  }

  const separatorPattern = getSeparatorPattern(word.word)
  const cursorAnnouncement = getCursorAnnouncement(cursorIndex)
  const accessibleAnswerPattern = letterHint.characters
    .map(({ character, isHinted, isSeparator }, index) => {
      if (isSeparator) return character === ' ' ? '固定空格' : `固定${character}`
      if (isHinted) return `${character.toUpperCase()}，系统提示`
      return userLetters[index] ? userLetters[index].toUpperCase() : '空槽'
    })
    .join('；')
  const resultDescription = result === 'correct'
    ? '当前答案正确'
    : result === 'incorrect'
      ? '当前答案错误，可直接修改'
      : feedback.kind === 'incomplete'
        ? '当前答案未完成'
        : '当前处于作答或修改中'
  const answerDescription = [
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

      <main className={`word-layout${mode === 'cloze' ? ' word-layout--cloze' : ''}`}>
        {mode === 'study' ? (
          <article className="word-card">
            <ModeSwitch mode={mode} onChange={setMode} />
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
            <ModeSwitch mode={mode} onChange={setMode} />
            <p className="cloze-card__eyebrow">FILL IN THE BLANK</p>
            <h1>拼写填空</h1>
            <p className="cloze-card__instruction">在句子空缺处直接输入，提示字母会保持不变。</p>

            <form className="cloze-form" onSubmit={handleAnswerSubmit}>
              <label className="visually-hidden" htmlFor="cloze-answer">补全句子中的英文单词</label>
              <div id="cloze-question" className="cloze-sentence">
                <span>{beforeBlank}</span>
                <strong className="cloze-answer-slot">
                  <span
                    ref={slotGroupRef}
                    className={`cloze-letter-pattern cloze-letter-pattern--${result}${isAnswerFocused ? ' is-focused' : ''}`}
                    data-testid="cloze-slot-group"
                    onPointerDown={handleSlotGroupPointerDown}
                  >
                    {letterHint.characters.map(({ character, isHinted, isSeparator }, index) => {
                      const userCharacter = userLetters[index] ?? ''
                      const isEditable = !isHinted && !isSeparator
                      const isCurrent = isAnswerFocused && cursorIndex === index && isEditable
                      const slotClassName = [
                        'cloze-letter-pattern__slot',
                        isHinted && !isSeparator ? 'is-hinted' : '',
                        isSeparator ? 'is-separator' : '',
                        userCharacter ? 'is-user-filled' : '',
                        isCurrent ? 'is-current' : '',
                      ].filter(Boolean).join(' ')

                      return (
                        <span
                          key={`${character}-${index}`}
                          className={slotClassName}
                          data-slot-index={index}
                          data-slot-kind={isSeparator ? 'separator' : isHinted ? 'hint' : userCharacter ? 'user' : 'empty'}
                          aria-hidden="true"
                          onPointerDown={(event) => handleSlotPointerDown(event, index, isEditable)}
                        >
                          {isSeparator ? character : isHinted ? character : userCharacter}
                        </span>
                      )
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
                      aria-label="补全句子中的英文单词"
                      aria-invalid={result === 'incorrect'}
                      aria-describedby="cloze-answer-description cloze-translation cloze-feedback"
                      aria-controls="cloze-feedback"
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      inputMode="text"
                      enterKeyHint={result === 'correct' ? 'next' : 'done'}
                    />
                  </span>
                </strong>
                <span>{afterBlank}</span>
                <span className="cloze-letter-meta" aria-hidden="true">
                  <span>已填 {filledIndexes.length}</span>
                  <span>还差 {remainingIndexes.length}</span>
                  <span>提示 {letterHint.revealedCount}</span>
                </span>
              </div>
              <p id="cloze-translation" className="cloze-translation">{word.clozeTranslation}</p>
              <p id="cloze-answer-description" className="visually-hidden">{answerDescription}</p>

              <div
                className={`cloze-feedback cloze-feedback--${feedback.kind}`}
                id="cloze-feedback"
                data-testid="cloze-feedback"
              >
                {feedback.message && (
                  <p>
                    {feedback.kind === 'correct' && <Icon name="check-circle" size={20} />}
                    {feedback.kind === 'incorrect' && <Icon name="target" size={20} />}
                    {feedback.message}
                  </p>
                )}
              </div>

              <button className="cloze-primary-action" type="submit" data-testid="cloze-primary-action">
                {result === 'correct' ? '下一题' : '检查答案'}
              </button>

              {result !== 'correct' && (
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
                </div>
              )}
            </form>
            <p id="cloze-live-status" className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
              {liveMessage}
            </p>
          </article>
        )}

        {mode === 'study' && <aside className="examples-panel">
          <h2>Examples</h2>
          <div className="examples-panel__body">
            <article className="image-example-card">
              <img src={cherryBlossoms} alt="Pale cherry blossoms against a blue spring sky" />
              <div>
                <h3>{word.imageTitle}</h3>
                <p>{word.imageCaption}</p>
                <small>{word.examples[1]}</small>
              </div>
            </article>

            <div className="word-meta-stack">
              <section>
                <h3>Word family</h3>
                <div className="tag-list">
                  {word.tags.map((tag) => <span key={tag}>{tag}</span>)}
                </div>
              </section>
              <section>
                <h3>Synonyms</h3>
                <div className="tag-list">
                  {word.synonyms.map((synonym) => <span key={synonym}>{synonym}</span>)}
                </div>
              </section>
              <section className="memory-tip">
                <Icon name="check-circle" size={22} />
                <p>Say the example aloud before moving on.</p>
              </section>
            </div>
          </div>
        </aside>}
      </main>

      {mode === 'study' && (
        <footer className="word-actions">
          <button type="button" className="secondary-pill" onClick={() => nextWord(false)}>
            Don&apos;t Know
          </button>
          <button type="button" className="primary-pill" onClick={() => nextWord(true)}>
            Next Word
          </button>
        </footer>
      )}
    </div>
  )
}

export default Word
