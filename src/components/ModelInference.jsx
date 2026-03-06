import React, { useState } from 'react'
import './ModelInference.css'
import { useAnalysisController } from '../hooks/useAnalysisController'
import { ConcurrencySelector } from './shared/ConcurrencySelector'
import { BatchFileList } from './shared/BatchFileList'
import { BatchProgressBar } from './shared/BatchProgressBar'

// ─────────────────────────────────────────────
// RCP 카드 컴포넌트 (탭 포함)
// ─────────────────────────────────────────────
function RCPCard({ rcp, data, visualization }) {
  const [activeTab, setActiveTab] = useState('orbit')
  const [timelineIndex, setTimelineIndex] = useState(9)
  const [showModelDetail, setShowModelDetail] = useState(false)
  const hasEnsemble = !!(data.model_predictions)

  const tabs = [
    { id: 'orbit',    label: '궤도' },
    { id: 'heatmap',  label: 'Grad-CAM' },
    { id: 'overlay',  label: '오버레이' },
    { id: 'ig',       label: 'IG' },
    { id: 'timeline', label: '타임라인' },
  ]

  const getImagePath = () => {
    if (!visualization) return null
    let path = ''
    if (activeTab === 'orbit')    path = visualization.orbit
    else if (activeTab === 'heatmap')  path = visualization.gradcam.heatmap
    else if (activeTab === 'overlay')  path = visualization.gradcam.overlay
    else if (activeTab === 'ig')       path = visualization.ig?.resnet_overlay
    else if (activeTab === 'timeline') path = visualization.temporal[timelineIndex]
    if (!path) return null
    return `media://${path.replace(/\\/g, '/')}`
  }

  return (
    <div className="rcp-card">
      <div className="card-header">
        <span className="card-title">{rcp}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {hasEnsemble && (
            <span style={{
              fontSize: '0.65rem', fontWeight: 600, padding: '1px 6px',
              borderRadius: '4px', background: '#7c3aed', color: '#fff',
              letterSpacing: '0.03em'
            }}>앙상블</span>
          )}
          <span className={`status-badge ${data.prediction}`}>{data.prediction}</span>
        </div>
      </div>

      <div className="tab-container">
        <div className="segmented-control">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              disabled={!visualization}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="visualization-area">
        {visualization ? (
          <>
            {activeTab === 'ig' && !visualization?.ig?.resnet_overlay ? (
              <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
                IG 데이터 없음 (비다중스케일 모델 또는 IG 비활성화)
              </div>
            ) : (
              <img src={getImagePath()} alt="Vis" className="vis-image" />
            )}
            {activeTab === 'timeline' && (
              <div style={{
                position: 'absolute', bottom: 10, left: 10, right: 10,
                background: 'rgba(0,0,0,0.6)', padding: '5px 10px',
                borderRadius: '4px', display: 'flex', alignItems: 'center',
                gap: '10px', color: 'white'
              }}>
                <span style={{ fontSize: '12px', width: '20px' }}>{timelineIndex}s</span>
                <input
                  type="range" min="0" max="9" value={timelineIndex}
                  onChange={(e) => setTimelineIndex(parseInt(e.target.value))}
                  style={{ flex: 1, height: '4px' }}
                />
              </div>
            )}
          </>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>시각화 준비 중</div>
        )}
      </div>

      <div className="prob-list">
        {Object.entries(data.probabilities).map(([cls, prob]) => (
          <div key={cls} className="prob-row">
            <div className="prob-info">
              <span style={{ textTransform: 'capitalize' }}>{cls}</span>
              <strong>{(prob * 100).toFixed(1)}%</strong>
            </div>
            <div className="prob-track">
              <div className={`prob-fill ${cls}`} style={{ width: `${prob * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      {hasEnsemble && (
        <div style={{ borderTop: '1px solid var(--border)', marginTop: '8px', paddingTop: '6px' }}>
          <button
            onClick={() => setShowModelDetail((v) => !v)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.72rem', color: 'var(--text-muted)', padding: '2px 0',
              display: 'flex', alignItems: 'center', gap: '4px', width: '100%'
            }}
          >
            <span style={{ fontSize: '0.65rem' }}>{showModelDetail ? '▲' : '▼'}</span>
            개별 모델 예측
          </button>
          {showModelDetail && (() => {
            const firstMp = data.model_predictions?.resnet ?? data.model_predictions?.cnn1d
            const classKeys = firstMp ? Object.keys(firstMp.probabilities) : ['normal']
            return (
              <table style={{ width: '100%', fontSize: '0.72rem', borderCollapse: 'collapse', marginTop: '4px' }}>
                <thead>
                  <tr style={{ color: 'var(--text-secondary)' }}>
                    <th style={{ textAlign: 'left', padding: '2px 4px', fontWeight: 500 }}>모델</th>
                    <th style={{ textAlign: 'left', padding: '2px 4px', fontWeight: 500 }}>판정</th>
                    {classKeys.map((cls) => (
                      <th key={cls} style={{ textAlign: 'right', padding: '2px 4px', fontWeight: 500 }}>{cls}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[{ key: 'resnet', label: 'ResNet' }, { key: 'cnn1d', label: '1D CNN' }].map(({ key, label }) => {
                    const mp = data.model_predictions[key]
                    if (!mp) return null
                    return (
                      <tr key={key} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '2px 4px', color: 'var(--text-secondary)' }}>{label}</td>
                        <td style={{ padding: '2px 4px' }}>
                          <span style={{
                            fontWeight: 600,
                            color: mp.prediction === 'normal' ? 'var(--status-normal)' : 'var(--status-anomaly)'
                          }}>{mp.prediction}</span>
                        </td>
                        {classKeys.map((cls) => (
                          <td key={cls} style={{ padding: '2px 4px', textAlign: 'right', color: 'var(--text-muted)' }}>
                            {((mp.probabilities[cls] ?? 0) * 100).toFixed(1)}%
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )
          })()}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// 결과 패널
// ─────────────────────────────────────────────
function ResultPanel({ result }) {
  return (
    <div className="result-container">
      <div className={`result-overview ${result.final_label}`}>
        <span className="verdict-label">최종 분석 판정</span>
        <span className="verdict-value">{result.final_label.toUpperCase()}</span>
      </div>
      <div className="rcp-grid">
        {Object.entries(result.results).map(([rcp, data]) => (
          <RCPCard
            key={rcp}
            rcp={rcp}
            data={data}
            visualization={result.visualization?.[rcp]}
          />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
export function ModelInference() {
  const {
    mode, setMode,
    binPath,
    loading, result, error, setError,
    batchFiles, setBatchFiles,
    batchProgress, batchLoading,
    concurrencyLevel,
    handleConcurrencyChange,
    handleSelectFile,
    handleRunSingle,
    handleAddBatchFiles,
    handleRemoveBatchFile,
    handleRunBatch,
    handleCancelBatch,
  } = useAnalysisController({
    apiRunSingle: (path) => window.api.runInference(path),
    apiRunBatch:  (paths) => window.api.runBatchInference(paths),
    apiCancelBatch: () => window.api.cancelBatchInference(),
    onBatchProgress: window.api.onBatchProgress,
    offBatchProgress: window.api.offBatchProgress,
    onSingleSuccess: async (binPath, data) => {
      await window.api.saveLog('INFERENCE', `분석 완료: ${data.final_label} (${binPath})`)
    },
    onBatchComplete: async (paths, response) => {
      if (response.success) {
        await window.api.saveLog(
          'BATCH_INFERENCE',
          `배치 분석 완료: ${paths.length}개 파일 (성공: ${response.summary?.completed ?? 0}, 실패: ${response.summary?.failed ?? 0})`
        )
      }
    },
  })

  // 개별 파일 재분석
  const handleRetryFile = async (filePath) => {
    setBatchFiles(prev =>
      prev.map(f => f.path === filePath ? { ...f, status: 'running', error: null } : f)
    )
    try {
      const response = await window.api.runInference(filePath)
      setBatchFiles(prev => prev.map(f =>
        f.path === filePath
          ? response.success
            ? { ...f, status: 'completed', result: response.data }
            : { ...f, status: 'failed',    error: response.error }
          : f
      ))
    } catch (err) {
      setBatchFiles(prev =>
        prev.map(f => f.path === filePath ? { ...f, status: 'failed', error: err.message } : f)
      )
    }
  }

  // JSON 내보내기
  const handleExportJson = async () => {
    const completedFiles = batchFiles.filter(f => f.status === 'completed')
    if (completedFiles.length === 0) { alert('내보낼 결과가 없습니다.'); return }
    const exportData = {
      timestamp: new Date().toISOString(),
      totalFiles: batchFiles.length,
      completed: completedFiles.length,
      failed: batchFiles.filter(f => f.status === 'failed').length,
      results: completedFiles.map(f => ({
        filePath: f.path,
        fileName: f.path.split(/[/\\]/).pop(),
        finalLabel: f.result.final_label,
        rcpResults: f.result.results,
        visualization: f.result.visualization,
      })),
    }
    try {
      const response = await window.api.exportResultsJson(exportData)
      if (response.success) alert(`JSON 파일이 저장되었습니다.\n${response.filePath}`)
      else if (!response.cancelled) alert(`내보내기 실패: ${response.error}`)
    } catch (err) {
      alert(`내보내기 오류: ${err.message}`)
    }
  }

  // CSV 내보내기
  const handleExportCsv = async () => {
    const exportData = batchFiles.map(f => ({ path: f.path, status: f.status, result: f.result, error: f.error }))
    try {
      const response = await window.api.exportResultsCsv(exportData)
      if (response.success) alert(`CSV 파일이 저장되었습니다.\n${response.filePath}`)
      else if (!response.cancelled) alert(`내보내기 실패: ${response.error}`)
    } catch (err) {
      alert(`내보내기 오류: ${err.message}`)
    }
  }

  // Excel 내보내기
  const handleExportExcel = async () => {
    const exportData = batchFiles.map(f => ({ path: f.path, status: f.status, result: f.result, error: f.error }))
    try {
      const response = await window.api.exportResultsExcel(exportData)
      if (response.success) alert(`Excel 파일이 저장되었습니다.\n${response.filePath}`)
      else if (!response.cancelled) alert(`내보내기 실패: ${response.error}`)
    } catch (err) {
      alert(`내보내기 오류: ${err.message}`)
    }
  }

  return (
    <div className="model-inference">
      <div className="control-panel">
        <div className="header-row">
          <h2 className="section-title">Orbit 이상 탐지</h2>
          <div className="mode-toggle">
            <button className={`mode-btn ${mode === 'single' ? 'active' : ''}`} onClick={() => setMode('single')}>단일 파일</button>
            <button className={`mode-btn ${mode === 'batch'  ? 'active' : ''}`} onClick={() => setMode('batch')}>배치 처리</button>
          </div>
        </div>

        {mode === 'single' ? (
          <>
            <div className="input-group">
              <div className="file-picker-wrapper">
                <button onClick={handleSelectFile} className="btn-file-select" disabled={loading}>파일 선택</button>
                <span className="file-path-text">{binPath || '분석할 .bin 파일을 선택해주세요.'}</span>
              </div>
            </div>
            <button onClick={handleRunSingle} disabled={!binPath || loading} className="btn-run-inference">
              {loading ? <><span className="btn-spinner" />분석 중</> : '분석 시작'}
            </button>
          </>
        ) : (
          <>
            <div className="batch-controls-row">
              <button onClick={handleAddBatchFiles} className="btn-add-files" disabled={batchLoading}>+ 파일 추가</button>
              <ConcurrencySelector
                id="concurrency-level"
                value={concurrencyLevel}
                onChange={handleConcurrencyChange}
                disabled={batchLoading}
              />
            </div>

            <BatchFileList
              files={batchFiles}
              onRemove={handleRemoveBatchFile}
              disabled={batchLoading}
              onRetry={handleRetryFile}
              getLabel={(file) => (
                <span className={`file-label ${file.result.final_label}`}>
                  {file.result.final_label.toUpperCase()}
                </span>
              )}
            />

            {batchFiles.length > 0 && (
              <BatchProgressBar batchProgress={batchProgress} batchLoading={batchLoading} />
            )}

            <div className="batch-action-buttons">
              <button
                onClick={handleRunBatch}
                disabled={batchFiles.length === 0 || batchLoading}
                className="btn-run-inference"
              >
                {batchLoading ? <><span className="btn-spinner" />분석 중</> : '전체 분석 시작'}
              </button>
              {batchLoading && (
                <button onClick={handleCancelBatch} className="btn-cancel">⏹ 취소</button>
              )}
            </div>

            {batchFiles.some(f => f.status === 'completed') && (
              <div className="export-buttons">
                <button onClick={handleExportJson}  className="btn-export">JSON 내보내기</button>
                <button onClick={handleExportCsv}   className="btn-export">CSV 내보내기</button>
                <button onClick={handleExportExcel} className="btn-export">Excel 내보내기 (이미지 포함)</button>
              </div>
            )}
          </>
        )}
      </div>

      {error && (
        <div style={{
          background: 'var(--status-anomaly-bg)', color: 'var(--status-anomaly)',
          padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem',
          border: '1px solid var(--status-anomaly-border)'
        }}>
          ⚠️ {error}
        </div>
      )}

      {mode === 'single' && result && <ResultPanel result={result} />}

      {mode === 'batch' && batchFiles.some(f => f.status === 'completed' || f.status === 'failed') && (
        <div className="batch-results">
          <h3 className="results-title">분석 결과</h3>
          {batchFiles.map(file => {
            if (file.status !== 'completed' && file.status !== 'failed') return null
            return (
              <details key={file.path} className="result-accordion" open>
                <summary className={`accordion-header ${file.status}`}>
                  <span className="accordion-title">
                    {file.status === 'completed' ? '✓' : '✗'}{' '}
                    {file.path.split(/[/\\]/).pop()}
                  </span>
                  {file.result && (
                    <span className={`accordion-label ${file.result.final_label}`}>
                      {file.result.final_label.toUpperCase()}
                    </span>
                  )}
                  {file.error && <span className="accordion-error">실패</span>}
                </summary>
                <div className="accordion-content">
                  {file.status === 'failed'    && <div className="error-box">⚠️ {file.error}</div>}
                  {file.status === 'completed' && file.result && <ResultPanel result={file.result} />}
                </div>
              </details>
            )
          })}
        </div>
      )}
    </div>
  )
}
