import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, HelpCircle, Users, BarChart3,
  MessageSquare, Sparkles, LogOut, MessageCircle,
} from 'lucide-react'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  adminOnly?: boolean
  end?: boolean
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const isAdmin = user?.role === 'admin'

  // Dynamic responses label based on role
  const responsesLabel = isAdmin ? 'All Responses' : 'Responses'

  const navItems: NavItem[] = [
    { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard', end: true },
    { to: '/dashboard/questions', icon: <HelpCircle size={18} />, label: 'Questions' },
    { to: '/dashboard/responses', icon: <MessageSquare size={18} />, label: responsesLabel },
    { to: '/dashboard/chat', icon: <MessageCircle size={18} />, label: 'Chats' },
    { to: '/dashboard/users', icon: <Users size={18} />, label: 'Users', adminOnly: true },
    { to: '/dashboard/analytics', icon: <BarChart3 size={18} />, label: 'Analytics', adminOnly: true },
  ]

  return (
    <aside style={s.sidebar}>
      {/* Logo */}
      <div style={s.logoArea}>
        <div style={s.logoIcon}><Sparkles size={18} color="#fff" /></div>
        <div>
          <div style={s.logoText}>Askora</div>
          <div style={s.orgName} title={user?.organizationName}>
            {user?.organizationName}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={s.nav}>
        {navItems.filter((item) => !item.adminOnly || isAdmin).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            style={({ isActive }) => ({
              ...s.navLink,
              ...(isActive ? s.navLinkActive : {}),
            })}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div style={s.userArea}>
        <div style={s.userInfo}>
          <div style={s.avatar}>{user?.name?.charAt(0).toUpperCase() ?? '?'}</div>
          <div style={s.userMeta}>
            <div style={s.userName}>{user?.name}</div>
            <div style={s.userRole}>{user?.role}</div>
          </div>
        </div>
        <button onClick={logout} style={s.logoutBtn} title="Sign out">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  )
}

const s: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '240px', minHeight: '100vh', background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border)', display: 'flex',
    flexDirection: 'column', padding: '20px 0', flexShrink: 0,
  },
  logoArea: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '0 20px 24px', borderBottom: '1px solid var(--border)', marginBottom: '12px',
  },
  logoIcon: {
    width: '34px', height: '34px', borderRadius: '10px', background: 'var(--gradient)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  logoText: { fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)' },
  orgName: {
    fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px',
    maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  nav: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 12px' },
  navLink: {
    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
    borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)',
    fontSize: '14px', fontWeight: 500, textDecoration: 'none', transition: 'all 0.2s',
  },
  navLinkActive: { background: 'var(--accent-dim)', color: 'var(--accent-light)' },
  userArea: {
    padding: '16px 20px 0', borderTop: '1px solid var(--border)',
    marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '8px',
  },
  userInfo: { display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 },
  avatar: {
    width: '32px', height: '32px', borderRadius: '50%', background: 'var(--gradient)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: '13px', color: '#fff', flexShrink: 0,
  },
  userMeta: { minWidth: 0 },
  userName: {
    fontSize: '13px', fontWeight: 600, overflow: 'hidden',
    textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)',
  },
  userRole: { fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' },
  logoutBtn: {
    background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
    color: 'var(--text-secondary)', padding: '7px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
}