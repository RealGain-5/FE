import React from 'react'

// ─────────────────────────────────────────────
// 스타일 상수 — 렌더링마다 새 객체 생성 방지
// ─────────────────────────────────────────────
const containerStyle = {
  display: 'flex', gap: '4px', marginBottom: '0.75rem',
  borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem',
}

const baseTabStyle = {
  fontSize: '0.78rem', padding: '0.35rem 0.8rem',
}

const activeTabStyle = {
  ...baseTabStyle,
  background: 'var(--accent)',
  color: '#fff',
  border: '1px solid var(--accent)',
}

const inactiveTabStyle = {
  ...baseTabStyle,
  background: 'transparent',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border)',
}

/**
 * 공유 서브탭 네비게이션 버튼 행
 * @param {{ tabs: {key: string, label: string}[], current: string, onChange: (key: string) => void }} props
 */
export function SubTabNav({ tabs, current, onChange }) {
  return (
    <div style={containerStyle}>
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          className="btn-file-select"
          style={current === key ? activeTabStyle : inactiveTabStyle}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
