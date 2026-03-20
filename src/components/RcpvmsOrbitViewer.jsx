import React, { useState, useEffect} from 'react'
import './ModelInference.css'
import './DmdOrbitViewer.css'
import { BatchFileList } from './shared/BatchFileList'
import { BatchProgressBar } from './shared/BatchProgressBar'
import { ConcurrencySelector } from './shared/ConcurrencySelector'
import { OrbitGrid, InfoRow, RcpvmsFileInfoPanel } from './shared/OrbitGrid'
import { SubTabNav } from './shared/SubTabNav'
import { getFileName } from '../utils/fileUtils'

const DEFAULT_WINDOW_SEC = 1.0

// ─────────────────────────────────────────────
// 배치 결과 항목 (파일 1개 결과 + 접기/펼치기)
// ─────────────────────────────────────────────
function BatchResultItem({ file }) {
  const [expanded, setExpanded] = useState(false)
  const fileName = getFileName(file.path)
  const res = file.result

  return (
    <div className="rcpvms-batch-result-item">
      <div
        className={`rcpvms-batch-result-header ${res ? 'clickable' : ''}`}
        onClick={() => res && setExpanded(v => !v)}
      >
        <span className="file-status-icon">
          {file.status === 'pending'   && '⏸'}
          {file.status === 'running'   && '⏳'}
          {file.status === 'completed' && '✓'}
          {file.status === 'failed'    && '✗'}
        </span>
        <span className="rcpvms-batch-result-name" title={file.path}>{fileName}</span>
        {/* completed → res 존재, failed → error 존재, 둘은 상호 배타적 */}
        {file.status === 'completed' && res && (
          <span className="dmd-result-meta" style={{ marginLeft: 'auto', marginRight: '8px' }}>
            {res.n_windows}w · ±{res.axis_lim?.toFixed(1)}mil
          </span>
        )}
        {file.status === 'failed' && (
          <span style={{ color: 'var(--status-anomaly)', fontSize: '0.75rem', marginLeft: 'auto' }}>
            {file.error}
          </span>
        )}
        {res && (
          <span className="rcpvms-expand-toggle">{expanded ? '▲' : '▼'}</span>
        )}
      </div>
      {expanded && res && (
        <div className="rcpvms-batch-orbit-wrap">
          <OrbitGrid data={res} />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// 탭 1: 단일 파일 모드
// ─────────────────────────────────────────────
function SingleFileTab() {
  const [binPath, setBinPath]     = useState(null)
  const [fileInfo, setFileInfo]   = useState(null)
  const [result, setResult]       = useState(null)
  const [loading, setLoading]     = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError]         = useState(null)
  const [windowSec, setWindowSec] = useState(DEFAULT_WINDOW_SEC)

  const handleSelectFile = async () => {
    const filePath = await window.api.selectBinFile()
    if (!filePath) return
    setBinPath(filePath)
    setFileInfo(null)
    setResult(null)
    setError(null)
    setLoading(true)
    try {
      const info = await window.api.runRcpvmsInfo(filePath)
      if (!info.success) throw new Error(info.error)
      setFileInfo(info.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!binPath || !fileInfo?.has_orbit) return
    setResult(null)
    setError(null)
    setAnalyzing(true)
    try {
      const res = await window.api.runRcpvmsOrbit(binPath, windowSec)
      if (!res.success) throw new Error(res.error)
      setResult(res.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const fileName = binPath ? getFileName(binPath) : null
  const canAnalyze = fileInfo?.has_orbit && !loading && !analyzing

  return (
    <div>
      <div className="input-group">
        <div className="file-picker-wrapper">
          <button onClick={handleSelectFile} className="btn-file-select" disabled={loading || analyzing}>
            BIN 파일 선택
          </button>
          <span className="file-path-text">
            {fileName || 'RCPVMS .BIN 파일을 선택해주세요.'}
          </span>
        </div>
      </div>

      {loading && (
        <div className="dmd-loading-hint">
          <span className="dmd-inline-spinner" />파일 정보 읽는 중...
        </div>
      )}

      {fileInfo && !loading && <RcpvmsFileInfoPanel fileInfo={fileInfo} />}

      {fileInfo && !loading && (
        <div className="dmd-param-row">
          <label className="dmd-param-label" htmlFor="rcpvms-window-sec">윈도우</label>
          <input
            id="rcpvms-window-sec"
            type="number"
            className="dmd-param-input"
            value={windowSec}
            min={0.5} max={10} step={0.5}
            onChange={(e) => setWindowSec(parseFloat(e.target.value) || DEFAULT_WINDOW_SEC)}
            disabled={analyzing}
          />
          <span className="dmd-param-hint">초 단위 슬라이딩 윈도우</span>
        </div>
      )}

      {fileInfo && !loading && (
        <button
          onClick={handleAnalyze}
          disabled={!canAnalyze}
          className="btn-run-inference"
          style={{ marginTop: '0.75rem' }}
        >
          {analyzing
            ? <><span className="btn-spinner" />궤도 생성 중</>
            : '궤도 이미지 생성'
          }
        </button>
      )}

      {error && <div className="error-message" style={{ marginTop: '0.75rem' }}>⚠️ {error}</div>}

      {result && (
        <div className="result-container">
          <div className="dmd-result-header">
            <span className="dmd-result-meta">
              {result.n_windows}개 윈도우 · {result.window_sec}초 단위
              · ±{result.axis_lim?.toFixed(2)} mil
              {result.event_date && ` · ${result.event_date}`}
            </span>
          </div>
          <OrbitGrid data={result} />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// 탭 2: 배치 분석 모드
// ─────────────────────────────────────────────
function BatchTab() {
  const [files, setFiles]               = useState([])   // [{path, status, result, error}]
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ total: 0, completed: 0, failed: 0, running: [] })
  const [windowSec, setWindowSec]       = useState(1.0)
  const [concurrency, setConcurrency]   = useState(2)

  // 진행 이벤트 수신
  // BatchTab은 display:none 방식으로 항상 마운트 유지되므로 리스너가 앱 전체 생명주기 동안 등록됨.
  // 향후 BatchTab을 조건부 마운트로 변경하려면 반드시 C-2 패턴(state 끌어올리기)으로 대체할 것.
  useEffect(() => {
    window.api.onRcpvmsOrbitBatchProgress((p) => {
      setBatchProgress({
        total: p.total,
        completed: p.completed,
        failed: p.failed ?? 0,
        running: p.running ?? [],
        runningCount: p.runningCount,
      })

      if (p.current) {
        if (p.currentResult !== undefined) {
          setFiles(prev => prev.map(f =>
            f.path === p.current
              ? { ...f, status: 'completed', result: p.currentResult, error: null }
              : f
          ))
        } else if (p.currentError !== undefined) {
          setFiles(prev => prev.map(f =>
            f.path === p.current
              ? { ...f, status: 'failed', result: null, error: p.currentError }
              : f
          ))
        } else {
          setFiles(prev => prev.map(f =>
            f.path === p.current && f.status === 'pending'
              ? { ...f, status: 'running' }
              : f
          ))
        }
      }
    })
    return () => window.api.offRcpvmsOrbitBatchProgress()
  }, [])

  const handleSelectFiles = async () => {
    const paths = await window.api.selectBinFiles()
    if (!paths || paths.length === 0) return
    addPaths(paths)
  }

  const handleSelectFolder = async () => {
    const paths = await window.api.selectBinFolder()
    if (!paths || paths.length === 0) return
    addPaths(paths)
  }

  const addPaths = (paths) => {
    setFiles(prev => {
      const existingPaths = new Set(prev.map(f => f.path))
      const newEntries = paths
        .filter(p => !existingPaths.has(p))
        .map(p => ({ path: p, status: 'pending', result: null, error: null }))
      return [...prev, ...newEntries]
    })
  }

  const handleRemove = (path) => {
    setFiles(prev => prev.filter(f => f.path !== path))
  }

  const handleConcurrencyChange = async (e) => {
    const val = parseInt(e.target.value)
    setConcurrency(val)
    await window.api.setConcurrencyLevel(val)
  }

  const handleRunBatch = async () => {
    const pendingPaths = files.filter(f => f.status === 'pending' || f.status === 'failed').map(f => f.path)
    if (pendingPaths.length === 0) return

    setFiles(prev => prev.map(f =>
      (f.status === 'pending' || f.status === 'failed') ? { ...f, status: 'pending', result: null, error: null } : f
    ))
    setBatchProgress({ total: pendingPaths.length, completed: 0, failed: 0, running: [] })
    setBatchLoading(true)

    try {
      await window.api.runRcpvmsOrbitBatch(pendingPaths, windowSec)
    } finally {
      setBatchLoading(false)
    }
  }

  const handleCancel = async () => {
    await window.api.cancelRcpvmsOrbitBatch()
  }

  const handleClearAll = () => {
    setFiles([])
    setBatchProgress({ total: 0, completed: 0, failed: 0, running: [] })
  }

  const pendingCount = files.filter(f => f.status === 'pending' || f.status === 'failed').length
  const completedFiles = files.filter(f => f.status === 'completed' || f.status === 'failed')

  return (
    <div>
      {/* 파일 선택 버튼들 */}
      <div className="input-group">
        <div className="file-picker-wrapper" style={{ gap: '6px' }}>
          <button onClick={handleSelectFiles} className="btn-file-select" disabled={batchLoading}>
            파일 선택
          </button>
          <button onClick={handleSelectFolder} className="btn-file-select" disabled={batchLoading}
            style={{ background: 'var(--accent-subtle)', borderColor: 'rgba(88,166,255,0.3)' }}>
            폴더 선택
          </button>
          {files.length > 0 && !batchLoading && (
            <button onClick={handleClearAll} className="btn-file-select"
              style={{ color: 'var(--text-muted)', background: 'transparent' }}>
              전체 제거
            </button>
          )}
          <span className="file-path-text">
            {files.length > 0 ? `${files.length}개 파일 선택됨` : '.BIN 파일 또는 폴더를 선택하세요.'}
          </span>
        </div>
      </div>

      {/* 설정 행 */}
      {files.length > 0 && (
        <div className="dmd-param-row">
          <label className="dmd-param-label" htmlFor="rcpvms-batch-window">윈도우</label>
          <input
            id="rcpvms-batch-window"
            type="number"
            className="dmd-param-input"
            value={windowSec}
            min={0.5} max={10} step={0.5}
            onChange={(e) => setWindowSec(parseFloat(e.target.value) || DEFAULT_WINDOW_SEC)}
            disabled={batchLoading}
          />
          <span className="dmd-param-hint">초</span>
          <div style={{ marginLeft: '12px' }}>
            <ConcurrencySelector
              id="rcpvms-batch-concurrency"
              value={concurrency}
              onChange={handleConcurrencyChange}
              disabled={batchLoading}
            />
          </div>
        </div>
      )}

      {/* 실행/취소 버튼 */}
      {files.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '0.75rem' }}>
          <button
            onClick={handleRunBatch}
            disabled={batchLoading || pendingCount === 0}
            className="btn-run-inference"
          >
            {batchLoading
              ? <><span className="btn-spinner" />분석 중...</>
              : `궤도 생성 (${pendingCount}개)`
            }
          </button>
          {batchLoading && (
            <button onClick={handleCancel} className="btn-file-select"
              style={{ color: 'var(--status-anomaly)', borderColor: 'var(--status-anomaly-border)' }}>
              취소
            </button>
          )}
        </div>
      )}

      {/* 진행 상황 */}
      {batchLoading && (
        <div style={{ marginTop: '0.75rem' }}>
          <BatchProgressBar batchProgress={batchProgress} batchLoading={batchLoading} />
        </div>
      )}

      {/* 파일 목록 (대기/실행 중인 파일) */}
      {files.some(f => f.status === 'pending' || f.status === 'running') && (
        <BatchFileList
          files={files.filter(f => f.status === 'pending' || f.status === 'running')}
          onRemove={handleRemove}
          disabled={batchLoading}
          getLabel={() => null}
        />
      )}

      {/* 완료된 파일 결과 목록 */}
      {completedFiles.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.04em' }}>
            완료된 파일 ({completedFiles.length}개)
          </div>
          <div className="rcpvms-batch-results">
            {completedFiles.map(file => (
              <BatchResultItem key={file.path} file={file} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const SUBTABS = [
  { key: 'single', label: '단일 파일' },
  { key: 'batch',  label: '배치 분석' },
]

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
export function RcpvmsOrbitViewer() {
  const [subTab, setSubTab] = useState('single')

  return (
    <div className="model-inference">
      <div className="control-panel">
        <div className="header-row">
          <h2 className="section-title">RCPVMS 궤도 뷰어</h2>
          <div className="dmd-model-badge">BIN 궤도 이미지 · 단일 / 배치</div>
        </div>

        <SubTabNav tabs={SUBTABS} current={subTab} onChange={setSubTab} />

        {subTab === 'single' && <SingleFileTab />}
        {/* C-2: 배치 탭은 항상 마운트 유지 (언마운트 시 이벤트 유실 방지) */}
        <div style={{ display: subTab === 'batch' ? 'block' : 'none' }}>
          <BatchTab />
        </div>
      </div>
    </div>
  )
}
