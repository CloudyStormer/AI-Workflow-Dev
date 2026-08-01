import { Link, useLocation } from 'react-router-dom'
import avatarAlex from '../assets/ui/avatar-alex.png'
import Icon, { type IconName } from './Icon'

type SidebarProps = {
  mode?: 'main' | 'settings'
}

type NavigationItem = {
  to: string
  icon: IconName
  label: string
  section?: ProfileSection
}

type ProfileSection = 'account' | 'stats' | 'theme' | 'app' | 'about'

const PROFILE_SECTION_IDS: ProfileSection[] = ['account', 'stats', 'theme', 'app', 'about']

function isProfileSection(value: string | null): value is ProfileSection {
  return value !== null && PROFILE_SECTION_IDS.includes(value as ProfileSection)
}

const mainItems: NavigationItem[] = [
  { to: '/', icon: 'house', label: '首页' },
  { to: '/word', icon: 'book-open', label: '单词学习' },
  { to: '/chat', icon: 'chat-circle-dots', label: 'AI 聊天' },
  { to: '/profile?section=stats#profile-stats', icon: 'chart-bar', label: '统计', section: 'stats' },
  { to: '/profile?section=account#profile-account', icon: 'gear-six', label: '设置', section: 'account' },
]

const settingItems: NavigationItem[] = [
  { to: '/profile?section=account#profile-account', icon: 'sliders-horizontal', label: '账户', section: 'account' },
  { to: '/profile?section=stats#profile-stats', icon: 'chart-bar', label: '统计', section: 'stats' },
  { to: '/profile?section=theme#profile-theme', icon: 'palette', label: '主题', section: 'theme' },
  { to: '/profile?section=app#profile-app', icon: 'user-circle', label: 'App 资料', section: 'app' },
  { to: '/profile?section=about#profile-about', icon: 'chat-circle-dots', label: '关于我们', section: 'about' },
]

function Sidebar({ mode = 'main' }: SidebarProps) {
  const location = useLocation()
  const items = mode === 'settings' ? settingItems : mainItems
  const requestedSection = new URLSearchParams(location.search).get('section')
  const activeSection: ProfileSection = isProfileSection(requestedSection) ? requestedSection : 'account'

  function isItemActive(item: NavigationItem) {
    if (item.section) {
      if (location.pathname !== '/profile') return false

      if (mode === 'main' && item.label === '设置') {
        return activeSection !== 'stats'
      }

      return item.section === activeSection
    }

    return item.to === '/' ? location.pathname === '/' : location.pathname === item.to
  }

  return (
    <aside className={`sidebar sidebar--${mode}`} aria-label={mode === 'settings' ? '设置导航' : '主导航'}>
      {mode === 'settings' && <h1 className="sidebar__title">Settings</h1>}

      {mode === 'settings' && (
        <div className="sidebar__identity">
          <img src={avatarAlex} alt="Alex Chen" />
          <span>
            <strong>Alex</strong>
            <small>ID 12545679</small>
          </span>
        </div>
      )}

      <nav className="sidebar__nav">
        {items.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className={`sidebar__link${isItemActive(item) ? ' sidebar__link--active' : ''}`}
            aria-current={isItemActive(item) ? 'page' : undefined}
          >
            <Icon name={item.icon} size={25} className="icon--light" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {mode === 'main' && (
        <Link className="sidebar__mini-profile" to="/profile?section=account#profile-account">
          <img src={avatarAlex} alt="Alex Chen" />
          <span>
            <strong>Alex</strong>
            <small>Level B1</small>
          </span>
        </Link>
      )}
    </aside>
  )
}

export default Sidebar
