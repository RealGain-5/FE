import React, { useState } from 'react'
import './ModelInference.css'

// RCP 카드 컴포넌트 (탭 포함)
function RCPCard({ rcp, data, visualization }) {
  const [activeTab, setActiveTab] = useState('orbit')
  const [timelineIndex, setTimelineIndex] = useState(9) // 기본 sec9

  const tabs = [
    { id: 'orbit', label: '궤도' },
    { id: 'heatmap', label: 'Grad-CAM' },
    { id: 'overlay', label: '오버레이' },
    { id: 'timeline', label: '타임라인' }
  ]

  const getImagePath = () => {
    if (!visualization) return null

    let path = ''
    if (activeTab === 'orbit') {
      path = visualization.orbit
    } else if (activeTab === 'heatmap') {
      path = visualization.gradcam.heatmap
    } else if (activeTab === 'overlay') {
      path = visualization.gradcam.overlay
    } else if (activeTab === 'timeline') {
      path = visualization.temporal[timelineIndex]
    }

    // Windows 경로를 URL로 변환
    // C:\Users\... -> file:///C:/Users/...
    const normalizedPath = path.replace(/\\/g, '/')
    const fileUrl = `file:///${normalizedPath}`

    console.log('[RCPCard] Image path:', path)
    console.log('[RCPCard] File URL:', fileUrl)

    return fileUrl
  }

  return (
    <div className="rcp-card">
      <div className="card-header">
        <span className="card-title">{rcp}</span>
        <span className={`status-badge ${data.prediction}`}>{data.prediction}</span>
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
            <img src={getImagePath()} alt="Vis" className="vis-image" />
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
          <div style={{ color: '#64748b', fontSize: '0.9rem' }}>시각화 준비 중</div>
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
    </div>
  )
}

// 메인 컴포넌트
export function ModelInference() {
  const [binPath, setBinPath] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

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

  return (
    <div className="model-inference">
      <div className="control-panel">
        <h2 className="section-title">🔬 Orbit 이상 탐지 분석</h2>

        <div className="input-group">
          <div className="file-picker-wrapper">
            <button onClick={handleSelectFile} className="btn-file-select" disabled={loading}>
              📂 파일 찾기
            </button>
            <span className="file-path-text">{binPath || '분석할 .bin 파일을 선택해주세요.'}</span>
          </div>
        </div>

        <button
          onClick={handleRunInference}
          disabled={!binPath || loading}
          className="btn-run-inference"
        >
          {loading ? '⏳ 분석 진행 중...' : '🚀 분석 시작'}
        </button>
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

      {result && (
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
    </div>
  )
}
