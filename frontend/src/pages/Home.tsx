import { useNavigate } from 'react-router-dom'

function Home() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      {/* 顶部头像和设置 */}
      <div className="fixed top-6 left-0 right-0 flex justify-between px-6">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer" onClick={() => navigate('/profile')}>
          <span className="text-gray-600">👤</span>
        </div>
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer">
          <span className="text-gray-600">⚙️</span>
        </div>
      </div>

      {/* 标题 */}
      <h1 className="text-2xl font-semibold text-gray-800 mb-16">今天学点什么？</h1>

      {/* 两个大按钮 */}
      <div className="w-full max-w-sm space-y-6">
        <button
          onClick={() => navigate('/word')}
          className="w-full h-32 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center gap-3 text-white text-xl font-medium hover:shadow-xl hover:scale-[1.02] transition-all"
        >
          <span className="text-2xl">📚</span>
          背单词
        </button>

        <button
          onClick={() => navigate('/chat')}
          className="w-full h-32 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center gap-3 text-white text-xl font-medium hover:shadow-xl hover:scale-[1.02] transition-all"
        >
          <span className="text-2xl">🗣️</span>
          练口语
        </button>
      </div>

      {/* 底部统计 */}
      <div className="fixed bottom-8 text-sm text-gray-400">
        已学单词：0 · 练习时长：0分钟
      </div>
    </div>
  )
}

export default Home
