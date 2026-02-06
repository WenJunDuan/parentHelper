import { NavLink } from 'react-router-dom'

type NavItem = {
  to: string
  label: string
  icon: string
}

const dailyItems: NavItem[] = [
  { to: '/chat', label: '对话', icon: '💬' },
  { to: '/kb', label: '知识库', icon: '📚' },
  { to: '/task', label: '任务', icon: '✅' },
]

const systemItems: NavItem[] = [
  { to: '/agent', label: 'Agent', icon: '🤖' },
  { to: '/model', label: '模型', icon: '🧠' },
  { to: '/settings', label: '设置', icon: '⚙️' },
  { to: '/onboarding', label: '首次引导', icon: '✨' },
]

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">🐱 小智辅导</div>

      <nav className="sidebar__group">
        <div className="sidebar__title">日常使用</div>
        {dailyItems.map((item) => (
          <NavItemLink key={item.to} item={item} />
        ))}
      </nav>

      <nav className="sidebar__group">
        <div className="sidebar__title">系统管理</div>
        {systemItems.map((item) => (
          <NavItemLink key={item.to} item={item} />
        ))}
      </nav>
    </aside>
  )
}

function NavItemLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}
    >
      <span aria-hidden>{item.icon}</span>
      <span>{item.label}</span>
    </NavLink>
  )
}
