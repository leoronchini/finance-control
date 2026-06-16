import { NavLink } from 'react-router-dom'

const items = [
  { to: '/',        label: 'Dashboard',       icon: <IconGrid /> },
  { to: '/transactions', label: 'Transações', icon: <IconList /> },
  { to: '/history', label: 'Histórico',       icon: <IconTrend /> },
  { to: '/items',   label: 'Resumo por Item', icon: <IconItems /> },
  { to: '/groups',  label: 'Resumo por Grupo',icon: <IconGlobe /> },
  { to: '/ai',      label: 'Análise IA',      icon: <IconAI /> },
]

export default function Sidebar() {
  return (
    <aside style={{
      width: 'var(--sidebar-w)', flexShrink: 0,
      background: 'var(--bg2)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', padding: '24px 0',
      position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
    }}>
      <div style={{ padding: '0 20px 28px', fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px' }}>
        finance<span style={{ color: 'var(--green)' }}>.</span>
      </div>
      <nav>
        {items.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 20px', color: isActive ? 'var(--text)' : 'var(--muted)',
              borderLeft: isActive ? '3px solid var(--green)' : '3px solid transparent',
              background: isActive ? 'var(--bg3)' : 'transparent',
              transition: 'all .15s',
            })}
          >
            {icon}
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

function IconGrid() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
}
function IconList() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
}
function IconTrend() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
}
function IconItems() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1"/><circle cx="3" cy="12" r="1"/><circle cx="3" cy="18" r="1"/></svg>
}
function IconGlobe() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 010 20"/><path d="M2 12h20"/></svg>
}
function IconAI() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
}
