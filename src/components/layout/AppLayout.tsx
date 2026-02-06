import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'

export function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">
        <Outlet />
        <StatusBar />
      </main>
    </div>
  )
}
