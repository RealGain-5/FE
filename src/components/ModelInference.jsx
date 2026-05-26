import React, { useState } from 'react'
import './ModelInference.css'
import { useAnalysisController } from '../hooks/useAnalysisController'
import { AnalysisModeLayout } from './shared/AnalysisModeLayout'
import { getFileName } from '../utils/fileUtils'
import { LABEL_STRATEGIES } from '../utils/labelStrategies'

// ?????????????????????????????????????????????
// RCP 移대뱶 而댄룷?뚰듃 (???ы븿)
// ?????????????????????????????????????????????
function RCPCard({ rcp, data, visualization }) {
  const [activeTab, setActiveTab] = useState('orbit')
  const [timelineIndex, setTimelineIndex] = useState(0)
  const [showModelDetail, setShowModelDetail] = useState(false)
  const hasEnsemble = !!(data?.model_predictions)
  const probabilities = data?.probabilities ?? {}

  const tabs = [
    { id: 'orbit',    label: 'Orbit' },
    { id: 'heatmap',  label: 'Grad-CAM' },
    { id: 'overlay',  label: 'Overlay' },
    { id: 'ig',       label: 'IG' },
    { id: 'timeline', label: 'Timeline' },
  ]

  const getImagePath = () => {
    if (!visualization) return null
    let path = ''
    if (activeTab === 'orbit')    path = visualization.orbit
    else if (activeTab === 'heatmap')  path = visualization.gradcam?.heatmap
    else if (activeTab === 'overlay')  path = visualization.gradcam?.overlay
    else if (activeTab === 'ig')       path = visualization.ig?.resnet_overlay
    else if (activeTab === 'timeline') path = visualization.temporal?.[timelineIndex]
    if (!path) return null
    return `media://${path.replace(/\\/g, '/')}`
  }

  const imagePath = getImagePath()

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
            }}>Ensemble</span>
          )}
          <span className={`status-badge ${data?.prediction ?? 'unknown'}`}>{data?.prediction ?? 'unknown'}</span>
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
            {imagePath ? (
              <img src={imagePath} alt="Vis" className="vis-image" />
            ) : (
              <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Visualization data is not available.</div>
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
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Visualization is preparing.</div>
        )}
      </div>

      <div className="prob-list">
        {Object.entries(probabilities).map(([cls, prob]) => (
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
            <span style={{ fontSize: '0.65rem' }}>{showModelDetail ? '-' : '+'}</span>
            Model details
          </button>
          {showModelDetail && (() => {
            const firstMp = data?.model_predictions?.resnet ?? data?.model_predictions?.cnn1d
            const classKeys = firstMp?.probabilities ? Object.keys(firstMp.probabilities) : ['normal']
            return (
              <table style={{ width: '100%', fontSize: '0.72rem', borderCollapse: 'collapse', marginTop: '4px' }}>
                <thead>
                  <tr style={{ color: 'var(--text-secondary)' }}>
                    <th style={{ textAlign: 'left', padding: '2px 4px', fontWeight: 500 }}>紐⑤뜽</th>
                    <th style={{ textAlign: 'left', padding: '2px 4px', fontWeight: 500 }}>?먯젙</th>
                    {classKeys.map((cls) => (
                      <th key={cls} style={{ textAlign: 'right', padding: '2px 4px', fontWeight: 500 }}>{cls}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[{ key: 'resnet', label: 'ResNet' }, { key: 'cnn1d', label: '1D CNN' }].map(({ key, label }) => {
                    const mp = data?.model_predictions?.[key]
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
                            {((mp.probabilities?.[cls] ?? 0) * 100).toFixed(1)}%
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

// ?????????????????????????????????????????????
// 寃곌낵 ?⑤꼸
// ?????????????????????????????????????????????
function ResultPanel({ result }) {
  const finalLabel = result?.final_label ?? 'unknown'
  const rcpResults = result?.results ?? {}

  return (
    <div className="result-container">
      <div className={`result-overview ${finalLabel}`}>
        <span className="verdict-label">理쒖쥌 遺꾩꽍 ?먯젙</span>
        <span className="verdict-value">{String(finalLabel).toUpperCase()}</span>
      </div>
      <div className="rcp-grid">
        {Object.entries(rcpResults).map(([rcp, data]) => (
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

// ?????????????????????????????????????????????
// 硫붿씤 而댄룷?뚰듃
// ?????????????????????????????????????????????
export function ModelInference() {
  const {
    mode, setMode,
    binPath,
    loading, result, error,
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
      await window.api.saveLog('INFERENCE', `遺꾩꽍 ?꾨즺: ${data.final_label} (${binPath})`)
    },
    onBatchComplete: async (paths, response) => {
      if (response.success) {
        await window.api.saveLog(
          'BATCH_INFERENCE',
          `諛곗튂 遺꾩꽍 ?꾨즺: ${paths.length}媛??뚯씪 (?깃났: ${response.summary?.completed ?? 0}, ?ㅽ뙣: ${response.summary?.failed ?? 0})`
        )
      }
    },
  })

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

  // 怨듯넻 ?대낫?닿린 ?ㅽ뻾 ?ы띁
  const runExport = async (apiCall, data, label) => {
    try {
      const response = await apiCall(data)
      if (response.success) alert(`${label} ?뚯씪????λ릺?덉뒿?덈떎.\n${response.filePath}`)
      else if (!response.cancelled) alert(`?대낫?닿린 ?ㅽ뙣: ${response.error}`)
    } catch (err) {
      alert(`?대낫?닿린 ?ㅻ쪟: ${err.message}`)
    }
  }

  const handleExportJson = () => {
    const completedFiles = batchFiles.filter(f => f.status === 'completed')
    if (completedFiles.length === 0) { alert('?대낫??寃곌낵媛 ?놁뒿?덈떎.'); return }
    const exportData = {
      timestamp: new Date().toISOString(),
      totalFiles: batchFiles.length,
      completed: completedFiles.length,
      failed: batchFiles.filter(f => f.status === 'failed').length,
      results: completedFiles.map(f => ({
        filePath: f.path,
        fileName: getFileName(f.path),
        finalLabel: f.result.final_label,
        rcpResults: f.result.results,
        visualization: f.result.visualization,
      })),
    }
    runExport(window.api.exportResultsJson, exportData, 'JSON')
  }

  const handleExportCsv = () => {
    const exportData = batchFiles.map(f => ({ path: f.path, status: f.status, result: f.result, error: f.error }))
    runExport(window.api.exportResultsCsv, exportData, 'CSV')
  }

  const handleExportExcel = () => {
    const exportData = batchFiles.map(f => ({ path: f.path, status: f.status, result: f.result, error: f.error }))
    runExport(window.api.exportResultsExcel, exportData, 'Excel')
  }

  return (
    <AnalysisModeLayout
      title="Orbit ?댁긽 ?먯?"
      mode={mode}
      setMode={setMode}
      binPath={binPath}
      loading={loading}
      onSelectFile={handleSelectFile}
      onRunSingle={handleRunSingle}
      singleResult={result}
      renderSingleResult={(r) => <ResultPanel result={r} />}
      batchFiles={batchFiles}
      batchProgress={batchProgress}
      batchLoading={batchLoading}
      concurrencyLevel={concurrencyLevel}
      onConcurrencyChange={handleConcurrencyChange}
      concurrencyId="concurrency-level"
      onAddFiles={handleAddBatchFiles}
      onRemoveFile={handleRemoveBatchFile}
      onRetryFile={handleRetryFile}
      onRunBatch={handleRunBatch}
      onCancelBatch={handleCancelBatch}
      getFileLabel={LABEL_STRATEGIES.ensemble.getFileLabel}
      getAccordionLabel={LABEL_STRATEGIES.ensemble.getAccordionLabel}
      renderBatchResult={(r) => <ResultPanel result={r} />}
      batchExtraControls={
        batchFiles.some(f => f.status === 'completed') ? (
          <div className="export-buttons">
            <button onClick={handleExportJson}  className="btn-export">JSON ?대낫?닿린</button>
            <button onClick={handleExportCsv}   className="btn-export">CSV ?대낫?닿린</button>
            <button onClick={handleExportExcel} className="btn-export">Excel ?대낫?닿린 (?대?吏 ?ы븿)</button>
          </div>
        ) : null
      }
      error={error}
    />
  )
}
