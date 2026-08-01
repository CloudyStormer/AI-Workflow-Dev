import { useNavigate } from 'react-router-dom'
import avatarAlex from '../assets/ui/avatar-alex.png'
import learningNews from '../assets/ui/learning-news.png'
import ActionCard from '../components/ActionCard'
import Icon from '../components/Icon'
import Sidebar from '../components/Sidebar'
import { useLearningStore } from '../store/useLearningStore'

function Home() {
  const navigate = useNavigate()
  const learnedToday = useLearningStore((state) => state.learnedToday)
  const streakDays = useLearningStore((state) => state.streakDays)

  return (
    <div className="home-page">
      <Sidebar />

      <section className="home-main">
        <header className="home-header">
          <button type="button" className="profile-button" onClick={() => navigate('/profile?section=account')}>
            <span className="avatar-ring">
              <img src={avatarAlex} alt="Alex Chen" />
            </span>
            <span className="profile-button__copy">
              <strong>Alex</strong>
              <small>Good morning</small>
            </span>
          </button>

          <button
            type="button"
            className="settings-button"
            onClick={() => navigate('/profile?section=account#profile-account')}
            aria-label="打开设置"
          >
            <Icon name="gear-six" size={34} />
            <span>设置</span>
          </button>
        </header>

        <div className="home-copy">
          <p>YOUR DAILY PRACTICE</p>
          <h1>今天想学点什么？</h1>
        </div>

        <div className="home-actions">
          <ActionCard to="/word" icon="book-open" title="背单词" subtitle="用例句记住高频词" />
          <ActionCard to="/chat" icon="microphone" title="练口语" subtitle="和 AI 导师自然对话" />
        </div>

        <footer className="home-mobile-summary" aria-label="今日学习数据">
          今日已学习 <strong>{learnedToday}</strong> 个单词
          <span aria-hidden="true" />
          连续学习 <strong>{streakDays}</strong> 天
        </footer>
      </section>

      <aside className="home-insights" aria-label="学习概览">
        <section className="insight-card streak-card">
          <span className="insight-card__icon">
            <Icon name="fire" size={26} />
          </span>
          <div>
            <p>Daily streak</p>
            <strong>{streakDays}</strong>
            <small>days in a row</small>
          </div>
        </section>

        <section className="insight-card news-card">
          <div className="insight-card__heading">
            <div>
              <p>News feed</p>
              <h2>Today&apos;s learning picks</h2>
            </div>
            <Icon name="caret-right" size={22} />
          </div>
          <div className="news-card__story">
            <img src={learningNews} alt="English study notebook and headphones" />
            <p>5-minute listening: sound more natural in everyday conversations.</p>
          </div>
          <ul>
            <li>Three phrases for talking about your weekend</li>
            <li>Why repeating aloud helps new words stick</li>
          </ul>
        </section>

        <section className="insight-card goal-card">
          <span className="insight-card__icon">
            <Icon name="target" size={26} />
          </span>
          <div className="goal-card__title">
            <p>Goal track</p>
            <strong>671</strong>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="本周目标进度 67%"
            aria-valuemin={0}
            aria-valuemax={500}
            aria-valuenow={335}
          >
            <span style={{ width: '67%' }} />
          </div>
          <div className="goal-card__meta">
            <span>Weekly goal</span>
            <span>335 / 500 XP</span>
          </div>
        </section>
      </aside>
    </div>
  )
}

export default Home
