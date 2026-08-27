import {
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  ChartNoAxesCombined,
  ChevronDown,
  CircleAlert,
  FileSearch,
  Layers3,
  LockKeyhole,
  Radar,
  UserRoundSearch,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

import styles from './App.module.css'

const navigationItems = [
  { number: '01', label: '职业方向总览', path: '/directions', icon: ChartNoAxesCombined },
  { number: '02', label: '技术栈全景', path: '/stacks', icon: Layers3 },
  { number: '03', label: '招聘证据', path: '/evidence', icon: BriefcaseBusiness },
  { number: '04', label: 'AI 增量', path: '/ai-increment', icon: Bot },
  { number: '05', label: '信息源工作台', path: '/source-workbench', icon: FileSearch },
  { number: '06', label: '个人证据准备', path: '/personal-evidence', icon: UserRoundSearch },
] as const

const mobileNavigationItems = [
  { number: '01', label: '方向', path: '/directions', icon: ChartNoAxesCombined },
  { number: '02', label: '技术栈', path: '/stacks', icon: Layers3 },
  { number: '05', label: '信息源', path: '/source-workbench', icon: FileSearch },
  { number: '…', label: '更多', path: '/more', icon: BriefcaseBusiness },
] as const

export function RouteLoadingState() {
  return (
    <section className={styles.routeState} aria-live="polite" role="status">
      <span className={styles.loadingMark} aria-hidden="true" />
      <div>
        <strong>正在加载页面内容</strong>
        <p>证据快照和范围声明仍保持可见。</p>
      </div>
    </section>
  )
}

function EvidenceSnapshotBar() {
  const status = '研究快照 v1.0 · 证据截止 2026年8月3日 · 10 个核心目的样本：国内 4、公开远程 6 · 另有 2 个边界样本 · 不是市场份额'

  return (
    <section className={styles.snapshotBar} aria-label={status} role="status">
      <div className={styles.snapshotInner} aria-hidden="true">
        <span className={styles.snapshotPrimary}>
          <FileSearch size={16} strokeWidth={1.9} />
          研究快照 v1.0
        </span>
        <span>
          <CalendarClock size={16} strokeWidth={1.9} />
          截止 2026年8月3日
        </span>
        <span>核心目的样本 10 · 国内 4 / 公开远程 6</span>
        <span>边界样本 2</span>
        <span className={styles.snapshotWarning}>
          <CircleAlert size={16} strokeWidth={1.9} />
          不是市场份额
        </span>
      </div>
      <details className={styles.mobileSnapshot}>
        <summary>
          <span>快照 · 2026-08-03 · 目的样本 10</span>
          <ChevronDown size={17} strokeWidth={2} aria-hidden="true" />
        </summary>
        <div>
          <p>国内 4 · 公开远程 6 · 边界样本 2</p>
          <strong>目的抽样，不是市场份额</strong>
        </div>
      </details>
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
          <div className={styles.brand} aria-label="Frontend Career Radar 前端职业成长雷达">
            <span className={styles.brandIcon} aria-hidden="true">
              <Radar size={27} strokeWidth={2} />
            </span>
            <span>
              <strong className={styles.brandName}>Frontend Career Radar</strong>
              <span className={styles.brandSubtitle}>前端职业成长雷达</span>
            </span>
          </div>

          <div className={styles.localOnly}>
            <LockKeyhole size={15} strokeWidth={1.9} aria-hidden="true" />
            本地真实服务
          </div>
        </div>

        <nav className={styles.navigation} aria-label="一级导航">
          <ul className={styles.navigationList}>
            {navigationItems.map((item) => {
              const Icon = item.icon

              return (
                <li key={item.path}>
                  <NavLink
                    className={({ isActive }) =>
                      `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                    }
                    to={item.path}
                    end
                  >
                    <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
                    <span><b>{item.number}</b> {item.label}</span>
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>
      </header>

      <EvidenceSnapshotBar />

      <main id="main-content" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <p>信息源工作台连接本机私有 SQLite 服务，保存不可变材料版本、分类确认、结构化分析与历史。</p>
        <p>用户正文不写入网址或浏览器持久存储，不发送给第三方；公共研究与个人材料保持分域。</p>
      </footer>

      <nav className={styles.mobileNavigation} aria-label="移动端一级导航">
        <ul>
          {mobileNavigationItems.map((item) => {
            const Icon = item.icon

            return (
              <li key={item.path}>
                <NavLink
                  className={({ isActive }) =>
                    `${styles.mobileNavItem} ${isActive ? styles.mobileNavItemActive : ''}`
                  }
                  to={item.path}
                  end
                >
                  <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
                  <span>{item.label}</span>
                  <small>{item.number}</small>
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
