import React, { useState } from 'react'
import './ModelInference.css'
import './DmdOrbitViewer.css'
import { InfoRow } from './shared/OrbitGrid'
import { FileOperationFlow } from './shared/FileOperationFlow'

// ─────────────────────────────────────────────
// 탭 1: DMD → RCPVMS 변환
// ─────────────────────────────────────────────
function DmdConvertTab() {
  const [dmdPath, setDmdPath]       = useState(null)
  const [fileInfo, setFileInfo]     = useState(null)
  const [outputDir, setOutputDir]   = useState(null)
  const [loading, setLoading]       = useState(false)
  const [converting, setConverting] = useState(false)
  const [convertResult, setConvertResult] = useState(null)
  const [error, setError]           = useState(null)
  const [milPerVolt, setMilPerVolt] = useState(10.0)

  const handleSelectFile = async () => {
    const filePath = await window.api.selectDmdFile()
    if (!filePath) return
    setDmdPath(filePath)
    setFileInfo(null)
    setConvertResult(null)
    setError(null)
    setLoading(true)
    try {
      const res = await window.api.runDmdInfo(filePath)
      if (!res.success) throw new Error(res.error)
      setFileInfo(res.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectOutputDir = async () => {
    const dir = await window.api.selectOutputDir()
    if (dir) setOutputDir(dir)
  }

  const handleConvert = async () => {
    if (!dmdPath || !outputDir) return
    setConverting(true)
    setConvertResult(null)
    setError(null)
    try {
      const res = await window.api.runDmdConvertToRcpvms(dmdPath, outputDir, {
        windowSec: 10,
        milsPerV: milPerVolt,
      })
      if (!res.success) throw new Error(res.error)
      setConvertResult(res.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setConverting(false)
    }
  }

  return (
    <FileOperationFlow
      filePickerLabel="DMD 파일 선택"
      filePlaceholderText="변환할 .dmd 파일을 선택해주세요."
      filePath={dmdPath}
      onSelectFile={handleSelectFile}
      pickerDisabled={loading || converting}
      loading={loading}
      fileInfo={fileInfo}
      renderFileInfo={(info) => (
        <div className="dmd-info-panel">
          <InfoRow label="채널 수">{info.n_channels}</InfoRow>
          <InfoRow label="궤도 RCP">
            {Object.keys(info.orbit_map).length > 0
              ? Object.keys(info.orbit_map).map((rcp) => (
                  <span key={rcp} className="dmd-rcp-chip">{rcp}</span>
                ))
              : <span style={{ color: 'var(--status-anomaly)', fontSize: '0.82rem' }}>궤도 채널 없음</span>
            }
          </InfoRow>
        </div>
      )}
      renderParams={() => (
        <>
          <div className="dmd-param-row">
            <label className="dmd-param-label" htmlFor="conv-mil-per-volt">mils/V</label>
            <input
              id="conv-mil-per-volt"
              type="number"
              className="dmd-param-input"
              value={milPerVolt}
              min={1} max={1000} step={10}
              onChange={(e) => setMilPerVolt(parseFloat(e.target.value) || 10)}
              disabled={converting}
            />
            <span className="dmd-param-hint">변위 감도 계수</span>
          </div>
          <div className="dmd-param-row">
            <label className="dmd-param-label">출력 경로</label>
            <button
              onClick={handleSelectOutputDir}
              className="btn-file-select"
              disabled={converting}
              style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
            >
              폴더 선택
            </button>
            <span className="dmd-param-hint" style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {outputDir || '출력 디렉토리를 선택하세요.'}
            </span>
          </div>
        </>
      )}
      onRun={handleConvert}
      canRun={!!outputDir && !converting}
      analyzing={converting}
      actionLabel="RCPVMS BIN 변환 시작"
      analyzingLabel="변환 중..."
      error={error}
      result={convertResult}
      renderResult={(res) => (
        <div className="dmd-info-panel" style={{ marginTop: '0.75rem' }}>
          <InfoRow label="변환 완료">{res.n_windows}개 파일</InfoRow>
          <InfoRow label="채널 수">{res.total_ch}</InfoRow>
          <InfoRow label="샘플레이트">{(res.sampling_rate / 1000).toFixed(0)} kHz</InfoRow>
          <InfoRow label="윈도우당">{(res.samples_per_window).toLocaleString()} samples</InfoRow>
          <InfoRow label="출력 경로">
            <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{res.output_dir}</span>
          </InfoRow>
        </div>
      )}
    />
  )
}

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
export function DmdOrbitViewer() {
  return (
    <div className="model-inference">
      <div className="control-panel">
        <div className="header-row">
          <h2 className="section-title">DMD 분석</h2>
          <div className="dmd-model-badge">DMD→RCPVMS 변환</div>
        </div>

        {/* BinOrbitTab 제거 — BIN 궤도 뷰어는 RcpvmsOrbitViewer로 이관 */}
        <DmdConvertTab />
      </div>
    </div>
  )
}
