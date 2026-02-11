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
          <h2>{isLoginMode ? '🔐 시스템 로그인' : '📝 회원가입'}</h2>
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
