import React from 'react'

/**
 * @param {object} props
 * @param {Array}    props.files     - [{path, status, result, error}]
 * @param {Function} props.onRemove  - (path) => void
 * @param {boolean}  props.disabled
 * @param {Function} props.getLabel  - (file) => JSX | null  (label chip for completed file)
 * @param {Function} [props.onRetry] - (path) => void  (omit to hide retry button)
 */
export function BatchFileList({ files, onRemove, disabled, getLabel, onRetry }) {
  if (files.length === 0) return null

  return (
    <div className="batch-file-list">
      <div className="file-list-header">선택된 파일 ({files.length}개)</div>
      <div className="file-items">
        {files.map(file => (
          <div key={file.path} className={`file-item ${file.status}`}>
            <div className="file-info">
              <span className="file-status-icon">
                {file.status === 'pending'   && '⏸'}
                {file.status === 'running'   && '⏳'}
                {file.status === 'completed' && '✓'}
                {file.status === 'failed'    && '✗'}
              </span>
              <span className="file-path" title={file.path}>
                {file.path.split(/[/\\]/).pop()}
              </span>
              {file.result && getLabel(file)}
            </div>
            <div className="file-actions">
              {file.status === 'failed' && onRetry && (
                <button
                  className="btn-retry"
                  onClick={() => onRetry(file.path)}
                  disabled={disabled}
                  title="재분석"
                >
                  ↻
                </button>
              )}
              <button
                className="btn-remove"
                onClick={() => onRemove(file.path)}
                disabled={disabled}
                title="제거"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
