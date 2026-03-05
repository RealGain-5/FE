import React, { useState, useEffect } from 'react'
import { LoginForm } from './components/LoginForm'
import { ModelInference } from './components/ModelInference'
import { SVDDAnalysis } from './components/SVDDAnalysis'
import { MAEAnalysis } from './components/MAEAnalysis'
import './App.css'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('ensemble')

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
          <div className="logo-mark">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          </div>
          <span className="logo-name">RCP<span>VMS</span></span>
        </div>
        <nav className="app-tab-nav">
          <button
            className={`app-tab-btn ${activeTab === 'ensemble' ? 'active' : ''}`}
            onClick={() => setActiveTab('ensemble')}
          >
            앙상블 분석
          </button>
          <button
            className={`app-tab-btn ${activeTab === 'svdd' ? 'active' : ''}`}
            onClick={() => setActiveTab('svdd')}
          >
            SVDD 분석
          </button>
          <button
            className={`app-tab-btn ${activeTab === 'mae' ? 'active' : ''}`}
            onClick={() => setActiveTab('mae')}
          >
            MAE 분석
          </button>
        </nav>
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
        {activeTab === 'ensemble' && <ModelInference />}
        {activeTab === 'svdd' && <SVDDAnalysis />}
        {activeTab === 'mae' && <MAEAnalysis />}
      </main>
    </div>
  )
}

export default App
