import React, { useState, useEffect } from 'react'
import { LoginForm } from './components/LoginForm'
import { ModelInference } from './components/ModelInference'
import './App.css'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)

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

  const handleLoginSuccess = (userData) => {
    setIsLoggedIn(true)
    setUser(userData)
  }

  const handleLogout = async () => {
    await window.api.logout()
    setIsLoggedIn(false)
    setUser(null)
  }

  if (!isLoggedIn) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />
  }

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
