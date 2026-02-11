import React, { useState } from 'react'

export function LoginForm({ onLoginSuccess }) {
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!id || !pw) {
      setErrorMsg('아이디와 비밀번호를 입력하세요.')
      return
    }

    if (isLoginMode) {
      const result = await window.api.login(id, pw)
      if (result.success) {
        await window.api.saveLog('LOGIN', `User ${id} logged in`)
        onLoginSuccess({ username: result.username })
      } else {
        setErrorMsg(result.message)
      }
    } else {
      const result = await window.api.register(id, pw)
      if (result.success) {
        setErrorMsg('')
        setIsLoginMode(true)
        // 회원가입 성공 시 비밀번호만 초기화, 아이디는 유지
        setPw('')
      } else {
        setErrorMsg(result.message)
      }
    }
  }

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode)
    setId('')
    setPw('')
    setErrorMsg('')
  }

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

          {errorMsg && <p className="auth-error">{errorMsg}</p>}

          <button type="submit" className="btn-primary">
            {isLoginMode ? '로그인' : '가입하기'}
          </button>
        </form>

        <div className="auth-toggle">
          {isLoginMode ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
          <span onClick={toggleMode} className="auth-link">
            {isLoginMode ? '회원가입' : '로그인'}
          </span>
        </div>
      </div>
    </div>
  )
}
