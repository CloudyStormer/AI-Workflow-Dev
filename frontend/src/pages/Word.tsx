import { useNavigate } from 'react-router-dom'

function Word() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="flex items-center mb-8">
        <button onClick={() => navigate(-1)} className="text-gray-600">← 返回</button>
        <div className="flex-1 text-center text-gray-500">1/20</div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <h2 className="text-4xl font-bold text-gray-800 mb-2">happy</h2>
        <p className="text-gray-500 mb-4">/ˈhæpi/</p>
        <p className="text-lg text-gray-700 mb-8">adj. 快乐的；高兴的</p>

        <div className="text-left space-y-4 text-gray-600">
          <p>1. She looks happy today.</p>
          <p>2. I'm happy to help you.</p>
          <p>3. Have a happy day!</p>
        </div>
      </div>

      <div className="fixed bottom-8 left-6 right-6 flex gap-4">
        <button className="flex-1 h-12 bg-gray-100 rounded-xl text-gray-600">不认识</button>
        <button className="flex-1 h-12 bg-blue-500 rounded-xl text-white">认识 →</button>
      </div>
    </div>
  )
}

export default Word
