import React, { useState } from 'react'
import './ModelInference.css'

// ─────────────────────────────────────────────
// 이상 점수 게이지 (prob-track 스타일 재사용)
// ─────────────────────────────────────────────
function ScoreGauge({ normalizedScore }) {
  // 0 ~ 2.0 범위 표시 (1.0 = 임계값 = 50% 위치)
  const fillPct = Math.min(normalizedScore / 2.0, 1.0) * 100
  const isAnomaly = normalizedScore >= 1.0

  return (
    <div className="prob-row">
      <div className="prob-info">
        <span>이상 점수 (정규화)</span>
        <strong style={{ color: isAnomaly ? 'var(--status-anomaly)' : 'var(--status-normal)' }}>
          {normalizedScore.toFixed(3)}
        </strong>
      </div>
      <div className="prob-track" style={{ position: 'relative' }}>
        <div
          className={`prob-fill ${isAnomaly ? 'abnormal' : 'normal'}`}
          style={{ width: `${fillPct}%` }}
        />
        {/* 임계값 기준선 마커 (50% 위치) */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: '2px',
          background: 'var(--border-strong)',
          transform: 'translateX(-50%)',
        }} />
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.65rem',
        color: 'var(--text-muted)',
        marginTop: '2px',
      }}>
        <span>0</span>
        <span>임계값</span>
        <span>2×임계값</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 개별 RCP 카드
// ─────────────────────────────────────────────
function SVDDRCPCard({ rcp, data, orbitB64 }) {
  const isAnomaly = data.is_anomaly

  const getOrbitSrc = () => {
    if (!orbitB64) return null
    if (orbitB64.startsWith('data:')) return orbitB64
    const normalized = orbitB64.replace(/\\/g, '/')
    return `media://${normalized}`
  }

  return (
    <div className="rcp-card">
      <div className="card-header">
        <span className="card-title">{rcp}</span>
        <span className={`status-badge ${isAnomaly ? 'abnormal' : 'normal'}`}>
          {isAnomaly ? '이상' : '정상'}
        </span>
      </div>

      <div className="visualization-area">
        {orbitB64 ? (
          <img src={getOrbitSrc()} alt={`${rcp} orbit`} className="vis-image" />
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>시각화 준비 중</div>
        )}
      </div>

      <div className="prob-list">
        {/* 이상 점수 게이지 */}
        <ScoreGauge normalizedScore={data.normalized_score} />

        {/* 진폭 */}
        <div className="prob-row">
          <div className="prob-info">
            <span>진폭 (mil)</span>
            <strong>{data.amplitude_mil.toFixed(3)}</strong>
          </div>
        </div>

        {/* 원시 점수 / 임계값 */}
        <div className="prob-row">
          <div className="prob-info">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>원시 점수 / 임계값</span>
            <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {data.score.toFixed(5)} / {data.threshold.toFixed(5)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 결과 패널
// ─────────────────────────────────────────────
function SVDDResultPanel({ result }) {
  const isAnomaly = result.final_verdict === 'anomaly'
  const verdictClass = isAnomaly ? 'abnormal' : 'normal'

  return (
    <div className="result-container">
      <div className={`result-overview ${verdictClass}`}>
        <span className="verdict-label">SVDD 이상 탐지 판정</span>
        <div style={{ textAlign: 'right' }}>
          <span className="verdict-value">
            {isAnomaly ? 'ANOMALY' : 'NORMAL'}
          </span>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px', fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>
            최대 정규화 점수: <strong>{result.max_normalized_score.toFixed(3)}</strong>
            &nbsp;/ 임계값: <strong>{result.threshold.toFixed(5)}</strong>
          </div>
        </div>
      </div>

      <div className="rcp-grid">
        {Object.entries(result.results).map(([rcp, data]) => (
          <SVDDRCPCard
            key={rcp}
            rcp={rcp}
            data={data}
            orbitB64={result.images?.[rcp]?.orbit}
          />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
export function SVDDAnalysis() {
  const [mode, setMode] = useState('single') // 'single' | 'batch'

  // 단일 파일 상태
  const [binPath, setBinPath] = useState('')
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  // 배치 상태
  const [batchFiles, setBatchFiles]       = useState([]) // [{path, status, result, error}]
  const [batchProgress, setBatchProgress] = useState({ total: 0, completed: 0, failed: 0, current: null })
  const [batchLoading, setBatchLoading]   = useState(false)

  // ── 단일 파일 핸들러 ──
  const handleSelectFile = async () => {
    try {
      const p = await window.api.selectBinFile()
      if (p) { setBinPath(p); setResult(null); setError(null) }
    } catch (err) {
      setError(`파일 선택 오류: ${err.message}`)
    }
  }

  const handleAnalyze = async () => {
    if (!binPath) { setError('먼저 BIN 파일을 선택해주세요.'); return }
    setLoading(true); setResult(null); setError(null)
    try {
      const response = await window.api.runSVDDAnalysis(binPath)
      if (response.success) setResult(response.data)
      else setError(response.error || 'SVDD 분석 중 오류가 발생했습니다.')
    } catch (e) {
      setError(e.message || '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }

  // ── 배치 핸들러 ──
  const handleAddBatchFiles = async () => {
    try {
      const paths = await window.api.selectBinFiles()
      if (paths && paths.length > 0) {
        const pendingFiles = batchFiles.filter(f => f.status === 'pending')
        const existingPaths = new Set(pendingFiles.map(f => f.path))
        const newPaths = paths.filter(p => !existingPaths.has(p))
        const newFiles = newPaths.map(path => ({ path, status: 'pending', result: null, error: null }))
        setBatchFiles([...pendingFiles, ...newFiles])
        setBatchProgress({ total: 0, completed: 0, failed: 0, current: null })
        if (newPaths.length < paths.length) {
          alert(`${paths.length - newPaths.length}개의 중복 파일이 제외되었습니다.`)
        }
      }
    } catch (err) {
      setError(`파일 선택 오류: ${err.message}`)
    }
  }

  const handleRemoveBatchFile = (path) => {
    setBatchFiles(prev => prev.filter(f => f.path !== path))
  }

  const handleRunBatch = async () => {
    if (batchFiles.length === 0) { setError('먼저 분석할 파일을 추가해주세요.'); return }
    setBatchLoading(true)
    setError(null)
    setBatchFiles(prev => prev.map(f => ({ ...f, status: 'pending', result: null, error: null })))
    setBatchProgress({ total: batchFiles.length, completed: 0, failed: 0, current: null })

    window.api.onSVDDBatchProgress((progress) => {
      setBatchProgress(progress)

      // 파일 상태: 처리 중
      if (progress.current && !progress.currentResult && !progress.currentError) {
        setBatchFiles(prev => prev.map(f =>
          f.path === progress.current ? { ...f, status: 'running' } : f
        ))
      }
      // 완료
      if (progress.currentResult && progress.current) {
        setBatchFiles(prev => prev.map(f =>
          f.path === progress.current
            ? { ...f, status: 'completed', result: progress.currentResult }
            : f
        ))
      }
      // 실패
      if (progress.currentError && progress.current) {
        setBatchFiles(prev => prev.map(f =>
          f.path === progress.current
            ? { ...f, status: 'failed', error: progress.currentError }
            : f
        ))
      }
    })

    try {
      const paths = batchFiles.map(f => f.path)
      await window.api.runSVDDBatch(paths)
    } catch (err) {
      setError(`배치 분석 오류: ${err.message}`)
    } finally {
      setBatchLoading(false)
      window.api.offSVDDBatchProgress()
    }
  }

  const handleCancelBatch = async () => {
    if (!window.confirm('진행 중인 분석을 취소하시겠습니까?')) return
    try {
      await window.api.cancelSVDDBatch()
      setBatchLoading(false)
      window.api.offSVDDBatchProgress()
    } catch (err) {
      console.error('Cancel error:', err)
    }
  }

  return (
    <div className="model-inference">
      <div className="control-panel">
        <div className="header-row">
          <h2 className="section-title">SVDD 이상 탐지</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="mae-model-badge">OrbitSVDD · 거리 기반</div>
            <div className="mode-toggle">
              <button
                className={`mode-btn ${mode === 'single' ? 'active' : ''}`}
                onClick={() => setMode('single')}
              >단일 파일</button>
              <button
                className={`mode-btn ${mode === 'batch' ? 'active' : ''}`}
                onClick={() => setMode('batch')}
              >배치 처리</button>
            </div>
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
              onClick={handleAnalyze}
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
            </div>

            {batchFiles.length > 0 && (
              <div className="batch-file-list">
                <div className="file-list-header">선택된 파일 ({batchFiles.length}개)</div>
                <div className="file-items">
                  {batchFiles.map(file => (
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
                        {file.result && (
                          <span className={`file-label ${file.result.final_verdict === 'anomaly' ? 'abnormal' : 'normal'}`}>
                            {file.result.final_verdict.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="file-actions">
                        <button
                          className="btn-remove"
                          onClick={() => handleRemoveBatchFile(file.path)}
                          disabled={batchLoading}
                          title="제거"
                        >✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {batchFiles.length > 0 && (
              <div className="batch-progress">
                <div className="progress-text">
                  전체 진행률: {batchProgress.completed}/{batchProgress.total || batchFiles.length}
                  {batchProgress.failed > 0 && ` (실패: ${batchProgress.failed})`}
                </div>
                <div className="progress-bar-wrapper">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${batchProgress.total
                        ? (batchProgress.completed / batchProgress.total) * 100
                        : 0}%`
                    }}
                  />
                </div>
                {batchLoading && batchProgress.current && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    ⏳ {batchProgress.current.split(/[/\\]/).pop()}
                  </div>
                )}
              </div>
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
                <button onClick={handleCancelBatch} className="btn-cancel">
                  ⏹ 취소
                </button>
              )}
            </div>
          </>
        )}

        {error && (
          <div className="error-message" style={{ marginTop: '0.75rem' }}>
            {error}
            {error.includes('모델이 로드되지 않았습니다') && (
              <div style={{ marginTop: '6px', fontSize: '0.85rem' }}>
                학습 명령어:{' '}
                <code>venv/Scripts/python.exe python/train_svdd.py --data_dir ../data</code>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 단일 파일 결과 */}
      {mode === 'single' && result && <SVDDResultPanel result={result} />}

      {/* 배치 결과 아코디언 */}
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
                    <span className={`accordion-label ${file.result.final_verdict === 'anomaly' ? 'abnormal' : 'normal'}`}>
                      {file.result.final_verdict.toUpperCase()}
                    </span>
                  )}
                  {file.error && <span className="accordion-error">실패</span>}
                </summary>
                <div className="accordion-content">
                  {file.status === 'failed' && (
                    <div className="error-box">⚠️ {file.error}</div>
                  )}
                  {file.status === 'completed' && file.result && (
                    <SVDDResultPanel result={file.result} />
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
