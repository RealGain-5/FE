import React from 'react'

export function ScaleModeToggle({ scaleMode, onChange, hasUser = false }) {
  return (
    <div className="scale-mode-toggle">
      <button
        className={`btn-scale-mode ${scaleMode === 'auto' ? 'active' : ''}`}
        onClick={() => onChange('auto')}
      >Auto Scale</button>
      <button
        className={`btn-scale-mode ${scaleMode === 'fixed' ? 'active' : ''}`}
        onClick={() => onChange('fixed')}
      >Fixed Scale</button>
      <button
        className={`btn-scale-mode ${scaleMode === 'user' ? 'active' : ''}`}
        onClick={() => (hasUser || scaleMode === 'user') && onChange('user')}
        disabled={!hasUser && scaleMode !== 'user'}
        title={hasUser ? '사용자 지정 스케일' : scaleMode === 'user' ? '스케일 값 입력 후 재실행하면 적용됩니다' : '커스텀 스케일 값을 입력한 후 실행하세요'}
      >User Scale</button>
    </div>
  )
}
