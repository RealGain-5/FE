import React, { useState } from 'react'
import './ModelInference.css'
import './MAEAnalysis.css'
import { useAnalysisController } from '../hooks/useAnalysisController'
import { ConcurrencySelector } from './shared/ConcurrencySelector'
import { BatchFileList } from './shared/BatchFileList'
import { BatchProgressBar } from './shared/BatchProgressBar'

// ─────────────────────────────────────────────
// Score Gauge (0 ~ 2× threshold 표시)
// ─────────────────────────────────────────────
function MAEScoreGauge({ normalizedScore }) {
  const fillPct = Math.min(normalizedScore / 2.0, 1.0) * 100
  const isAnomaly = normalizedScore >= 1.0

  return (
    <div className="prob-row">
      <div className="prob-info">
        <span>재구성 오차 (정규화)</span>
        <strong style={{ color: isAnomaly ? 'var(--status-anomaly)' : 'var(--status-normal)' }}>
          {normalizedScore.toFixed(3)}
        </strong>
      </div>
      <div className="prob-track" style={{ position: 'relative' }}>
        <div
          className={`prob-fill ${isAnomaly ? 'abnormal' : 'normal'}`}
          style={{ width: `${fillPct}%` }}
        />
        <div style={{
          position: 'absolute', left: '50%', top: 0, bottom: 0,
          width: '2px', background: 'var(--border-strong)',
          transform: 'translateX(-50%)',
        }} />
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px',
      }}>
        <span>0</span><span>임계값</span><span>2×임계값</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 4-column spectrogram panel (per RCP)
// ─────────────────────────────────────────────
function SpectrogramGrid({ rcp, images, isAnomaly }) {
  const panels = [
    { key: 'input_spec',    label: '입력 스펙트로그램',   tag: '입력',    tagClass: 'mae-tag-input' },
    { key: 'recon_spec',    label: 'MAE 재구성',          tag: '재구성',  tagClass: 'mae-tag-recon' },
    { key: 'error_overlay', label: '재구성 실패 오차맵',  tag: '실패',    tagClass: 'mae-tag-fail' },
    { key: 'error_heatmap', label: 'Reconstruction Error', tag: '히트맵', tagClass: 'mae-tag-heat' },
  ]

  return (
    <div className={`mae-spec-grid ${isAnomaly ? 'mae-anomaly' : ''}`}>
      <div className="mae-rcp-label">
        <span className="mae-rcp-name">{rcp}</span>
        <span className={`mae-verdict-tag ${isAnomaly ? 'tag-anomaly' : 'tag-normal'}`}>
          {isAnomaly ? '이상' : '정상'}
        </span>
      </div>
      <div className="mae-four-col">
        {panels.map(({ key, label, tag, tagClass }, i) => (
          <div key={key} className={`mae-panel ${i >= 2 && isAnomaly ? 'mae-panel-warn' : ''}`}>
            <div className="mae-panel-head">
              <div className="mae-panel-meta">
                <span className="mae-panel-num">0{i + 1}</span>
                <span className="mae-panel-title">{label}</span>
              </div>
              <span className={`mae-tag ${tagClass}`}>{tag}</span>
            </div>
            <div className="mae-img-wrap">
              {images?.[key] ? (
                <img src={images[key]} alt={label} className="mae-spec-img" />
              ) : (
                <div className="mae-img-placeholder">—</div>
              )}
            </div>
            <div className="mae-axis-x">
              <span>0 Hz</span><span>2500</span><span>5000</span><span>7500</span><span>10000 Hz</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Global score bar (분석 요약)
// ─────────────────────────────────────────────
function MAEScoreMeter({ result }) {
  const maxNorm  = result.max_normalized_score
  const isAnom   = result.final_verdict === 'anomaly'
  const fillPct  = Math.min(maxNorm / 2.0, 1.0) * 100

  const worstEntry = Object.entries(result.results).reduce((acc, [rcp, d]) =>
    d.normalized_score > acc[1].normalized_score ? [rcp, d] : acc
  )
  const worstRcp  = worstEntry[0]
  const worstData = worstEntry[1]

  return (
    <div className={`mae-meter ${isAnom ? 'mae-meter-anom' : 'mae-meter-ok'}`}>
      <div className="mae-meter-left">
        <div className="mae-meter-label">최대 재구성 오차</div>
        <div className={`mae-meter-value ${isAnom ? 'val-red' : 'val-green'}`}>
          {worstData.score.toFixed(5)}
        </div>
        <div className="mae-meter-sub">
          {worstRcp} · 정규화 {maxNorm.toFixed(3)}×
        </div>
      </div>

      <div className="mae-meter-bar-zone">
        <div className="mae-bar-track">
          <div className="mae-bar-fill" style={{ width: `${fillPct}%` }} />
          <div className="mae-bar-threshold" style={{ left: '50%' }}>
            <span className="mae-thresh-label">임계값 {result.threshold.toFixed(5)}</span>
          </div>
        </div>
        <div className="mae-bar-ticks">
          <span>0</span>
          <span style={{ color: 'var(--status-normal)' }}>← 정상 →</span>
          <span style={{ color: 'var(--status-anomaly)' }}>← 이상 →</span>
          <span>2×</span>
        </div>
      </div>

      <div className="mae-meter-right">
        <div className={`mae-verdict-big ${isAnom ? 'verd-anomaly' : 'verd-normal'}`}>
          {isAnom ? 'ANOMALY' : 'NORMAL'}
        </div>
        <div className="mae-meter-label" style={{ textAlign: 'right' }}>MAE 판정</div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 결과 패널
// ─────────────────────────────────────────────
function MAEResultPanel({ result }) {
  const [activeRcp, setActiveRcp] = useState(Object.keys(result.results)[0])
  const rcpList = Object.keys(result.results)
  const rcpData = result.results[activeRcp]
  const rcpImgs = result.images?.[activeRcp]

  return (
    <div className="result-container">
      <MAEScoreMeter result={result} />

      <div className="mae-rcp-tabs">
        {rcpList.map((rcp) => {
          const d = result.results[rcp]
          return (
            <button
              key={rcp}
              className={`mae-rcp-tab ${activeRcp === rcp ? 'active' : ''} ${d.is_anomaly ? 'tab-anom' : ''}`}
              onClick={() => setActiveRcp(rcp)}
            >
              <span className="mae-tab-rcp">{rcp}</span>
              <span className={`mae-tab-score ${d.is_anomaly ? 'score-red' : 'score-green'}`}>
                {d.normalized_score.toFixed(2)}×
              </span>
            </button>
          )
        })}
      </div>

      <SpectrogramGrid rcp={activeRcp} images={rcpImgs} isAnomaly={rcpData.is_anomaly} />

      <div className="mae-detail-row">
        <div className="prob-list" style={{ flex: 1 }}>
          <MAEScoreGauge normalizedScore={rcpData.normalized_score} />
          <div className="prob-row">
            <div className="prob-info">
              <span>원시 점수 / 임계값</span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {rcpData.score.toFixed(6)} / {rcpData.threshold.toFixed(6)}
              </span>
            </div>
          </div>
          <div className="prob-row">
            <div className="prob-info">
              <span>진폭 (mil)</span>
              <strong>{rcpData.amplitude_mil.toFixed(3)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
export function MAEAnalysis() {
  const {
    mode, setMode,
    binPath,
    loading, result, error,
    batchFiles,
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
    apiRunSingle:   (path) => window.api.runMAEAnalysis(path),
    apiRunBatch:    (paths) => window.api.runMAEBatch(paths),
    apiCancelBatch: () => window.api.cancelMAEBatch(),
    onBatchProgress:  window.api.onMAEBatchProgress,
    offBatchProgress: window.api.offMAEBatchProgress,
  })

  return (
    <div className="model-inference">
      <div className="control-panel">
        <div className="header-row">
          <h2 className="section-title">MAE 이상 탐지</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="mae-model-badge">OrbitMAE1D · 재구성 오차 기반</div>
            <div className="mode-toggle">
              <button className={`mode-btn ${mode === 'single' ? 'active' : ''}`} onClick={() => setMode('single')}>단일 파일</button>
              <button className={`mode-btn ${mode === 'batch'  ? 'active' : ''}`} onClick={() => setMode('batch')}>배치 처리</button>
            </div>
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
                id="mae-concurrency-level"
                value={concurrencyLevel}
                onChange={handleConcurrencyChange}
                disabled={batchLoading}
              />
            </div>

            <BatchFileList
              files={batchFiles}
              onRemove={handleRemoveBatchFile}
              disabled={batchLoading}
              getLabel={(file) => (
                <span className={`file-label ${file.result.final_verdict === 'anomaly' ? 'abnormal' : 'normal'}`}>
                  {file.result.final_verdict.toUpperCase()}
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
          </>
        )}

        {error && (
          <div className="error-message" style={{ marginTop: '0.75rem' }}>{error}</div>
        )}
      </div>

      {mode === 'single' && result && <MAEResultPanel result={result} />}

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
                  {file.status === 'failed'    && <div className="error-box">⚠️ {file.error}</div>}
                  {file.status === 'completed' && file.result && <MAEResultPanel result={file.result} />}
                </div>
              </details>
            )
          })}
        </div>
      )}
    </div>
  )
}
