import React, { useState, useEffect} from 'react'
import './ModelInference.css'
import './DmdOrbitViewer.css'
import { BatchFileList } from './shared/BatchFileList'
import { BatchProgressBar } from './shared/BatchProgressBar'
import { ConcurrencySelector } from './shared/ConcurrencySelector'
import { OrbitGrid, InfoRow, RcpvmsFileInfoPanel } from './shared/OrbitGrid'
import { SubTabNav } from './shared/SubTabNav'
import { ScaleModeToggle } from './shared/ScaleModeToggle'
import { FileOperationFlow } from './shared/FileOperationFlow'
import { StatusCell } from './shared/StatusCell'
import { getFileName } from '../utils/fileUtils'
import { useConcurrencySelector } from '../hooks/useConcurrencySelector'

const DEFAULT_WINDOW_SEC = 1.0

/**
 * 'user' 모드일 때 timeline_user[pos]를 우선 사용하되, null인 위치는 timeline_auto로 대체.
 * timeline_user[pos]가 null 엔트리(비어있는 창)를 포함할 수 있어 window 단위로 병합한다.
 */
function resolveOrbitData(result, scaleMode) {
  if (!result) return null
  if (scaleMode === 'user') {
    const tusr = result.timeline_user
    const tauto = result.timeline_auto
    if (!tusr) return { ...result, timeline: tauto }
    // 위치 별로: user timeline이 있으면 사용, 없으면 auto로 대체
    // 창 단위 병합: user[pos][wi]가 null이면 auto[pos][wi] 사용
    const merged = {}
    for (const pos of (result.positions ?? Object.keys(tauto ?? {}))) {
      const uImgs = tusr[pos]
      const aImgs = tauto?.[pos] ?? []
      if (!uImgs) {
        merged[pos] = aImgs
      } else {
        merged[pos] = uImgs.map((img, wi) => img ?? aImgs[wi] ?? null)
      }
    }
    return { ...result, timeline: merged }
  }
  return { ...result, timeline: result[`timeline_${scaleMode}`] ?? result.timeline_auto }
}

function WindowSecInput({ id, value, onChange, disabled }) {
  return (
    <>
      <label className="dmd-param-label" htmlFor={id}>윈도우</label>
      <input
        id={id}
        type="number"
        className="dmd-param-input"
        value={value}
        min={0.5} max={10} step={0.5}
        onChange={(e) => onChange(parseFloat(e.target.value) || DEFAULT_WINDOW_SEC)}
        disabled={disabled}
      />
      <span className="dmd-param-hint">초 단위 슬라이딩 윈도우</span>
    </>
  )
}

/**
 * 궤도 별 사용자 스케일 입력.
 * orbits: 표시할 궤도 위치 이름 배열 (예: ['RCPA1', 'RCPB1'])
 * values: { [pos]: string } 형태의 입력값 맵
 * onChange: (pos, value) => void
 */
function UserAxisLimInputs({ orbits, values, onChange, disabled }) {
  if (!orbits || orbits.length === 0) return null
  return (
    <div className="user-axis-lim-group">
      <span className="dmd-param-label" style={{ alignSelf: 'flex-start', paddingTop: '2px' }}>스케일</span>
      <div className="user-axis-lim-fields">
        {orbits.map((pos) => (
          <div key={pos} className="user-axis-lim-row">
            <span className="user-axis-lim-pos">{pos}</span>
            <input
              type="number"
              className="dmd-param-input"
              style={{ width: '80px' }}
              value={values[pos] ?? ''}
              min={0.1} step={0.5}
              placeholder="mil"
              onChange={(e) => onChange(pos, e.target.value)}
              disabled={disabled}
            />
          </div>
        ))}
        <span className="dmd-param-hint" style={{ alignSelf: 'center' }}>±N mil (비워두면 auto)</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 배치 결과 항목 (파일 1개 결과 + 접기/펼치기)
// ─────────────────────────────────────────────
function BatchResultItem({ file, scaleMode, windowSec }) {
  const [expanded, setExpanded] = useState(true)
  const fileName = getFileName(file.path)
  const res = file.result
  const orbitData = resolveOrbitData(res, scaleMode)

  return (
    <div className="rcpvms-batch-result-item">
      <div
        className={`rcpvms-batch-result-header ${res ? 'clickable' : ''}`}
        onClick={() => res && setExpanded(v => !v)}
      >
        <StatusCell status={file.status} />
        <span className="rcpvms-batch-result-name" title={file.path}>{fileName}</span>
        {/* completed → res 존재, failed → error 존재, 둘은 상호 배타적 */}
        {file.status === 'completed' && res && (
          <span className="dmd-result-meta" style={{ marginLeft: 'auto', marginRight: '8px' }}>
            {res.n_windows}w
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
          <OrbitGrid data={orbitData} binPath={file.path} windowSec={windowSec} />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// 탭 1: 단일 파일 모드
// ─────────────────────────────────────────────
function SingleFileTab() {
  const [binPath, setBinPath]               = useState(null)
  const [fileInfo, setFileInfo]             = useState(null)
  const [result, setResult]                 = useState(null)
  const [loading, setLoading]               = useState(false)
  const [analyzing, setAnalyzing]           = useState(false)
  const [error, setError]                   = useState(null)
  const [windowSec, setWindowSec]           = useState(DEFAULT_WINDOW_SEC)
  const [userAxisLimMap, setUserAxisLimMap] = useState({})  // { pos: string }
  const [scaleMode, setScaleMode]           = useState('auto')

  const handleSelectFile = async () => {
    const filePath = await window.api.selectBinFile()
    if (!filePath) return
    setBinPath(filePath)
    setFileInfo(null)
    setResult(null)
    setError(null)
    setScaleMode('auto')
    setUserAxisLimMap({})
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

  const handleUserAxisLimChange = (pos, val) => {
    setUserAxisLimMap(prev => ({ ...prev, [pos]: val }))
  }

  const handleRunOrbit = async () => {
    if (!binPath || analyzing) return
    setResult(null)
    setError(null)
    setAnalyzing(true)
    try {
      // 유효한 양수 값만 맵에 포함
      const ualMap = {}
      for (const [pos, val] of Object.entries(userAxisLimMap)) {
        const n = parseFloat(val)
        if (n > 0) ualMap[pos] = n
      }
      const res = await window.api.runRcpvmsOrbit(
        binPath, windowSec,
        Object.keys(ualMap).length > 0 ? ualMap : undefined
      )
      if (!res.success) throw new Error(res.error)
      setResult(res.data)
      // user scale이 생성된 경우 자동으로 user 모드로 전환
      if (res.data?.timeline_user) setScaleMode('user')
    } catch (err) {
      setError(err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const orbitPositions = fileInfo?.orbit_map ? Object.keys(fileInfo.orbit_map) : []

  return (
    <FileOperationFlow
      filePickerLabel="BIN 파일 선택"
      filePlaceholderText="RCPVMS .BIN 파일을 선택해주세요."
      filePath={binPath}
      onSelectFile={handleSelectFile}
      pickerDisabled={loading || analyzing}
      loading={loading}
      fileInfo={fileInfo}
      renderFileInfo={(info) => <RcpvmsFileInfoPanel fileInfo={info} />}
      renderParams={() => (
        <div className="dmd-param-row" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <WindowSecInput
            id="rcpvms-window-sec"
            value={windowSec}
            onChange={setWindowSec}
            disabled={analyzing}
          />
          <UserAxisLimInputs
            orbits={orbitPositions}
            values={userAxisLimMap}
            onChange={handleUserAxisLimChange}
            disabled={analyzing}
          />
        </div>
      )}
      onRun={handleRunOrbit}
      canRun={fileInfo?.has_orbit && !loading && !analyzing}
      analyzing={analyzing}
      actionLabel="궤도 이미지 생성"
      analyzingLabel="궤도 생성 중"
      error={error}
      result={result}
      renderResult={(res) => {
        const orbitData = resolveOrbitData(res, scaleMode)
        const ualMap = res.user_axis_lim_map
        const userScaleLabel = ualMap
          ? Object.entries(ualMap)
              .filter(([, v]) => v != null)
              .map(([pos, v]) => `${pos}:±${Number(v).toFixed(1)}`)
              .join(' ')
          : null
        return (
          <div className="result-container">
            <div className="dmd-result-header">
              <span className="dmd-result-meta">
                {res.n_windows}개 윈도우 · {res.window_sec}초 단위
                {scaleMode === 'user' && userScaleLabel
                  ? ` · User [${userScaleLabel}] mil`
                  : scaleMode === 'fixed'
                  ? ` · Fixed ±${res.fixed_axis_lim?.toFixed(1)} mil`
                  : ' · Auto Scale'}
                {res.event_date && ` · ${res.event_date}`}
              </span>
              <ScaleModeToggle
                scaleMode={scaleMode}
                onChange={setScaleMode}
                hasUser={!!res.timeline_user}
              />
            </div>
            <OrbitGrid data={orbitData} binPath={binPath} windowSec={windowSec} />
          </div>
        )
      }}
    />
  )
}

// ─────────────────────────────────────────────
// 탭 2: 배치 분석 모드
// ─────────────────────────────────────────────
function BatchTab() {
  const [files, setFiles]               = useState([])   // [{path, status, result, error}]
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ total: 0, completed: 0, failed: 0, running: [] })
  const [windowSec, setWindowSec]       = useState(DEFAULT_WINDOW_SEC)
  const [userAxisLimMap, setUserAxisLimMap] = useState({})  // { pos: string }
  const { level: concurrency, handleChange: handleConcurrencyChange } = useConcurrencySelector(2)
  const [scaleMode, setScaleMode]       = useState('auto')

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
  }, []) // 의도적 빈 dep: BatchTab은 앱 생명주기 동안 마운트 유지, 리스너는 1회만 등록

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

  const handleRunBatch = async () => {
    if (batchLoading) return  // 재진입 방지
    const pendingPaths = files.filter(f => f.status === 'pending' || f.status === 'failed').map(f => f.path)
    if (pendingPaths.length === 0) return

    setFiles(prev => prev.map(f =>
      (f.status === 'pending' || f.status === 'failed') ? { ...f, status: 'pending', result: null, error: null } : f
    ))
    setBatchProgress({ total: pendingPaths.length, completed: 0, failed: 0, running: [] })
    setBatchLoading(true)

    try {
      const ualMap = {}
      for (const [pos, val] of Object.entries(userAxisLimMap)) {
        const n = parseFloat(val)
        if (n > 0) ualMap[pos] = n
      }
      await window.api.runRcpvmsOrbitBatch(
        pendingPaths, windowSec,
        Object.keys(ualMap).length > 0 ? ualMap : undefined
      )
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
  const finishedFiles = files.filter(f => f.status === 'completed' || f.status === 'failed')
  const hasCompletedFile = files.some(f => f.status === 'completed')
  const hasUserTimeline = files.some(f => f.result?.timeline_user != null)

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
        <div className="dmd-param-row" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <WindowSecInput
            id="rcpvms-batch-window"
            value={windowSec}
            onChange={setWindowSec}
            disabled={batchLoading}
          />
          <UserAxisLimInputs
            orbits={['RCPA1', 'RCPA2', 'RCPB1', 'RCPB2']}
            values={userAxisLimMap}
            onChange={(pos, val) => setUserAxisLimMap(prev => ({ ...prev, [pos]: val }))}
            disabled={batchLoading}
          />
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

      {/* 처리 완료/실패 파일 결과 목록 */}
      {finishedFiles.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              처리 결과 ({finishedFiles.length}개)
            </span>
            {hasCompletedFile && (
              <ScaleModeToggle
                scaleMode={scaleMode}
                onChange={setScaleMode}
                hasUser={hasUserTimeline}
              />
            )}
          </div>
          <div className="rcpvms-batch-results">
            {finishedFiles.map(file => (
              <BatchResultItem key={file.path} file={file} scaleMode={scaleMode} windowSec={windowSec} />
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
