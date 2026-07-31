import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Word from './pages/Word'
import Chat from './pages/Chat'
import Profile from './pages/Profile'
import './App.css'

function App() {
  return (
    <Router>
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-sm">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/word" element={<Word />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
