import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'

export function AppLayout() {
  const location = useLocation()

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">
        <div key={location.pathname} className="page-transition">
          <Outlet />
        </div>
        <StatusBar />
      </main>
    </div>
  )
}
