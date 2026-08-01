import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import avatarAlex from '../assets/ui/avatar-alex.png'
import avatarTutor from '../assets/ui/avatar-tutor.png'
import Icon from '../components/Icon'
import { chatContacts, type ChatContactId } from '../data/content'
import { useLearningStore } from '../store/useLearningStore'
import { speakText } from '../utils/speech'
import './Chat.interactions.css'

const DEFAULT_CONTACT_ID = chatContacts[0].id
const MOCK_TRANSCRIPT = 'I went hiking with some friends.'
const contactAvatars = {
  tutor: avatarTutor,
  alex: avatarAlex,
}

function Chat() {
  const navigate = useNavigate()
  const chatThreads = useLearningStore((state) => state.chatThreads)
  const isRecording = useLearningStore((state) => state.isRecording)
  const sendMessage = useLearningStore((state) => state.sendMessage)
  const clearChat = useLearningStore((state) => state.clearChat)
  const restartChat = useLearningStore((state) => state.restartChat)
  const toggleRecording = useLearningStore((state) => state.toggleRecording)
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [selectedContact, setSelectedContact] = useState<ChatContactId>(DEFAULT_CONTACT_ID)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [interactionStatus, setInteractionStatus] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const statusTimerRef = useRef<number | null>(null)

  const activeContact = chatContacts.find((contact) => contact.id === selectedContact) ?? chatContacts[0]
  const messages = chatThreads[selectedContact]
  const activeAvatar = contactAvatars[activeContact.avatar]

  const filteredContacts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return chatContacts

    return chatContacts.filter((contact) =>
      `${contact.name} ${contact.level}`.toLowerCase().includes(normalizedQuery),
    )
  }, [query])

  function showStatus(message: string) {
    if (statusTimerRef.current !== null) {
      window.clearTimeout(statusTimerRef.current)
    }

    setInteractionStatus(message)
    statusTimerRef.current = window.setTimeout(() => {
      setInteractionStatus('')
      statusTimerRef.current = null
    }, 3600)
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, selectedContact])

  useEffect(() => () => {
    if (statusTimerRef.current !== null) {
      window.clearTimeout(statusTimerRef.current)
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }, [])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.trim()) return
    sendMessage(selectedContact, draft)
    setDraft('')
    showStatus(`消息已发送给 ${activeContact.name}，AI 已给出回复`)
  }

  function handleContactSelect(contactId: ChatContactId) {
    if (isRecording) toggleRecording()
    setSelectedContact(contactId)
    setIsMenuOpen(false)
    const contact = chatContacts.find((item) => item.id === contactId)
    showStatus(`已切换到${contact?.level ?? '这段'}对话`)
  }

  function handleNewChat() {
    if (isRecording) toggleRecording()
    restartChat(DEFAULT_CONTACT_ID)
    setSelectedContact(DEFAULT_CONTACT_ID)
    setDraft('')
    setQuery('')
    setIsMenuOpen(false)
    showStatus('已发起新的日常口语对话')
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleClearChat() {
    clearChat(selectedContact)
    setDraft('')
    setIsMenuOpen(false)
    showStatus(`已清空 ${activeContact.name} 的当前对话`)
  }

  function handleRestartChat() {
    restartChat(selectedContact)
    setDraft('')
    setIsMenuOpen(false)
    showStatus(`已重新开始 ${activeContact.level} 练习`)
  }

  function handleEmojiInsert() {
    const input = inputRef.current
    const start = input?.selectionStart ?? draft.length
    const end = input?.selectionEnd ?? draft.length
    const nextDraft = `${draft.slice(0, start)}🙂${draft.slice(end)}`
    setDraft(nextDraft)
    showStatus('已插入表情')

    window.setTimeout(() => {
      input?.focus()
      input?.setSelectionRange(start + 2, start + 2)
    }, 0)
  }

  function handleRecording() {
    if (isRecording) {
      toggleRecording()
      setDraft((currentDraft) =>
        currentDraft.trim() ? `${currentDraft.trim()} ${MOCK_TRANSCRIPT}` : MOCK_TRANSCRIPT,
      )
      showStatus(`本地模拟识别完成：${MOCK_TRANSCRIPT}`)
      window.setTimeout(() => inputRef.current?.focus(), 0)
      return
    }

    toggleRecording()
    showStatus('本地模拟录音中；再次点击即可生成示例文字，不会请求麦克风权限')
  }

  function handleSpeak(text: string, label: string) {
    const didStart = speakText(text)
    showStatus(didStart ? `正在朗读${label}` : '当前浏览器不支持语音朗读')
  }

  return (
    <div className="chat-page">
      <aside className="contact-panel" aria-label="聊天列表">
        <header>
          <h1>Chat</h1>
          <button
            type="button"
            className="plain-icon-button"
            aria-label="发起新聊天"
            onClick={handleNewChat}
          >
            <Icon name="chat-circle-dots" size={25} />
          </button>
        </header>
        <label className="contact-search">
          <Icon name="magnifying-glass" size={20} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索对话"
            aria-label="搜索对话"
          />
        </label>
        <div className="contact-list">
          {filteredContacts.map((contact) => (
            <button
              type="button"
              key={contact.id}
              className={`contact-row${selectedContact === contact.id ? ' is-active' : ''}`}
              onClick={() => handleContactSelect(contact.id)}
              aria-current={selectedContact === contact.id ? 'true' : undefined}
            >
              <img src={contactAvatars[contact.avatar]} alt={`${contact.name} 头像`} />
              <span>
                <strong>{contact.name}</strong>
                <small>{contact.level}</small>
              </span>
              <time>{contact.time}</time>
            </button>
          ))}
          {filteredContacts.length === 0 && (
            <p className="contact-empty">没有找到匹配的对话</p>
          )}
        </div>
      </aside>

      <main className="conversation-panel">
        <header className="conversation-header">
          <button
            type="button"
            className="plain-icon-button mobile-only"
            onClick={() => navigate('/')}
            aria-label="返回首页"
          >
            <Icon name="arrow-left" size={29} />
          </button>
          <div className="conversation-person">
            <img src={activeAvatar} alt={`${activeContact.name} 头像`} />
            <div className="conversation-person__copy">
              <h1>{activeContact.name}</h1>
              <p><span aria-hidden="true" /> {activeContact.level} · AI English Tutor</p>
            </div>
          </div>
          <div className="conversation-options">
            <button
              type="button"
              className="plain-icon-button"
              aria-label="聊天选项"
              aria-expanded={isMenuOpen}
              aria-controls="conversation-options-menu"
              onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
            >
              <Icon name="dots-three" size={30} />
            </button>
            {isMenuOpen && (
              <div id="conversation-options-menu" className="conversation-menu" role="menu">
                <button type="button" role="menuitem" onClick={handleNewChat}>发起新对话</button>
                <button type="button" role="menuitem" onClick={handleRestartChat}>重新开始当前练习</button>
                <button type="button" role="menuitem" onClick={handleClearChat}>清空当前对话</button>
              </div>
            )}
          </div>
        </header>

        <div className="message-list" aria-live="polite">
          <time className="conversation-time">{activeContact.time}</time>
          {messages.length === 0 && (
            <div className="empty-conversation">
              <strong>当前对话已清空</strong>
              <p>输入英文继续聊天，或从右上角菜单重新开始练习。</p>
            </div>
          )}
          {messages.map((message) => {
            const isTutor = message.sender === 'tutor'
            return (
              <article
                key={`${selectedContact}-${message.id}`}
                className={`message-row message-row--${message.sender}`}
              >
                <img
                  src={isTutor ? activeAvatar : avatarAlex}
                  alt={isTutor ? activeContact.name : 'Alex'}
                />
                <div className="message-bubble">
                  <p>{message.text}</p>
                  {isTutor && (
                    <button
                      type="button"
                      aria-label={`播放 ${activeContact.name} 的消息`}
                      onClick={() => handleSpeak(message.text, '导师消息')}
                    >
                      <Icon name="speaker-high" size={19} className="icon--light" />
                    </button>
                  )}
                </div>
              </article>
            )
          })}
          <div ref={endRef} />
        </div>

        {interactionStatus && (
          <p className="chat-interaction-status" role="status">{interactionStatus}</p>
        )}

        <form className="message-composer" onSubmit={handleSubmit}>
          <button
            type="button"
            className={`record-button${isRecording ? ' is-recording' : ''}`}
            onClick={handleRecording}
            aria-pressed={isRecording}
            aria-label={isRecording ? '停止本地模拟录音' : '开始本地模拟录音'}
          >
            <Icon name="microphone" size={27} className="icon--light" />
          </button>
          <div className="message-input">
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={isRecording ? '本地模拟录音中，再次点击停止…' : '输入英文，或点击麦克风练习…'}
              aria-label="聊天消息"
            />
            <button type="button" aria-label="插入表情" onClick={handleEmojiInsert}>
              <Icon name="smiley" size={25} />
            </button>
            <button type="submit" aria-label="发送消息" disabled={!draft.trim()}>
              <Icon name="paper-plane-right" size={24} />
            </button>
          </div>
        </form>
      </main>

      <aside className="feedback-panel" aria-label="AI 反馈">
        <section>
          <div className="feedback-panel__heading">
            <span>
              <p>PRONUNCIATION</p>
              <h2>发音反馈</h2>
            </span>
            <strong>86</strong>
          </div>
          <p>Your rhythm sounds natural. Give the final consonant in “friends” a little more space.</p>
          <div className="sound-buttons">
            <button
              type="button"
              aria-label="播放你的模拟发音"
              onClick={() => handleSpeak('I went hiking with some friends.', '你的模拟发音')}
            >
              <Icon name="speaker-high" size={22} />
            </button>
            <button
              type="button"
              aria-label="播放标准发音"
              onClick={() => handleSpeak('I went hiking with some friends.', '标准发音')}
            >
              <Icon name="speaker-high" size={22} />
            </button>
          </div>
        </section>

        <section>
          <p className="eyebrow">LIVE TIP</p>
          <h2>表达更自然</h2>
          <p>Try “I went hiking with some friends” to make the sentence feel more conversational.</p>
        </section>

        <section>
          <p className="eyebrow">USEFUL PHRASES</p>
          <h2>推荐表达</h2>
          <ul>
            <li>That sounds lovely.</li>
            <li>On the way there...</li>
            <li>The best part was...</li>
            <li>I was impressed by...</li>
          </ul>
        </section>
      </aside>
    </div>
  )
}

export default Chat
