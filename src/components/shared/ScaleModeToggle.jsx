import React from 'react'

export function ScaleModeToggle({ scaleMode, onChange }) {
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
    </div>
  )
}
