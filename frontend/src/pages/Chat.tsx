import { useNavigate } from 'react-router-dom'

function Chat() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="p-4 border-b flex items-center">
        <button onClick={() => navigate(-1)} className="text-gray-600 mr-4">←</button>
        <div className="font-medium">日常口语聊天</div>
      </div>

      <div className="flex-1 p-4 space-y-4">
        <div className="flex">
          <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-2 max-w-[80%]">
            你好！今天想聊些什么呢？
          </div>
        </div>
        <div className="flex justify-end">
          <div className="bg-blue-500 text-white rounded-2xl rounded-tr-none px-4 py-2 max-w-[80%]">
            我们来聊聊今天的天气吧
          </div>
        </div>
      </div>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input className="flex-1 bg-gray-100 rounded-xl px-4 py-3 outline-none" placeholder="按住说话，或输入文字..." />
          <button className="w-12 h-12 bg-blue-500 rounded-xl text-white">🎤</button>
        </div>
      </div>
    </div>
  )
}

export default Chat
