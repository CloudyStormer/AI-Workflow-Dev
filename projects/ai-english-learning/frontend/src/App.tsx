import { useEffect } from 'react'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Word from './pages/Word'
import Chat from './pages/Chat'
import Profile from './pages/Profile'
import { useLearningStore } from './store/useLearningStore'
import './App.css'

function App() {
  const darkMode = useLearningStore((state) => state.settings.darkMode)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = darkMode ? 'dark' : 'light'
    root.style.colorScheme = darkMode ? 'dark' : 'light'

    return () => {
      delete root.dataset.theme
      root.style.removeProperty('color-scheme')
    }
  }, [darkMode])

  return (
    <Router>
      <main className="app-root">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/word" element={<Word />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </Router>
  )
}

export default App
