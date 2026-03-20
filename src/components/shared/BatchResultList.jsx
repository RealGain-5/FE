import React from 'react'
import { getFileName } from '../../utils/fileUtils'

/**
 * 배치 분석 결과 아코디언 목록.
 *
 * @param {object}   props
 * @param {Array}    props.files         - [{path, status, result, error}]
 * @param {Function} props.renderResult  - (result) => JSX  (completed 상태의 result 렌더링)
 * @param {Function} props.getLabel      - (file) => JSX | null  (완료된 파일의 라벨 칩)
 */
export function BatchResultList({ files, renderResult, getLabel }) {
  const hasVisible = files.some(f => f.status === 'completed' || f.status === 'failed')
  if (!hasVisible) return null

  return (
    <div className="batch-results">
      <h3 className="results-title">분석 결과</h3>
      {files.map(file => {
        if (file.status !== 'completed' && file.status !== 'failed') return null
        const filename = getFileName(file.path)
        return (
          <details key={file.path} className="result-accordion" open>
            <summary className={`accordion-header ${file.status}`}>
              <span className="accordion-title">
                {file.status === 'completed' ? '✓' : '✗'}{' '}{filename}
              </span>
              {file.result && getLabel(file)}
              {file.error && <span className="accordion-error">실패</span>}
            </summary>
            <div className="accordion-content">
              {file.status === 'failed'    && <div className="error-box">⚠️ {file.error}</div>}
              {file.status === 'completed' && file.result && renderResult(file.result)}
            </div>
          </details>
        )
      })}
    </div>
  )
}
