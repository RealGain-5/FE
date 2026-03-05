import React, { useState } from 'react'
import './ModelInference.css'

// RCP 카드 컴포넌트 (탭 포함)
function RCPCard({ rcp, data, visualization }) {
  const [activeTab, setActiveTab] = useState('orbit')
  const [timelineIndex, setTimelineIndex] = useState(9) // 기본 sec9
  const [showModelDetail, setShowModelDetail] = useState(false)
  const hasEnsemble = !!(data.model_predictions)

  const tabs = [
    { id: 'orbit', label: '궤도' },
    { id: 'heatmap', label: 'Grad-CAM' },
    { id: 'overlay', label: '오버레이' },
    { id: 'ig', label: 'IG' },
    { id: 'timeline', label: '타임라인' }
  ]

  // 이미지 경로 처리 함수
  const getImagePath = () => {
    if (!visualization) return null

    let path = ''
    if (activeTab === 'orbit') {
      path = visualization.orbit
    } else if (activeTab === 'heatmap') {
      path = visualization.gradcam.heatmap
    } else if (activeTab === 'overlay') {
      path = visualization.gradcam.overlay
    } else if (activeTab === 'ig') {
      path = visualization.ig?.resnet_overlay
    } else if (activeTab === 'timeline') {
      path = visualization.temporal[timelineIndex]
    }

    if (!path) return null

    // Windows 역슬래시(\)를 슬래시(/)로 변경
    const normalizedPath = path.replace(/\\/g, '/')

    // [중요] file:// 대신 media:// 프로토콜 사용
    const fileUrl = `media://${normalizedPath}`

    console.log('[RCPCard] Image path:', path)
    console.log('[RCPCard] File URL:', fileUrl)

    return fileUrl
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
            {/* 타임라인 슬라이더 (오버레이 스타일) */}
            {activeTab === 'timeline' && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 10,
                  left: 10,
                  right: 10,
                  background: 'rgba(0,0,0,0.6)',
                  padding: '5px 10px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'white'
                }}
              >
                <span style={{ fontSize: '12px', width: '20px' }}>{timelineIndex}s</span>
                <input
                  type="range"
                  min="0"
                  max="9"
                  value={timelineIndex}
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

      {/* 앙상블 개별 모델 결과 */}
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
            // 클래스 목록을 첫 번째 사용 가능한 모델에서 동적으로 추출
            const firstMp = data.model_predictions?.resnet ?? data.model_predictions?.cnn1d
            const classKeys = firstMp ? Object.keys(firstMp.probabilities) : ['normal']
            return (
              <table style={{ width: '100%', fontSize: '0.72rem', borderCollapse: 'collapse', marginTop: '4px' }}>
                <thead>
                  <tr style={{ color: 'var(--text-secondary)' }}>
                    <th style={{ textAlign: 'left', padding: '2px 4px', fontWeight: 500 }}>모델</th>
                    <th style={{ textAlign: 'left', padding: '2px 4px', fontWeight: 500 }}>판정</th>
                    {classKeys.map((cls) => (
                      <th key={cls} style={{ textAlign: 'right', padding: '2px 4px', fontWeight: 500 }}>
                        {cls}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: 'resnet', label: 'ResNet' },
                    { key: 'cnn1d',  label: '1D CNN' },
                  ].map(({ key, label }) => {
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

// 메인 컴포넌트
export function ModelInference() {
  // 모드 전환
  const [mode, setMode] = useState('single') // 'single' | 'batch'

  // 단일 파일 모드 상태
  const [binPath, setBinPath] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // 배치 모드 상태
  const [batchFiles, setBatchFiles] = useState([]) // [{ path, status, result, error }]
  const [batchProgress, setBatchProgress] = useState({ total: 0, completed: 0, failed: 0, running: [], runningCount: 0 })
  const [batchLoading, setBatchLoading] = useState(false)
  const [concurrencyLevel, setConcurrencyLevel] = useState(2)  // 🆕 병렬 처리 수준 (기본값: 2)

  // 🆕 병렬 처리 수준 변경 핸들러
  const handleConcurrencyChange = async (e) => {
    const level = parseInt(e.target.value)
    
    // 레벨 4에 대한 경고
    if (level === 4) {
      const confirmed = window.confirm(
        '⚠️ 병렬 처리 수준 4는 시스템 리소스를 많이 사용합니다.\n' +
        'CPU 사용률이 높아지고 메모리 부하가 증가할 수 있습니다.\n\n' +
        '계속하시겠습니까?'
      )
      if (!confirmed) {
        return // 사용자가 취소한 경우 변경 안함
      }
    }
    
    setConcurrencyLevel(level)
    
    try {
      await window.api.setConcurrencyLevel(level)
      console.log(`[ModelInference] Concurrency level set to ${level}`)
    } catch (err) {
      console.error('[ModelInference] Failed to set concurrency level:', err)
      alert(`병렬 처리 수준 설정 실패: ${err.message}`)
    }
  }

  const handleSelectFile = async () => {
    try {
      const path = await window.api.selectBinFile()
      if (path) {
        setBinPath(path)
        setResult(null)
        setError(null)
      }
    } catch (err) {
      setError(`파일 선택 오류: ${err.message}`)
    }
  }

  const handleRunInference = async () => {
    if (!binPath) {
      setError('먼저 BIN 파일을 선택해주세요.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await window.api.runInference(binPath)

      if (response.success) {
        setResult(response.data)
        console.log('[ModelInference] Result:', response.data)

        // 로그 저장
        await window.api.saveLog(
          'INFERENCE',
          `분석 완료: ${response.data.final_label} (${binPath})`
        )
      } else {
        setError(response.error)
      }
    } catch (err) {
      setError(`추론 오류: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // === 배치 모드 핸들러 ===
  const handleAddBatchFiles = async () => {
    try {
      const paths = await window.api.selectBinFiles()
      if (paths && paths.length > 0) {
        // 아직 분석 대기 중인 파일만 유지, 완료/실패 파일은 제거
        const pendingFiles = batchFiles.filter((f) => f.status === 'pending')
        const existingPaths = new Set(pendingFiles.map((f) => f.path))
        const newPaths = paths.filter((p) => !existingPaths.has(p))

        const newFiles = newPaths.map((path) => ({
          path,
          status: 'pending',
          result: null,
          error: null
        }))

        setBatchFiles([...pendingFiles, ...newFiles])
        setBatchProgress({ total: 0, completed: 0, failed: 0, running: [], runningCount: 0 })

        if (newPaths.length < paths.length) {
          alert(`${paths.length - newPaths.length}개의 중복 파일이 제외되었습니다.`)
        }
      }
    } catch (err) {
      setError(`파일 선택 오류: ${err.message}`)
    }
  }

  const handleRemoveBatchFile = (path) => {
    setBatchFiles((prev) => prev.filter((f) => f.path !== path))
  }

  const handleRunBatchInference = async () => {
    if (batchFiles.length === 0) {
      setError('먼저 분석할 파일을 추가해주세요.')
      return
    }

    setBatchLoading(true)
    setError(null)

    // 🆕 모든 파일 상태를 pending으로 초기화
    setBatchFiles((prev) =>
      prev.map((f) => ({ ...f, status: 'pending', result: null, error: null }))
    )

    // 🆕 진행 상황 리스너 등록 (Incremental Update)
    window.api.onBatchProgress((progress) => {
      console.log('[BatchInference] Progress:', progress)
      setBatchProgress(progress)

      // 🆕 현재 실행 중인 파일들 상태 업데이트
      if (progress.running && progress.running.length > 0) {
        setBatchFiles((prev) =>
          prev.map((f) => {
            if (progress.running.includes(f.path)) {
              return { ...f, status: 'running' }
            }
            return f
          })
        )
      }

      // 🆕 완료된 결과 즉시 반영 (Incremental Update)
      if (progress.result && progress.current) {
        setBatchFiles((prev) =>
          prev.map((f) =>
            f.path === progress.current
              ? { ...f, status: 'completed', result: progress.result }
              : f
          )
        )
      }

      // 🆕 실패 즉시 반영 (Incremental Update)
      if (progress.error && progress.current) {
        setBatchFiles((prev) =>
          prev.map((f) =>
            f.path === progress.current
              ? { ...f, status: 'failed', error: progress.error }
              : f
          )
        )
      }
    })

    try {
      const paths = batchFiles.map((f) => f.path)
      const response = await window.api.runBatchInference(paths)

      if (response.success) {
        console.log('[BatchInference] Batch completed:', response.summary)
        await window.api.saveLog('BATCH_INFERENCE', `배치 분석 완료: ${paths.length}개 파일 (성공: ${response.summary.completed}, 실패: ${response.summary.failed})`)
      } else {
        setError(response.error)
      }
    } catch (err) {
      setError(`배치 추론 오류: ${err.message}`)
    } finally {
      setBatchLoading(false)
      window.api.offBatchProgress()
    }
  }

  // 배치 취소
  const handleCancelBatchInference = async () => {
    if (!window.confirm('진행 중인 분석을 취소하시겠습니까?')) {
      return
    }

    try {
      await window.api.cancelBatchInference()
      setBatchLoading(false)
      window.api.offBatchProgress()
      alert('분석이 취소되었습니다.')
    } catch (err) {
      console.error('Cancel error:', err)
    }
  }

  // 개별 파일 재분석
  const handleRetryFile = async (filePath) => {
    setBatchFiles((prev) =>
      prev.map((f) => (f.path === filePath ? { ...f, status: 'running', error: null } : f))
    )

    try {
      const response = await window.api.runInference(filePath)

      if (response.success) {
        setBatchFiles((prev) =>
          prev.map((f) =>
            f.path === filePath ? { ...f, status: 'completed', result: response.data } : f
          )
        )
      } else {
        setBatchFiles((prev) =>
          prev.map((f) =>
            f.path === filePath ? { ...f, status: 'failed', error: response.error } : f
          )
        )
      }
    } catch (err) {
      setBatchFiles((prev) =>
        prev.map((f) =>
          f.path === filePath ? { ...f, status: 'failed', error: err.message } : f
        )
      )
    }
  }

  // JSON 내보내기
  const handleExportJson = async () => {
    const completedFiles = batchFiles.filter((f) => f.status === 'completed')
    if (completedFiles.length === 0) {
      alert('내보낼 결과가 없습니다.')
      return
    }

    const exportData = {
      timestamp: new Date().toISOString(),
      totalFiles: batchFiles.length,
      completed: completedFiles.length,
      failed: batchFiles.filter((f) => f.status === 'failed').length,
      results: completedFiles.map((f) => ({
        filePath: f.path,
        fileName: f.path.split(/[/\\]/).pop(),
        finalLabel: f.result.final_label,
        rcpResults: f.result.results,
        visualization: f.result.visualization
      }))
    }

    try {
      const response = await window.api.exportResultsJson(exportData)
      if (response.success) {
        alert(`JSON 파일이 저장되었습니다.\n${response.filePath}`)
      } else if (!response.cancelled) {
        alert(`내보내기 실패: ${response.error}`)
      }
    } catch (err) {
      alert(`내보내기 오류: ${err.message}`)
    }
  }

  // CSV 내보내기
  const handleExportCsv = async () => {
    const exportData = batchFiles.map((f) => ({
      path: f.path,
      status: f.status,
      result: f.result,
      error: f.error
    }))

    try {
      const response = await window.api.exportResultsCsv(exportData)
      if (response.success) {
        alert(`CSV 파일이 저장되었습니다.\n${response.filePath}`)
      } else if (!response.cancelled) {
        alert(`내보내기 실패: ${response.error}`)
      }
    } catch (err) {
      alert(`내보내기 오류: ${err.message}`)
    }
  }

  // Excel 내보내기 (이미지 포함)
  const handleExportExcel = async () => {
    const exportData = batchFiles.map((f) => ({
      path: f.path,
      status: f.status,
      result: f.result,
      error: f.error
    }))

    try {
      const response = await window.api.exportResultsExcel(exportData)
      if (response.success) {
        alert(`Excel 파일이 저장되었습니다.\n${response.filePath}`)
      } else if (!response.cancelled) {
        alert(`내보내기 실패: ${response.error}`)
      }
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
            <button
              className={`mode-btn ${mode === 'single' ? 'active' : ''}`}
              onClick={() => setMode('single')}
            >
              단일 파일
            </button>
            <button
              className={`mode-btn ${mode === 'batch' ? 'active' : ''}`}
              onClick={() => setMode('batch')}
            >
              배치 처리
            </button>
          </div>
        </div>

        {mode === 'single' ? (
          <>
            <div className="input-group">
              <div className="file-picker-wrapper">
                <button onClick={handleSelectFile} className="btn-file-select" disabled={loading}>
                  파일 선택
                </button>
                <span className="file-path-text">
                  {binPath || '분석할 .bin 파일을 선택해주세요.'}
                </span>
              </div>
            </div>

            <button
              onClick={handleRunInference}
              disabled={!binPath || loading}
              className="btn-run-inference"
            >
              {loading ? <><span className="btn-spinner" />분석 중</> : '분석 시작'}
            </button>
          </>
        ) : (
          <>
            <div className="batch-controls-row">
              <button onClick={handleAddBatchFiles} className="btn-add-files" disabled={batchLoading}>
                + 파일 추가
              </button>
              
              {/* 🆕 병렬 처리 수준 선택 */}
              <div className="concurrency-selector">
                <label htmlFor="concurrency-level">병렬 처리 수준:</label>
                <select
                  id="concurrency-level"
                  value={concurrencyLevel}
                  onChange={handleConcurrencyChange}
                  disabled={batchLoading}
                  className="concurrency-select"
                >
                  <option value={1}>1 (순차 처리)</option>
                  <option value={2}>2 (권장)</option>
                  <option value={3}>3</option>
                  <option value={4}>4 (고부하)</option>
                </select>
              </div>
            </div>

            {batchFiles.length > 0 && (
              <div className="batch-file-list">
                <div className="file-list-header">
                  선택된 파일 ({batchFiles.length}개)
                </div>
                <div className="file-items">
                  {batchFiles.map((file) => (
                    <div key={file.path} className={`file-item ${file.status}`}>
                      <div className="file-info">
                        <span className="file-status-icon">
                          {file.status === 'pending' && '⏸'}
                          {file.status === 'running' && '⏳'}
                          {file.status === 'completed' && '✓'}
                          {file.status === 'failed' && '✗'}
                        </span>
                        <span className="file-path" title={file.path}>
                          {file.path.split(/[/\\]/).pop()}
                        </span>
                        {file.result && (
                          <span className={`file-label ${file.result.final_label}`}>
                            {file.result.final_label.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="file-actions">
                        {file.status === 'failed' && (
                          <button
                            className="btn-retry"
                            onClick={() => handleRetryFile(file.path)}
                            disabled={batchLoading}
                            title="재분석"
                          >
                            ↻
                          </button>
                        )}
                        <button
                          className="btn-remove"
                          onClick={() => handleRemoveBatchFile(file.path)}
                          disabled={batchLoading}
                          title="제거"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {batchFiles.length > 0 && (
              <div className="batch-progress">
                <div className="progress-text">
                  전체 진행률: {batchProgress.completed}/{batchProgress.total}
                  {batchProgress.failed > 0 && ` (실패: ${batchProgress.failed})`}
                </div>
                <div className="progress-bar-wrapper">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${(batchProgress.completed / batchProgress.total) * 100}%`
                    }}
                  />
                </div>
                
                {/* 🆕 현재 실행 중인 파일 표시 */}
                {batchLoading && batchProgress.runningCount > 0 && (
                  <div className="running-files-section">
                    <div className="running-files-header">
                      ⏳ 현재 분석 중 ({batchProgress.runningCount}개):
                    </div>
                    <div className="running-files-list">
                      {batchProgress.running.map((filePath) => (
                        <div key={filePath} className="running-file-item">
                          {filePath.split(/[/\\]/).pop()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="batch-action-buttons">
              <button
                onClick={handleRunBatchInference}
                disabled={batchFiles.length === 0 || batchLoading}
                className="btn-run-inference"
              >
                {batchLoading ? <><span className="btn-spinner" />분석 중</> : '전체 분석 시작'}
              </button>

              {batchLoading && (
                <button onClick={handleCancelBatchInference} className="btn-cancel">
                  ⏹ 취소
                </button>
              )}
            </div>

            {batchFiles.some((f) => f.status === 'completed') && (
              <div className="export-buttons">
                <button onClick={handleExportJson} className="btn-export">
                  📄 JSON 내보내기
                </button>
                <button onClick={handleExportCsv} className="btn-export">
                  📊 CSV 내보내기
                </button>
                <button onClick={handleExportExcel} className="btn-export">
                  📊 Excel 내보내기 (이미지 포함)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {error && (
        <div
          style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            border: '1px solid #fca5a5'
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {mode === 'single' && result && (
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
      )}

      {mode === 'batch' && batchFiles.some((f) => f.status === 'completed' || f.status === 'failed') && (
        <div className="batch-results">
          <h3 className="results-title">분석 결과</h3>
          {batchFiles.map((file) => {
            if (file.status !== 'completed' && file.status !== 'failed') return null

            return (
              <details key={file.path} className="result-accordion" open>
                <summary className={`accordion-header ${file.status}`}>
                  <span className="accordion-title">
                    {file.status === 'completed' && '✓'}
                    {file.status === 'failed' && '✗'}
                    {' '}
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
                  {file.status === 'failed' && (
                    <div className="error-box">⚠️ {file.error}</div>
                  )}

                  {file.status === 'completed' && file.result && (
                    <>
                      <div className={`result-overview ${file.result.final_label}`}>
                        <span className="verdict-label">최종 분석 판정</span>
                        <span className="verdict-value">{file.result.final_label.toUpperCase()}</span>
                      </div>

                      <div className="rcp-grid">
                        {Object.entries(file.result.results).map(([rcp, data]) => (
                          <RCPCard
                            key={rcp}
                            rcp={rcp}
                            data={data}
                            visualization={file.result.visualization?.[rcp]}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </details>
            )
          })}
        </div>
      )}
    </div>
  )
}
