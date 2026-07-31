import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import cherryBlossoms from '../assets/ui/cherry-blossoms.png'
import Icon from '../components/Icon'
import { learningWords } from '../data/content'
import { useLearningStore } from '../store/useLearningStore'
import { speakText } from '../utils/speech'

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

type ModeSwitchProps = {
  mode: PracticeMode
  onChange: (mode: PracticeMode) => void
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
  const [mode, setMode] = useState<PracticeMode>('study')
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<AnswerResult>('idle')
  const [showHint, setShowHint] = useState(false)
  const answerInputRef = useRef<HTMLInputElement>(null)
  const word = learningWords[wordIndex]
  const progress = `${Math.round((completed / 50) * 100)}%`

  useEffect(() => {
    setAnswer('')
    setResult('idle')
    setShowHint(false)

    if (mode === 'cloze') {
      answerInputRef.current?.focus()
    }
  }, [mode, wordIndex])

  function handleAnswerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (result === 'correct') {
      nextWord(true)
      return
    }

    const normalizedAnswer = answer.trim().toLocaleLowerCase()
    setResult(normalizedAnswer === word.word.toLocaleLowerCase() ? 'correct' : 'incorrect')
  }

  const [beforeBlank, afterBlank] = word.clozeSentence.split('{{blank}}')

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

      <main className="word-layout">
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
            <p className="cloze-card__instruction">根据句意，填写缺少的英文单词。</p>

            <div id="cloze-question" className="cloze-sentence" aria-label="填空题">
              <span>{beforeBlank}</span>
              <strong>
                <span aria-hidden="true">________</span>
                <span className="visually-hidden">空格</span>
              </strong>
              <span>{afterBlank}</span>
            </div>
            <p id="cloze-translation" className="cloze-translation">{word.clozeTranslation}</p>

            <form className="cloze-form" onSubmit={handleAnswerSubmit}>
              <label htmlFor="cloze-answer">请输入答案</label>
              <div className={`cloze-input-row cloze-input-row--${result}`}>
                <input
                  ref={answerInputRef}
                  id="cloze-answer"
                  value={answer}
                  onChange={(event) => {
                    setAnswer(event.target.value)
                    if (result !== 'idle') setResult('idle')
                  }}
                  aria-invalid={result === 'incorrect'}
                  aria-describedby="cloze-question cloze-translation cloze-feedback"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="在这里输入英文单词"
                />
                <button type="submit" disabled={!answer.trim() && result !== 'correct'}>
                  {result === 'correct' ? '下一题' : '检查答案'}
                </button>
              </div>

              <div className="cloze-feedback" id="cloze-feedback" role="status" aria-live="polite">
                {result === 'correct' && (
                  <p className="is-correct"><Icon name="check-circle" size={20} /> 回答正确，做得很好！</p>
                )}
                {result === 'incorrect' && (
                  <p className="is-incorrect">答案还不对，请检查拼写后再试一次。</p>
                )}
                {result === 'idle' && showHint && (
                  <p>提示：答案以 <strong>{word.word[0].toUpperCase()}</strong> 开头，共 {word.word.length} 个字母。</p>
                )}
              </div>

              {result !== 'correct' && (
                <button type="button" className="hint-button" onClick={() => setShowHint(true)}>
                  显示提示
                </button>
              )}
            </form>
          </article>
        )}

        <aside className="examples-panel">
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
        </aside>
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
