import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import avatarAlex from '../assets/ui/avatar-alex.png'
import settingsAnalytics from '../assets/ui/settings-analytics.png'
import Icon, { type IconName } from '../components/Icon'
import Sidebar from '../components/Sidebar'
import { useLearningStore } from '../store/useLearningStore'

type SettingRowProps = {
  icon: IconName
  title: string
  value?: ReactNode
  onClick?: () => void
}

type ProfileSection = 'account' | 'stats' | 'theme' | 'app' | 'about'

type ProfileSectionInfo = {
  title: string
  eyebrow: string
  description: string
  icon: IconName
}

const PROFILE_SECTIONS: Record<ProfileSection, ProfileSectionInfo> = {
  account: {
    title: '账户与设置',
    eyebrow: 'PERSONAL LEARNING SPACE',
    description: '管理个人资料、学习提醒和练习偏好。',
    icon: 'sliders-horizontal',
  },
  stats: {
    title: '学习统计',
    eyebrow: 'LEARNING ANALYTICS',
    description: '查看词汇积累、学习时长和最近 12 周趋势。',
    icon: 'chart-bar',
  },
  theme: {
    title: '主题与体验',
    eyebrow: 'APPEARANCE & EXPERIENCE',
    description: '切换深色模式，并调整声音、翻译与自动播放。',
    icon: 'palette',
  },
  app: {
    title: 'App 资料',
    eyebrow: 'APPLICATION PROFILE',
    description: 'AI English Learning · Web 体验版 · v1.0.0',
    icon: 'user-circle',
  },
  about: {
    title: '关于我们',
    eyebrow: 'ABOUT AI ENGLISH LEARNING',
    description: '用自然对话和情境练习，让英语学习更轻松、更持续。',
    icon: 'chat-circle-dots',
  },
}

function isProfileSection(value: string | null): value is ProfileSection {
  return value !== null && Object.hasOwn(PROFILE_SECTIONS, value)
}

function SettingRow({ icon, title, value, onClick }: SettingRowProps) {
  const content = (
    <>
      <span className="mobile-setting-row__icon"><Icon name={icon} size={25} /></span>
      <span>{title}</span>
      {value ?? <Icon name="caret-right" size={22} />}
    </>
  )

  if (value) {
    return <div className="mobile-setting-row">{content}</div>
  }

  return (
    <button type="button" className="mobile-setting-row" onClick={onClick}>
      {content}
    </button>
  )
}

type SwitchProps = {
  checked: boolean
  onChange: () => void
  label: string
}

function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      className={`switch${checked ? ' is-on' : ''}`}
      onClick={onChange}
      aria-pressed={checked}
      aria-label={label}
    >
      <span />
    </button>
  )
}

function Profile() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const knownWords = useLearningStore((state) => state.knownWords)
  const settings = useLearningStore((state) => state.settings)
  const toggleSetting = useLearningStore((state) => state.toggleSetting)
  const [notice, setNotice] = useState('')
  const noticeTimerRef = useRef<number | undefined>(undefined)
  const requestedSection = searchParams.get('section')
  const activeSection: ProfileSection = isProfileSection(requestedSection) ? requestedSection : 'account'
  const sectionInfo = PROFILE_SECTIONS[activeSection]

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      document.getElementById(`profile-${activeSection}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [activeSection])

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current !== undefined) {
        window.clearTimeout(noticeTimerRef.current)
      }
    }
  }, [])

  function showNotice(message: string) {
    if (noticeTimerRef.current !== undefined) {
      window.clearTimeout(noticeTimerRef.current)
    }

    setNotice(message)
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice('')
      noticeTimerRef.current = undefined
    }, 2200)
  }

  return (
    <div className="profile-page">
      <Sidebar mode="settings" />

      <main className="profile-content">
        <header className="mobile-profile-header">
          <button type="button" className="plain-icon-button" onClick={() => navigate('/')} aria-label="返回首页">
            <Icon name="arrow-left" size={29} />
          </button>
          <h1>{sectionInfo.title}</h1>
          <button type="button" className="plain-icon-button" onClick={() => showNotice('资料已是最新状态')} aria-label="个人资料选项">
            <Icon name="dots-three" size={28} />
          </button>
        </header>

        <section className={`profile-identity${activeSection === 'account' ? ' is-section-focus' : ''}`}>
          <span className="profile-identity__avatar">
            <img src={avatarAlex} alt="Alex Chen" />
          </span>
          <div>
            <h1>Alex Chen</h1>
            <p>ID: 12545679 · Level B1</p>
          </div>
        </section>

        <section className={`profile-stats${activeSection === 'stats' ? ' is-section-focus' : ''}`} aria-label="学习统计">
          <article className="profile-stat profile-stat--aqua">
            <Icon name="book-open" size={27} />
            <small>掌握单词</small>
            <strong>{knownWords}</strong>
            <span>累计词汇</span>
          </article>
          <article className="profile-stat profile-stat--purple">
            <Icon name="clock" size={27} className="icon--light" />
            <small>学习时长</small>
            <strong>32.6</strong>
            <span>小时</span>
          </article>
          <article className="profile-stat profile-stat--purple">
            <Icon name="target" size={27} className="icon--light" />
            <small>目标完成</small>
            <strong>68%</strong>
            <span>本周进度</span>
          </article>
        </section>

        <section className="mobile-settings-list">
          <SettingRow icon="book-open" title="学习设置" onClick={() => navigate('/profile?section=account#profile-account')} />
          <SettingRow
            icon="bell"
            title="通知设置"
            value={
              <Switch
                checked={settings.dailyReminder}
                onChange={() => toggleSetting('dailyReminder')}
                label="每日提醒"
              />
            }
          />
          <SettingRow
            icon="moon"
            title="深色模式"
            value={
              <Switch
                checked={settings.darkMode}
                onChange={() => toggleSetting('darkMode')}
                label="深色模式"
              />
            }
          />
          <SettingRow icon="chart-bar" title="学习报告" onClick={() => navigate('/profile?section=stats#profile-stats')} />
          <SettingRow icon="user-circle" title="账号管理" onClick={() => navigate('/profile?section=account#profile-account')} />
          <SettingRow icon="chat-circle-dots" title="关于我们" onClick={() => navigate('/profile?section=about#profile-about')} />
        </section>

        <button type="button" className="logout-button" onClick={() => showNotice('演示模式不会退出账号')}>
          <Icon name="sign-out" size={25} className="icon--light" />
          Logout
        </button>

        <section className="settings-dashboard" data-section={activeSection}>
          <header className="settings-dashboard__header">
            <div>
              <p>{sectionInfo.eyebrow}</p>
              <h1>{sectionInfo.title}</h1>
            </div>
            <button type="button" className="dashboard-avatar" onClick={() => showNotice('资料已是最新状态')}>
              <img src={avatarAlex} alt="" />
              <span>Alex Chen</span>
            </button>
          </header>

          <section
            id={`profile-${activeSection}`}
            className={`profile-section-summary${['account', 'app', 'about'].includes(activeSection) ? ' is-section-focus' : ''}`}
            aria-label={`${sectionInfo.title}概览`}
          >
            <span className="profile-section-summary__icon"><Icon name={sectionInfo.icon} size={24} /></span>
            <div>
              <strong>{sectionInfo.title}</strong>
              <p>{sectionInfo.description}</p>
            </div>
          </section>

          <section className={`analytics-card${activeSection === 'stats' ? ' is-section-focus' : ''}`}>
            <div className="analytics-card__titles">
              <span>
                <p>过去 12 周</p>
                <h2>学习活动图</h2>
              </span>
              <span>
                <p>平均每周 +18%</p>
                <h2>学习趋势</h2>
              </span>
            </div>
            <img src={settingsAnalytics} alt="紫色学习活动热力图和学习趋势折线图" />
          </section>

          <div className="desktop-setting-panels">
            <section className="setting-panel">
              <div className="setting-panel__title">
                <span className="setting-panel__icon"><Icon name="bell" size={24} /></span>
                <div>
                  <p>REMINDERS</p>
                  <h2>学习提醒</h2>
                </div>
              </div>
              <label>
                每日学习提醒
                <Switch
                  checked={settings.dailyReminder}
                  onChange={() => toggleSetting('dailyReminder')}
                  label="每日学习提醒"
                />
              </label>
              <label>
                每周进度报告
                <Switch
                  checked={settings.weeklyReport}
                  onChange={() => toggleSetting('weeklyReport')}
                  label="每周进度报告"
                />
              </label>
              <label className="range-row">
                练习强度
                <input type="range" min="0" max="100" defaultValue="62" aria-label="练习强度" />
              </label>
              <label>
                鼓励消息
                <Switch
                  checked={settings.motivation}
                  onChange={() => toggleSetting('motivation')}
                  label="鼓励消息"
                />
              </label>
              <label>
                安静时段
                <Switch
                  checked={settings.quietMode}
                  onChange={() => toggleSetting('quietMode')}
                  label="安静时段"
                />
              </label>
            </section>

            <section className={`setting-panel${activeSection === 'theme' ? ' is-section-focus' : ''}`}>
              <div className="setting-panel__title">
                <span className="setting-panel__icon"><Icon name="palette" size={24} /></span>
                <div>
                  <p>EXPERIENCE</p>
                  <h2>体验偏好</h2>
                </div>
              </div>
              <label>
                发音即时反馈
                <Switch
                  checked={settings.soundFeedback}
                  onChange={() => toggleSetting('soundFeedback')}
                  label="发音即时反馈"
                />
              </label>
              <label>
                深色模式
                <Switch
                  checked={settings.darkMode}
                  onChange={() => toggleSetting('darkMode')}
                  label="深色模式"
                />
              </label>
              <label className="range-row">
                提示音量
                <input type="range" min="0" max="100" defaultValue="48" aria-label="提示音量" />
              </label>
              <label>
                自动播放示范
                <Switch
                  checked={settings.autoPlay}
                  onChange={() => toggleSetting('autoPlay')}
                  label="自动播放示范"
                />
              </label>
              <label>
                默认显示翻译
                <Switch
                  checked={settings.showTranslations}
                  onChange={() => toggleSetting('showTranslations')}
                  label="默认显示翻译"
                />
              </label>
            </section>
          </div>
        </section>

        {notice && <div className="toast" role="status">{notice}</div>}
      </main>
    </div>
  )
}

export default Profile
