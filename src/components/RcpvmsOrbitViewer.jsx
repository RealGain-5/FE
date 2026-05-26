import React, { useState, useEffect} from 'react'
import './ModelInference.css'
import './DmdOrbitViewer.css'
import { BatchFileList } from './shared/BatchFileList'
import { BatchProgressBar } from './shared/BatchProgressBar'
import { ConcurrencySelector } from './shared/ConcurrencySelector'
import { OrbitGrid, RcpvmsFileInfoPanel } from './shared/OrbitGrid'
import { SubTabNav } from './shared/SubTabNav'
import { ScaleModeToggle } from './shared/ScaleModeToggle'
import { DEFAULT_WINDOW_SEC, FilterModeToggle, UserAxisLimInputs, WindowSecInput } from './shared/OrbitControls'
import { FileOperationFlow } from './shared/FileOperationFlow'
import { StatusCell } from './shared/StatusCell'
import { getFileName } from '../utils/fileUtils'
import { useConcurrencySelector } from '../hooks/useConcurrencySelector'


/**
 * 'user' 紐⑤뱶????timeline_user[pos]瑜??곗꽑 ?ъ슜?섎릺, null???꾩튂??timeline_auto濡??泥?
 * timeline_user[pos]媛 null ?뷀듃由?鍮꾩뼱?덈뒗 李?瑜??ы븿?????덉뼱 window ?⑥쐞濡?蹂묓빀?쒕떎.
 */
function resolveOrbitData(result, scaleMode) {
  if (!result) return null
  if (scaleMode === 'user') {
    const tusr = result.timeline_user
    const tauto = result.timeline_auto
    if (!tusr) return { ...result, timeline: tauto }
    // ?꾩튂 蹂꾨줈: user timeline???덉쑝硫??ъ슜, ?놁쑝硫?auto濡??泥?    // 李??⑥쐞 蹂묓빀: user[pos][wi]媛 null?대㈃ auto[pos][wi] ?ъ슜
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


// ?????????????????????????????????????????????
// 諛곗튂 寃곌낵 ??ぉ (?뚯씪 1媛?寃곌낵 + ?묎린/?쇱튂湲?
// ?????????????????????????????????????????????
function BatchResultItem({ file, scaleMode, filterMode, windowSec }) {
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
        {/* completed ??res 議댁옱, failed ??error 議댁옱, ?섏? ?곹샇 諛고???*/}
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
          <span className="rcpvms-expand-toggle">{expanded ? '-' : '+'}</span>
        )}
      </div>
      {expanded && res && (
        <div className="rcpvms-batch-orbit-wrap">
          <OrbitGrid data={orbitData} binPath={file.path} windowSec={windowSec} scaleMode={scaleMode} filterMode={filterMode} />
        </div>
      )}
    </div>
  )
}

// ?????????????????????????????????????????????
// ??1: ?⑥씪 ?뚯씪 紐⑤뱶
// ?????????????????????????????????????????????
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
  const [filterMode, setFilterMode]         = useState('1x')

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
      // ?좏슚???묒닔 媛믩쭔 留듭뿉 ?ы븿
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
      // user scale???앹꽦??寃쎌슦 ?먮룞?쇰줈 user 紐⑤뱶濡??꾪솚
      if (res.data?.user_axis_lim_map) setScaleMode('user')
    } catch (err) {
      setError(err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const orbitPositions = fileInfo?.orbit_map ? Object.keys(fileInfo.orbit_map) : []

  return (
    <FileOperationFlow
      filePickerLabel="BIN ?뚯씪 ?좏깮"
      filePlaceholderText="RCPVMS .BIN ?뚯씪???좏깮?댁＜?몄슂."
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
      actionLabel="Generate orbit images"
      analyzingLabel="Generating orbit images"
      error={error}
      result={result}
      renderResult={(res) => {
        const orbitData = resolveOrbitData(res, scaleMode)
        const ualMap = res.user_axis_lim_map
        const userScaleLabel = ualMap
          ? Object.entries(ualMap)
              .filter(([, v]) => v != null)
              .map(([pos, v]) => `${pos}:짹${Number(v).toFixed(1)}`)
              .join(' ')
          : null
        return (
          <div className="result-container">
            <div className="dmd-result-header">
              <span className="dmd-result-meta">
                {res.n_windows}媛??덈룄??쨌 {res.window_sec}珥??⑥쐞
                {scaleMode === 'user' && userScaleLabel
                  ? ` 쨌 User [${userScaleLabel}] mil`
                  : scaleMode === 'fixed'
                  ? ` 쨌 Fixed 짹${res.fixed_axis_lim?.toFixed(1)} mil`
                  : ' 쨌 Auto Scale'}
                {res.event_date && ` 쨌 ${res.event_date}`}
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <FilterModeToggle filterMode={filterMode} onChange={setFilterMode} />
                <ScaleModeToggle
                  scaleMode={scaleMode}
                  onChange={setScaleMode}
                  hasUser={!!res.user_axis_lim_map}
                />
              </div>
            </div>
            <OrbitGrid data={orbitData} binPath={binPath} windowSec={windowSec} scaleMode={scaleMode} filterMode={filterMode} />
          </div>
        )
      }}
    />
  )
}

// ?????????????????????????????????????????????
// ??2: 諛곗튂 遺꾩꽍 紐⑤뱶
// ?????????????????????????????????????????????
function BatchTab() {
  const [files, setFiles]               = useState([])   // [{path, status, result, error}]
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ total: 0, completed: 0, failed: 0, running: [] })
  const [windowSec, setWindowSec]       = useState(DEFAULT_WINDOW_SEC)
  const [userAxisLimMap, setUserAxisLimMap] = useState({})  // { pos: string }
  const { level: concurrency, handleChange: handleConcurrencyChange } = useConcurrencySelector(2)
  const [scaleMode, setScaleMode]       = useState('auto')
  const [filterMode, setFilterMode]     = useState('1x')
  const [error, setError]               = useState(null)

  // 吏꾪뻾 ?대깽???섏떊
  // BatchTab? display:none 諛⑹떇?쇰줈 ??긽 留덉슫???좎??섎?濡?由ъ뒪?덇? ???꾩껜 ?앸챸二쇨린 ?숈븞 ?깅줉??
  // ?ν썑 BatchTab??議곌굔遺 留덉슫?몃줈 蹂寃쏀븯?ㅻ㈃ 諛섎뱶??C-2 ?⑦꽩(state ?뚯뼱?щ━湲??쇰줈 ?泥댄븷 寃?
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
  }, []) // ?섎룄??鍮?dep: BatchTab? ???앸챸二쇨린 ?숈븞 留덉슫???좎?, 由ъ뒪?덈뒗 1?뚮쭔 ?깅줉

  const handleSelectFiles = async () => {
    try {
      const paths = await window.api.selectBinFiles()
      if (!paths || paths.length === 0) return
      setError(null)
      addPaths(paths)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSelectFolder = async () => {
    try {
      const paths = await window.api.selectBinFolder()
      if (!paths || paths.length === 0) return
      setError(null)
      addPaths(paths)
    } catch (err) {
      setError(err.message)
    }
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
    if (batchLoading) return  // ?ъ쭊??諛⑹?
    const pendingPaths = files.filter(f => f.status === 'pending' || f.status === 'failed').map(f => f.path)
    if (pendingPaths.length === 0) return

    setFiles(prev => prev.map(f =>
      (f.status === 'pending' || f.status === 'failed') ? { ...f, status: 'pending', result: null, error: null } : f
    ))
    setBatchProgress({ total: pendingPaths.length, completed: 0, failed: 0, running: [] })
    setBatchLoading(true)
    setError(null)

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
    } catch (err) {
      setError(err.message)
    } finally {
      setBatchLoading(false)
    }
  }

  const handleCancel = async () => {
    try {
      await window.api.cancelRcpvmsOrbitBatch()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleClearAll = () => {
    setFiles([])
    setBatchProgress({ total: 0, completed: 0, failed: 0, running: [] })
    setError(null)
  }

  const pendingCount = files.filter(f => f.status === 'pending' || f.status === 'failed').length
  const finishedFiles = files.filter(f => f.status === 'completed' || f.status === 'failed')
  const hasCompletedFile = files.some(f => f.status === 'completed')
  const hasUserTimeline = files.some(f => f.result?.user_axis_lim_map != null)

  return (
    <div>
      {error && (
        <div className="error-message" style={{ marginBottom: '0.75rem' }}>
          {error}
        </div>
      )}
      {/* ?뚯씪 ?좏깮 踰꾪듉??*/}
      <div className="input-group">
        <div className="file-picker-wrapper" style={{ gap: '6px' }}>
          <button onClick={handleSelectFiles} className="btn-file-select" disabled={batchLoading}>
            ?뚯씪 ?좏깮
          </button>
          <button onClick={handleSelectFolder} className="btn-file-select" disabled={batchLoading}
            style={{ background: 'var(--accent-subtle)', borderColor: 'rgba(88,166,255,0.3)' }}>
            ?대뜑 ?좏깮
          </button>
          {files.length > 0 && !batchLoading && (
            <button onClick={handleClearAll} className="btn-file-select"
              style={{ color: 'var(--text-muted)', background: 'transparent' }}>
              ?꾩껜 ?쒓굅
            </button>
          )}
          <span className="file-path-text">
            {files.length > 0 ? `${files.length} file(s) selected` : 'Select .BIN files or a folder.'}
          </span>
        </div>
      </div>

      {/* ?ㅼ젙 ??*/}
      {files.length > 0 && (
        <div className="dmd-param-row" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <WindowSecInput
            id="rcpvms-batch-window"
            value={windowSec}
            onChange={setWindowSec}
            disabled={batchLoading}
          />
          <UserAxisLimInputs
            orbits={['RCP1A', 'RCP1B', 'RCP2A', 'RCP2B']}
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

      {/* ?ㅽ뻾/痍⑥냼 踰꾪듉 */}
      {files.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '0.75rem' }}>
          <button
            onClick={handleRunBatch}
            disabled={batchLoading || pendingCount === 0}
            className="btn-run-inference"
          >
            {batchLoading ? (
              <><span className="btn-spinner" />Running...</>
            ) : (
              'Generate orbits (' + pendingCount + ')'
            )}
          </button>
          {batchLoading && (
            <button onClick={handleCancel} className="btn-file-select"
              style={{ color: 'var(--status-anomaly)', borderColor: 'var(--status-anomaly-border)' }}>
              痍⑥냼
            </button>
          )}
        </div>
      )}

      {batchLoading && (
        <div style={{ marginTop: '0.75rem' }}>
          <BatchProgressBar batchProgress={batchProgress} batchLoading={batchLoading} />
        </div>
      )}

      {/* ?뚯씪 紐⑸줉 (?湲??ㅽ뻾 以묒씤 ?뚯씪) */}
      {files.some(f => f.status === 'pending' || f.status === 'running') && (
        <BatchFileList
          files={files.filter(f => f.status === 'pending' || f.status === 'running')}
          onRemove={handleRemove}
          disabled={batchLoading}
          getLabel={() => null}
        />
      )}

      {/* 泥섎━ ?꾨즺/?ㅽ뙣 ?뚯씪 寃곌낵 紐⑸줉 */}
      {finishedFiles.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              泥섎━ 寃곌낵 ({finishedFiles.length}媛?
            </span>
            {hasCompletedFile && (
              <>
                <FilterModeToggle filterMode={filterMode} onChange={setFilterMode} />
                <ScaleModeToggle
                  scaleMode={scaleMode}
                  onChange={setScaleMode}
                  hasUser={hasUserTimeline}
                />
              </>
            )}
          </div>
          <div className="rcpvms-batch-results">
            {finishedFiles.map(file => (
              <BatchResultItem key={file.path} file={file} scaleMode={scaleMode} filterMode={filterMode} windowSec={windowSec} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const SUBTABS = [
  { key: 'single', label: '?⑥씪 ?뚯씪' },
  { key: 'batch',  label: '諛곗튂 遺꾩꽍' },
]

// ?????????????????????????????????????????????
// 硫붿씤 而댄룷?뚰듃
// ?????????????????????????????????????????????
export function RcpvmsOrbitViewer() {
  const [subTab, setSubTab] = useState('single')

  return (
    <div className="model-inference">
      <div className="control-panel">
        <div className="header-row">
          <h2 className="section-title">RCPVMS 沅ㅻ룄 酉곗뼱</h2>
          <div className="dmd-model-badge">BIN 沅ㅻ룄 ?대?吏 쨌 ?⑥씪 / 諛곗튂</div>
        </div>

        <SubTabNav tabs={SUBTABS} current={subTab} onChange={setSubTab} />

        {subTab === 'single' && <SingleFileTab />}
        {/* C-2: 諛곗튂 ??? ??긽 留덉슫???좎? (?몃쭏?댄듃 ???대깽???좎떎 諛⑹?) */}
        <div style={{ display: subTab === 'batch' ? 'block' : 'none' }}>
          <BatchTab />
        </div>
      </div>
    </div>
  )
}
