import React, { useState, useEffect } from 'react'
import { LoginForm } from './components/LoginForm'
import { TAB_CONFIG } from './utils/tabRegistry'
import './App.css'

class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('[TabErrorBoundary] 탭 렌더링 오류:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
          <h3 style={{ color: 'var(--status-anomaly, red)' }}>렌더링 오류</h3>
          <pre style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
            {this.state.error?.toString()}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState(TAB_CONFIG[0].id)
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')

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
          {TAB_CONFIG.map(({ id, label }) => (
            <button
              key={id}
              className={`app-tab-btn ${activeTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="user-controls">
          <button onClick={toggleTheme} className="btn-theme-toggle" title={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}>
            {theme === 'light' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            )}
          </button>
          <span className="user-name">
            <strong>{user?.username}</strong>님
          </span>
          <button onClick={handleLogout} className="btn-logout">
            로그아웃
          </button>
        </div>
      </header>

      <main className="main-content">
        {TAB_CONFIG.map(({ id, Component }) =>
          activeTab === id && (
            <TabErrorBoundary key={id}><Component /></TabErrorBoundary>
          )
        )}
      </main>
    </div>
  )
}

export default App
