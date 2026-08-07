import {
  Clock3,
  Database,
  Radar,
  Unplug,
  UserRound,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

import styles from './App.module.css'

const SNAPSHOT_TIME = '2026年8月4日 17:25（北京时间）'

const navigationItems = [
  { label: '今日雷达', path: '/today', enabled: true },
  { label: '全部事件', path: '/events', enabled: false },
  { label: '来源目录', path: '/sources', enabled: false },
  { label: '偏好与反馈', path: '/preferences', enabled: false },
  { label: '质量说明', path: '/quality', enabled: false },
] as const

function TruthStatusBar() {
  const accessibleStatus = `演示数据 · 人工快照 · 截至 ${SNAPSHOT_TIME} · 未连接自动采集服务`

  return (
    <section
      className={styles.truthBar}
      aria-label={accessibleStatus}
      role="status"
    >
      <div className={styles.truthBarInner} aria-hidden="true">
        <span className={styles.truthItem}>
          <Database size={16} strokeWidth={1.9} />
          演示数据
        </span>
        <span className={styles.truthItem}>
          <UserRound size={16} strokeWidth={1.9} />
          人工快照
        </span>
        <span className={styles.truthItem}>
          <Clock3 size={16} strokeWidth={1.9} />
          截至 {SNAPSHOT_TIME}
        </span>
        <span className={styles.truthItem}>
          <Unplug size={16} strokeWidth={1.9} />
          未连接自动采集服务
        </span>
      </div>
    </section>
  )
}

export function App() {
  return (
    <div className={styles.app}>
      <a className={styles.skipLink} href="#main-content">
        跳到主要内容
      </a>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand} aria-label="AI Model Radar">
            <span className={styles.brandIcon} aria-hidden="true">
              <Radar size={26} strokeWidth={2} />
            </span>
            <span>
              <strong className={styles.brandName}>AI Model Radar</strong>
              <span className={styles.brandSubtitle}>AI 模型动态雷达</span>
            </span>
          </div>

          <nav className={styles.navigation} aria-label="一级导航">
            <ul className={styles.navigationList}>
              {navigationItems.map((item) => (
                <li key={item.path}>
                  {item.enabled ? (
                    <NavLink
                      className={({ isActive }) =>
                        `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                      }
                      to={item.path}
                      end
                    >
                      {item.label}
                    </NavLink>
                  ) : (
                    <button
                      className={styles.navLink}
                      type="button"
                      disabled
                      aria-label={`${item.label}，后续任务`}
                    >
                      <span>{item.label}</span>
                      <span className={styles.navLater}>后续任务</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <TruthStatusBar />

      <main id="main-content" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <p>
          当前版本只提供今日雷达首条中性演示内容；完整事件、来源与质量能力将在后续任务中实现。
        </p>
      </footer>
    </div>
  )
}
