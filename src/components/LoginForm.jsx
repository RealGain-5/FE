import React, { useState } from 'react'

export function LoginForm({ onLoginSuccess }) {
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!id || !pw) {
      setErrorMsg('아이디와 비밀번호를 입력하세요.')
      return
    }

    setIsSubmitting(true)

    try {
      if (isLoginMode) {
        const result = await window.api.login(id, pw)
        if (result.success) {
          window.api.saveLog('LOGIN', `User ${id} logged in`).catch(() => {})
          onLoginSuccess({ username: result.username })
        } else {
          setErrorMsg(result.message)
        }
      } else {
        const result = await window.api.register(id, pw)
        if (result.success) {
          setSuccessMsg(result.message)
          setIsLoginMode(true)
          setPw('')
        } else {
          setErrorMsg(result.message)
        }
      }
    } catch {
      setErrorMsg('서버 연결 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode)
    setId('')
    setPw('')
    setErrorMsg('')
    setSuccessMsg('')
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="auth-logo-mark">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
            </div>
            <span className="auth-logo-name">RCP<span>VMS</span></span>
          </div>
          <p className="auth-subtitle">회전체 진동 모니터링 시스템</p>
          <h2>{isLoginMode ? '로그인' : '계정 생성'}</h2>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            className="input-field"
            type="text"
            placeholder="아이디를 입력하세요"
            value={id}
            onChange={(e) => setId(e.target.value)}
            disabled={isSubmitting}
            autoComplete="username"
          />
          <input
            className="input-field"
            type="password"
            placeholder="비밀번호를 입력하세요"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            disabled={isSubmitting}
            autoComplete="current-password"
          />

          {successMsg && <p className="auth-success">{successMsg}</p>}
          {errorMsg && <p className="auth-error">{errorMsg}</p>}

          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting
              ? '처리 중...'
              : isLoginMode
                ? '로그인'
                : '가입하기'}
          </button>
        </form>

        <div className="auth-toggle">
          {isLoginMode ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
          <button type="button" onClick={toggleMode} className="auth-link">
            {isLoginMode ? '회원가입' : '로그인'}
          </button>
        </div>
      </div>
    </div>
  )
}
