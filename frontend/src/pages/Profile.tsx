import { useNavigate } from 'react-router-dom'

function Profile() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center mb-8">
        <button onClick={() => navigate(-1)} className="text-gray-600">← 返回</button>
      </div>

      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-full bg-gray-200 mx-auto mb-3 flex items-center justify-center text-3xl">👤</div>
        <h2 className="text-xl font-medium text-gray-800">学习者</h2>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-blue-500">0</div>
          <div className="text-xs text-gray-500 mt-1">已学单词</div>
        </div>
        <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-blue-500">0</div>
          <div className="text-xs text-gray-500 mt-1">练习时长</div>
        </div>
        <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-blue-500">0%</div>
          <div className="text-xs text-gray-500 mt-1">掌握率</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {['学习目标', '当前水平', '深色模式', '我的收藏', '错词本', '关于'].map((item, i) => (
          <div key={i} className="px-4 py-4 border-b last:border-b-0 flex justify-between items-center">
            <span className="text-gray-700">{item}</span>
            <span className="text-gray-400">›</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Profile
