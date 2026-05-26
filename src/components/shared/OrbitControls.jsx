import React from 'react'

export const DEFAULT_WINDOW_SEC = 1.0

export const FILTER_MODES = [
  { key: 'raw', label: 'Raw' },
  { key: '1x', label: '1X' },
  { key: '2x', label: '2X' },
  { key: 'broadband', label: 'BB' },
  { key: 'overlay', label: 'Overlay' },
]

const FILTER_TOOLTIPS = {
  raw: 'Raw signal without band filtering.',
  '1x': 'Extract the 1X rotational component.',
  '2x': 'Extract the 2X rotational component.',
  broadband: 'Broadband orbit with DC offset removed.',
  overlay: 'Overlay Raw, BB, 2X, and 1X orbits on one axis.',
}

export function FilterModeToggle({ filterMode, onChange }) {
  return (
    <div className="scale-mode-toggle" title="Orbit filter mode">
      {FILTER_MODES.map(({ key, label }) => (
        <button
          key={key}
          className={`btn-scale-mode ${filterMode === key ? 'active' : ''}`}
          onClick={() => onChange(key)}
          title={FILTER_TOOLTIPS[key]}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function WindowSecInput({ id, value, onChange, disabled }) {
  return (
    <>
      <label className="dmd-param-label" htmlFor={id}>Window</label>
      <input
        id={id}
        type="number"
        className="dmd-param-input"
        value={value}
        min={0.5}
        max={10}
        step={0.5}
        onChange={(e) => onChange(parseFloat(e.target.value) || DEFAULT_WINDOW_SEC)}
        disabled={disabled}
      />
      <span className="dmd-param-hint">Sliding window seconds</span>
    </>
  )
}

export function UserAxisLimInputs({ orbits, values, onChange, disabled }) {
  if (!orbits || orbits.length === 0) return null

  return (
    <div className="user-axis-lim-group">
      <span className="dmd-param-label" style={{ alignSelf: 'flex-start', paddingTop: '2px' }}>Scale</span>
      <div className="user-axis-lim-fields">
        {orbits.map((pos) => (
          <div key={pos} className="user-axis-lim-row">
            <span className="user-axis-lim-pos">{pos}</span>
            <input
              type="number"
              className="dmd-param-input"
              style={{ width: '80px' }}
              value={values[pos] ?? ''}
              min={0.1}
              step={0.5}
              placeholder="mil"
              onChange={(e) => onChange(pos, e.target.value)}
              disabled={disabled}
            />
          </div>
        ))}
        <span className="dmd-param-hint" style={{ alignSelf: 'center' }}>+/- N mil, blank means auto</span>
      </div>
    </div>
  )
}
