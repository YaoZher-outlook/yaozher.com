import { Navigate, Route, Routes } from 'react-router-dom'

import MainLayout from '@/layout/MainLayout'
import { bootstrapTheme, useAppStore } from '@/store/appStore'
import HomePage from '@/pages/home/HomePage'
import DownloadPage from '@/pages/download/DownloadPage'
import MessagesPage from '@/pages/messages/MessagesPage'
import SettingsPage from './pages/settings/SettingsPage'
import NewsPage from './pages/news/NewsPage'
import ToolboxPage from './pages/toolbox/ToolboxPage'

bootstrapTheme()
// sync profile if token exists
void useAppStore.getState().bootstrapAuthProfile()

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/download" element={<DownloadPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/toolbox" element={<ToolboxPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
