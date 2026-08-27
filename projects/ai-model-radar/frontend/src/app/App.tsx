import { CalendarDays, Database, History, PackageOpen, Radar, Rows3, TrendingUp } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

import styles from './App.module.css'

const navigationItems = [
  { label: '今日雷达', path: '/today', icon: CalendarDays },
  { label: '全部事件', path: '/events', icon: Rows3 },
  { label: '趋势与版本', path: '/trends', icon: TrendingUp },
  { label: '开源与发布', path: '/open-source', icon: PackageOpen },
  { label: '来源与质量', path: '/sources', icon: Database },
] as const

export function App() {
  return (
    <div className={styles.app}>
      <a className={styles.skipLink} href="#main-content">跳到主要内容</a>
      <aside className={styles.sidebar}>
        <div className={styles.brand}><span className={styles.brandIcon} aria-hidden="true"><Radar size={25} /></span><span><strong>AI Model Radar</strong><small>AI 模型动态雷达</small></span></div>
        <nav className={styles.navigation} aria-label="一级导航"><ul>{navigationItems.map((item) => { const Icon = item.icon; return <li key={item.path}><NavLink to={item.path} className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}><Icon size={19} aria-hidden="true" /><span>{item.label}</span></NavLink></li> })}</ul></nav>
        <NavLink to="/history" className={({ isActive }) => `${styles.historyLink} ${isActive ? styles.active : ''}`}><History size={18} aria-hidden="true" /><span>历史快照</span></NavLink>
        <p className={styles.scope}>只读真实快照<br />不保存浏览器数据</p>
      </aside>
      <div className={styles.mobileHeader}><div className={styles.brand}><span className={styles.brandIcon} aria-hidden="true"><Radar size={22} /></span><span><strong>AI Model Radar</strong><small>真实数据雷达</small></span></div></div>
      <main id="main-content" className={styles.main} tabIndex={-1}><Outlet /></main>
      <nav className={styles.mobileNav} aria-label="移动端一级导航">{navigationItems.map((item) => { const Icon = item.icon; return <NavLink key={item.path} to={item.path} className={({ isActive }) => isActive ? styles.mobileActive : ''}><Icon size={19} aria-hidden="true" /><span>{item.label.replace('与', '')}</span></NavLink> })}</nav>
    </div>
  )
}
