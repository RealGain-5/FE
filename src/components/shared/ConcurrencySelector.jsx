import React from 'react'

export function ConcurrencySelector({ id = 'concurrency-level', value, onChange, disabled }) {
  return (
    <div className="concurrency-selector">
      <label htmlFor={id}>병렬 처리 수준:</label>
      <select
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="concurrency-select"
      >
        <option value={1}>1 (순차 처리)</option>
        <option value={2}>2 (권장)</option>
        <option value={3}>3</option>
        <option value={4}>4 (고부하)</option>
      </select>
    </div>
  )
}
