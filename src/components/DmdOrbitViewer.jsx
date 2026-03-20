import React, { useState } from 'react'
import './ModelInference.css'
import './DmdOrbitViewer.css'
import { InfoRow } from './shared/OrbitGrid'
import { getFileName } from '../utils/fileUtils'

// ─────────────────────────────────────────────
// 탭 1: DMD → RCPVMS 변환
// ─────────────────────────────────────────────
function DmdConvertTab() {
  const [dmdPath, setDmdPath]     = useState(null)
  const [fileInfo, setFileInfo]   = useState(null)
  const [outputDir, setOutputDir] = useState(null)
  const [loading, setLoading]     = useState(false)
  const [converting, setConverting] = useState(false)
  const [convertResult, setConvertResult] = useState(null)
  const [error, setError]         = useState(null)
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

  const fileName = dmdPath ? getFileName(dmdPath) : null

  return (
    <div>
      {/* 파일 선택 */}
      <div className="input-group">
        <div className="file-picker-wrapper">
          <button onClick={handleSelectFile} className="btn-file-select" disabled={loading || converting}>
            DMD 파일 선택
          </button>
          <span className="file-path-text">
            {fileName || '변환할 .dmd 파일을 선택해주세요.'}
          </span>
        </div>
      </div>

      {loading && (
        <div className="dmd-loading-hint">
          <span className="dmd-inline-spinner" />파일 정보 읽는 중...
        </div>
      )}

      {/* DMD 파일 정보 */}
      {fileInfo && !loading && (
        <div className="dmd-info-panel">
          <InfoRow label="채널 수">{fileInfo.n_channels}</InfoRow>
          <InfoRow label="궤도 RCP">
            {Object.keys(fileInfo.orbit_map).length > 0
              ? Object.keys(fileInfo.orbit_map).map((rcp) => (
                  <span key={rcp} className="dmd-rcp-chip">{rcp}</span>
                ))
              : <span style={{ color: 'var(--status-anomaly)', fontSize: '0.82rem' }}>궤도 채널 없음</span>
            }
          </InfoRow>
        </div>
      )}

      {/* 변환 설정 */}
      {fileInfo && !loading && (
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

          {/* 출력 디렉토리 */}
          <div className="dmd-param-row">
            <label className="dmd-param-label">출력 경로</label>
            <button onClick={handleSelectOutputDir} className="btn-file-select" disabled={converting}
              style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}>
              폴더 선택
            </button>
            <span className="dmd-param-hint" style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {outputDir || '출력 디렉토리를 선택하세요.'}
            </span>
          </div>

          {/* 변환 버튼 */}
          <button
            onClick={handleConvert}
            disabled={!outputDir || converting}
            className="btn-run-inference"
            style={{ marginTop: '0.75rem' }}
          >
            {converting
              ? <><span className="btn-spinner" />변환 중...</>
              : 'RCPVMS BIN 변환 시작'
            }
          </button>
        </>
      )}

      {error && <div className="error-message" style={{ marginTop: '0.75rem' }}>⚠️ {error}</div>}

      {/* 변환 결과 */}
      {convertResult && (
        <div className="dmd-info-panel" style={{ marginTop: '0.75rem' }}>
          <InfoRow label="변환 완료">{convertResult.n_windows}개 파일</InfoRow>
          <InfoRow label="채널 수">{convertResult.total_ch}</InfoRow>
          <InfoRow label="샘플레이트">{(convertResult.sampling_rate / 1000).toFixed(0)} kHz</InfoRow>
          <InfoRow label="윈도우당">{(convertResult.samples_per_window).toLocaleString()} samples</InfoRow>
          <InfoRow label="출력 경로">
            <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{convertResult.output_dir}</span>
          </InfoRow>
        </div>
      )}
    </div>
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

        {/* C-1: BinOrbitTab 제거 — BIN 궤도 뷰어는 RcpvmsOrbitViewer로 이관 */}
        <DmdConvertTab />
      </div>
    </div>
  )
}
