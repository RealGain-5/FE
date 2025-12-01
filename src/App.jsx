import React from 'react'
import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [logs, setLogs] = useState([])

  // 로그 저장 테스트
  const handleSaveLog = async () => {
    await window.api.saveLog('USER_CLICK', 'Save Button Clicked')
    alert('로그가 저장되었습니다!')
    loadLogs() // 저장 후 목록 갱신
  }

  // 로그 불러오기 테스트
  const loadLogs = async () => {
    const recentLogs = await window.api.getLogs()
    setLogs(recentLogs)
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>DB 테스트</h1>
      <button onClick={handleSaveLog}>로그 저장하기</button>
      <button onClick={loadLogs}>로그 목록 새로고침</button>

      <h3>최근 로그:</h3>
      <ul>
        {logs.map((log) => (
          <li key={log.id}>
            [{log.created_at}] <strong>{log.action}</strong>: {log.details}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App
