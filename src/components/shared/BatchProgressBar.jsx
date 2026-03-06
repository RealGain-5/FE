import React from 'react'

export function BatchProgressBar({ batchProgress, batchLoading }) {
  const pct = batchProgress.total
    ? (batchProgress.completed / batchProgress.total) * 100
    : 0

  return (
    <div className="batch-progress">
      <div className="progress-text">
        전체 진행률: {batchProgress.completed}/{batchProgress.total || 0}
        {batchProgress.failed > 0 && ` (실패: ${batchProgress.failed})`}
      </div>
      <div className="progress-bar-wrapper">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      {batchLoading && batchProgress.running?.length > 0 && (
        <div className="running-files-section">
          <div className="running-files-header">
            ⏳ 분석 중 ({batchProgress.runningCount || batchProgress.running.length}개)
          </div>
          <div className="running-files-list">
            {batchProgress.running.map(p => (
              <div key={p} className="running-file-item">
                {p.split(/[/\\]/).pop()}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
