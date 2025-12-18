import React, { useState, useEffect } from 'react'
import { ModelInference } from './components/ModelInference'
import './App.css'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)

  // 로그인/회원가입 모드 전환 (true: 로그인, false: 회원가입)
  const [isLoginMode, setIsLoginMode] = useState(true)

  const [id, setId] = useState('')
  const [pw, setPw] = useState('')

  useEffect(() => {
    async function init() {
      const result = await window.api.checkSession()
      if (result.isLoggedIn) {
        setIsLoggedIn(true)
        setUser(result.user)
      }
    }
    init()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!id || !pw) return alert('아이디와 비밀번호를 입력하세요.')

    if (isLoginMode) {
      // === 로그인 시도 ===
      const result = await window.api.login(id, pw)
      if (result.success) {
        setIsLoggedIn(true)
        setUser({ username: result.username })
        await window.api.saveLog('LOGIN', `User ${id} logged in`)
      } else {
        alert(result.message)
      }
    } else {
      // === 회원가입 시도 ===
      const result = await window.api.register(id, pw)
      if (result.success) {
        alert(result.message) // "회원가입 성공! 로그인해주세요."
        // 로그인 화면으로 전환 (입력값은 유지하여 바로 로그인 가능)
        setIsLoginMode(true)
      } else {
        alert(result.message)
      }
    }
  }

  const handleLogout = async () => {
    await window.api.logout()
    setIsLoggedIn(false)
    setUser(null)
  }

  // === 로그인 UI ===
  if (!isLoggedIn) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>{isLoginMode ? '🔐 시스템 로그인' : '📝 회원가입'}</h2>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <input
              className="input-field"
              type="text"
              placeholder="아이디를 입력하세요"
              value={id}
              onChange={(e) => setId(e.target.value)}
              autoComplete="username"
            />
            <input
              className="input-field"
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="current-password"
            />
            <button type="submit" className="btn-primary">
              {isLoginMode ? '로그인' : '가입하기'}
            </button>
          </form>

          <div className="auth-toggle">
            {isLoginMode ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
            <span
              onClick={() => {
                setIsLoginMode(!isLoginMode)
                setId('')
                setPw('')
              }}
              className="auth-link"
            >
              {isLoginMode ? '회원가입' : '로그인'}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // === 메인 대시보드 UI ===
  return (
    <div className="dashboard-layout">
      <header className="app-header">
        <div className="logo-area">
          <span>📊</span> 분석 대시보드
        </div>
        <div className="user-controls">
          <span className="user-name">
            <strong>{user?.username}</strong>님
          </span>
          <button onClick={handleLogout} className="btn-logout">
            로그아웃
          </button>
        </div>
      </header>

      <main className="main-content">
        <ModelInference />
      </main>
    </div>
  )
}

export default App
