import React from 'react'

/**
 * 공통 에러 표시 컴포넌트.
 * 여러 컴포넌트에서 반복되던 error-message div를 통일한다.
 */
export function ErrorDisplay({ error }) {
  if (!error) return null
  return <div className="error-message" style={{ marginTop: '0.75rem' }}>⚠️ {error}</div>
}
