import {
  BookOpenText,
  Bot,
  BrainCircuit,
  GraduationCap,
  ListTodo,
  MessageSquare,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
}

const dailyItems: NavItem[] = [
  { to: '/chat', label: '对话', icon: MessageSquare },
  { to: '/kb', label: '学习资料', icon: BookOpenText },
  { to: '/task', label: '家庭作业', icon: ListTodo },
]

const systemItems: NavItem[] = [
  { to: '/agent', label: 'Agent', icon: Bot },
  { to: '/model', label: '模型', icon: BrainCircuit },
  { to: '/child', label: '学习档案', icon: UserRound },
]

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__brand-icon" aria-hidden>
          <GraduationCap size={20} />
        </span>
        <span>小智辅导</span>
      </div>

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
  const Icon = item.icon

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}
    >
      <span className="sidebar__icon" aria-hidden>
        <Icon size={18} />
      </span>
      <span>{item.label}</span>
    </NavLink>
  )
}
