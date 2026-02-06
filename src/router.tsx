import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { ChatPage } from './components/chat/ChatPage'
import { KBPage } from './components/kb/KBPage'
import { TaskPage } from './components/task/TaskPage'
import { AgentPage } from './components/agent/AgentPage'
import { ModelPage } from './components/model/ModelPage'
import { SettingsPage } from './components/settings/SettingsPage'
import { OnboardingWizard } from './components/onboarding/OnboardingWizard'

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/chat" replace /> },
      { path: '/chat', element: <ChatPage /> },
      { path: '/kb', element: <KBPage /> },
      { path: '/task', element: <TaskPage /> },
      { path: '/agent', element: <AgentPage /> },
      { path: '/model', element: <ModelPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/onboarding', element: <OnboardingWizard /> },
    ],
  },
])
