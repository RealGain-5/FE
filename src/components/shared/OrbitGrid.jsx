import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react'

// ─────────────────────────────────────────────
// 공유 상수
// ─────────────────────────────────────────────
export const RCP_ORDER = ['RCP1A', 'RCP1B', 'RCP2A', 'RCP2B']

// timeline에서 이미지가 있는 셀을 읽기 순서(RCP행 → 윈도우열)로 평탄화
function buildFlatList(timeline, rcpOrder) {
  const list = []
  for (const rcp of rcpOrder) {
    const images = timeline?.[rcp] ?? []
    images.forEach((src, wi) => {
      if (src) list.push({ rcp, wi, src })
    })
  }
  return list
}

// ─────────────────────────────────────────────
// 공유 UI: 궤도 그리드 (base64 이미지)
// ─────────────────────────────────────────────
// memo 적용: src/isActive/rcp/wi/onOpen이 모두 안정적일 때 재렌더 방지
export const OrbitCell = memo(function OrbitCell({ src, isActive, rcp, wi, onOpen }) {
  return (
    <div
      className={`dmd-orbit-cell ${isActive ? 'active' : ''}`}
      onClick={() => src && onOpen(rcp, wi)}
    >
      {src ? (
        <img src={src} alt="" className="dmd-orbit-thumb" />
      ) : (
        <div className="dmd-orbit-placeholder">—</div>
      )}
    </div>
  )
})

/**
 * 궤도 그리드 컴포넌트.
 * @param {{ data: { positions, n_windows, window_sec, timeline, orbit_map, per_window_axis_lim, fixed_axis_lim, user_axis_lim_map }, binPath?: string, windowSec?: number, scaleMode?: string }} props
 * orbit_map이 없거나 빈 경우 모든 행이 "채널 없음"으로 표시된다.
 * binPath와 windowSec이 제공되면 모달에서 스케일 재설정 기능을 사용할 수 있다.
 * timeline이 없고 binPath가 있으면 rcpvms_orbit_single로 이미지를 지연 로딩한다.
 */
export function OrbitGrid({ data, binPath, windowSec: windowSecProp, scaleMode = 'auto' }) {
  const [modalIdx, setModalIdx]           = useState(null)
  const [zoom, setZoom]                   = useState(1.0)
  const [scaleInput, setScaleInput]       = useState('')
  const [overrideImage, setOverrideImage] = useState(null)
  const [scaleLoading, setScaleLoading]   = useState(false)
  const [scaleError, setScaleError]       = useState(null)
  const [lazyImages, setLazyImages]       = useState({})  // `${pos}:${wi}` → base64 string
  const modalBodyRef                      = useRef(null)
  const scaleInputRef                     = useRef(null)

  const { n_windows, window_sec, timeline, orbit_map, positions: serverPositions,
          per_window_axis_lim, fixed_axis_lim, user_axis_lim_map } = data
  const resolvedWindowSec = windowSecProp ?? window_sec ?? 1.0
  const safeOrbitMap = orbit_map ?? {}

  // 서버가 보낸 positions 순서를 우선 사용하고, 나머지 RCP_ORDER 항목은 "채널 없음"으로 표시
  const displayOrder = useMemo(() => {
    const serverSet = new Set(serverPositions ?? [])
    const extras = RCP_ORDER.filter(r => !serverSet.has(r))
    return [...(serverPositions ?? RCP_ORDER), ...extras]
  }, [serverPositions])

  // timeline이 없으면 lazyImages로 합성한 가상 timeline을 flatList에 사용
  const effectiveTimeline = useMemo(() => {
    if (timeline && Object.keys(timeline).length > 0) return timeline
    if (Object.keys(lazyImages).length === 0) return null
    const synth = {}
    for (const [key, b64] of Object.entries(lazyImages)) {
      const colonIdx = key.indexOf(':')
      const pos = key.slice(0, colonIdx)
      const wi  = parseInt(key.slice(colonIdx + 1), 10)
      if (!synth[pos]) synth[pos] = []
      synth[pos][wi] = b64
    }
    return synth
  }, [timeline, lazyImages])

  const flatList = useMemo(() => buildFlatList(effectiveTimeline, displayOrder), [effectiveTimeline, displayOrder])
  // (rcp, wi) → flat index 역방향 맵 — openModal의 O(N) findIndex 제거
  const flatIdxMap = useMemo(() => {
    const map = {}
    flatList.forEach((item, idx) => { map[`${item.rcp}:${item.wi}`] = idx })
    return map
  }, [flatList])
  const modal = modalIdx !== null ? flatList[modalIdx] : null

  const closeModal = useCallback(() => {
    setModalIdx(null)
    setZoom(1.0)
    setScaleInput('')
    setOverrideImage(null)
    setScaleError(null)
  }, [])

  const navigate = useCallback((dir) => {
    setModalIdx(prev => {
      if (prev === null) return null
      const next = prev + dir
      if (next < 0 || next >= flatList.length) return prev
      return next
    })
    setZoom(1.0)
    setScaleInput('')
    setOverrideImage(null)
    setScaleError(null)
  }, [flatList.length])

  const openModal = useCallback((rcp, wi) => {
    const idx = flatIdxMap[`${rcp}:${wi}`]
    if (idx !== undefined) {
      setModalIdx(idx)
      setZoom(1.0)
      setScaleInput('')
      setOverrideImage(null)
      setScaleError(null)
    }
  }, [flatIdxMap])

  // 키보드: 방향키 이동, Escape 닫기
  useEffect(() => {
    if (modalIdx === null) return
    const handler = (e) => {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); navigate(-1) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); navigate(1) }
      else if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [modalIdx, navigate, closeModal])

  // 마우스 휠 줌 (passive:false 필요)
  useEffect(() => {
    const el = modalBodyRef.current
    if (!el || modalIdx === null) return
    const handler = (e) => {
      e.preventDefault()
      setZoom(prev => {
        const delta = e.deltaY < 0 ? 0.15 : -0.15
        return Math.min(4.0, Math.max(1.0, parseFloat((prev + delta).toFixed(2))))
      })
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [modalIdx !== null]) // 모달 open/close 전환 시에만 리스너 재등록 (boolean으로 전환 감지)

  const canPrev = modalIdx !== null && modalIdx > 0
  const canNext = modalIdx !== null && modalIdx < flatList.length - 1

  const handleApplyScale = useCallback(async () => {
    if (!binPath || !modal || scaleLoading) return
    const axisLim = parseFloat(scaleInput)
    if (!axisLim || axisLim <= 0) {
      setScaleError('0보다 큰 숫자를 입력하세요')
      return
    }
    setScaleLoading(true)
    setScaleError(null)
    try {
      const res = await window.api.runRcpvmsOrbitSingle(
        binPath, modal.rcp, modal.wi, resolvedWindowSec, axisLim
      )
      if (!res.success) throw new Error(res.error || 'Unknown error')
      if (res.data?.image_b64) {
        setOverrideImage(res.data.image_b64)
      }
    } catch (err) {
      setScaleError(err.message)
    } finally {
      setScaleLoading(false)
    }
  }, [binPath, modal, scaleInput, scaleLoading, resolvedWindowSec])

  const handleScaleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleApplyScale()
  }, [handleApplyScale])

  const canApplyScale = !!binPath && !!modal

  // timeline이 없고 binPath가 있으면 rcpvms_orbit_single로 셀별 지연 로딩
  useEffect(() => {
    const positions = serverPositions ?? []
    const nWindows = n_windows ?? 0
    // timeline이 이미 있으면 지연 로딩 불필요
    if (!binPath || positions.length === 0 || nWindows === 0) return
    if (timeline && Object.keys(timeline).length > 0) return

    setLazyImages({})

    for (const pos of positions) {
      for (let wi = 0; wi < nWindows; wi++) {
        let axisLim
        if (scaleMode === 'fixed') {
          axisLim = fixed_axis_lim ?? 3.0
        } else if (scaleMode === 'user' && user_axis_lim_map?.[pos] > 0) {
          axisLim = user_axis_lim_map[pos]
        } else {
          axisLim = per_window_axis_lim?.[pos]?.[wi] ?? fixed_axis_lim ?? 3.0
        }
        window.api.runRcpvmsOrbitSingle(binPath, pos, wi, resolvedWindowSec, axisLim)
          .then(res => {
            if (res?.success && res.data?.image_b64) {
              setLazyImages(prev => ({ ...prev, [`${pos}:${wi}`]: res.data.image_b64 }))
            }
          })
          .catch(() => {})
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [binPath, (serverPositions ?? []).join(','), n_windows, scaleMode, resolvedWindowSec,
      fixed_axis_lim, per_window_axis_lim, user_axis_lim_map, !!timeline])

  return (
    <div className="dmd-orbit-section">
      <div className="dmd-orbit-grid-wrap">
        <div className="dmd-grid-header-row">
          <div className="dmd-rcp-label-col" />
          {Array.from({ length: n_windows }, (_, wi) => (
            <div key={wi} className="dmd-window-header">
              {(wi * window_sec).toFixed(1)}~{((wi + 1) * window_sec).toFixed(1)}s
            </div>
          ))}
        </div>
        {displayOrder.map((rcp) => {
          const hasData = rcp in safeOrbitMap
          const rcpImages = timeline?.[rcp] ?? []  // pre-loaded images (may be empty)
          return (
            <div key={rcp} className="dmd-grid-row">
              <div className={`dmd-rcp-label-col ${hasData ? '' : 'no-data'}`}>
                {rcp}
              </div>
              {hasData
                ? Array.from({ length: n_windows }, (_, wi) => {
                    const src = rcpImages[wi] ?? lazyImages[`${rcp}:${wi}`] ?? null
                    return (
                      <OrbitCell
                        key={wi}
                        src={src}
                        isActive={modal?.rcp === rcp && modal?.wi === wi}
                        rcp={rcp}
                        wi={wi}
                        onOpen={openModal}
                      />
                    )
                  })
                : <div className="dmd-no-channel">채널 없음</div>
              }
            </div>
          )
        })}
      </div>

      {modal && (
        <div className="dmd-modal-backdrop" onClick={closeModal}>
          <div className="dmd-modal-box" onClick={(e) => e.stopPropagation()}>

            {/* 타이틀 바 */}
            <div className="dmd-modal-header">
              <span className="dmd-modal-title">
                {modal.rcp} · {(modal.wi * window_sec).toFixed(1)}~{((modal.wi + 1) * window_sec).toFixed(1)}s
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  className="dmd-modal-zoom-label"
                  style={{ opacity: zoom === 1.0 ? 0.35 : 1, transition: 'opacity 0.15s' }}
                >{Math.round(zoom * 100)}%</span>
                <button className="dmd-modal-close" onClick={closeModal}>✕</button>
              </div>
            </div>

            {/* 이미지 영역 */}
            <div
              className="dmd-modal-body"
              ref={modalBodyRef}
              style={{ cursor: zoom > 1.0 ? 'zoom-out' : 'zoom-in', overflow: 'hidden' }}
            >
              <img
                src={overrideImage ?? modal.src}
                alt={`${modal.rcp} 궤도`}
                className="dmd-modal-img"
                style={{ transform: `scale(${zoom})`, transition: 'transform 0.1s ease' }}
                onDoubleClick={() => setZoom(1.0)}
                draggable={false}
              />
            </div>

            {/* 궤도 스케일 재설정 바 */}
            {canApplyScale && (
              <div className="dmd-modal-scale-bar">
                <span className="dmd-modal-scale-label">스케일</span>
                <span className="dmd-modal-scale-unit">±</span>
                <input
                  ref={scaleInputRef}
                  type="number"
                  className="dmd-modal-scale-input"
                  value={scaleInput}
                  min={0.1}
                  step={0.5}
                  placeholder="mil"
                  onChange={(e) => { setScaleInput(e.target.value); setScaleError(null) }}
                  onKeyDown={handleScaleKeyDown}
                  disabled={scaleLoading}
                />
                <span className="dmd-modal-scale-unit">mil</span>
                <button
                  className="dmd-modal-scale-btn"
                  onClick={handleApplyScale}
                  disabled={scaleLoading || !scaleInput}
                >
                  {scaleLoading ? '...' : '적용'}
                </button>
                {overrideImage && (
                  <button
                    className="dmd-modal-scale-reset"
                    onClick={() => { setOverrideImage(null); setScaleInput(''); setScaleError(null) }}
                    title="원본 스케일로 복원"
                  >
                    원본
                  </button>
                )}
                {scaleError && (
                  <span className="dmd-modal-scale-error">{scaleError}</span>
                )}
              </div>
            )}

            {/* 네비게이션 바 */}
            <div className="dmd-modal-nav">
              <button
                className="dmd-modal-nav-btn"
                onClick={() => navigate(-1)}
                disabled={!canPrev}
                title="이전 (←)"
              >◀</button>
              <span className="dmd-modal-nav-info">
                {modalIdx + 1} / {flatList.length}
              </span>
              <button
                className="dmd-modal-nav-btn"
                onClick={() => navigate(1)}
                disabled={!canNext}
                title="다음 (→)"
              >▶</button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// 공유: 정보 행
// ─────────────────────────────────────────────
export function InfoRow({ label, children }) {
  return (
    <div className="dmd-info-row">
      <span className="dmd-info-label">{label}</span>
      <span className="dmd-info-value">{children}</span>
    </div>
  )
}

// ─────────────────────────────────────────────
// 공유: RCPVMS BIN 파일 정보 패널
// ─────────────────────────────────────────────
export function RcpvmsFileInfoPanel({ fileInfo }) {
  return (
    <div className="dmd-info-panel">
      <InfoRow label="사이트">{fileInfo.site_id || '—'}</InfoRow>
      <InfoRow label="채널 수">{fileInfo.total_ch}</InfoRow>
      <InfoRow label="샘플레이트">{(fileInfo.sampling_rate / 1000).toFixed(0)} kHz</InfoRow>
      <InfoRow label="구간">{(fileInfo.event_duration_ms / 1000).toFixed(0)}초</InfoRow>
      <InfoRow label="날짜">{fileInfo.event_date || '—'}</InfoRow>
      <InfoRow label="mils/V">{fileInfo.mils_per_v?.toFixed(1)}</InfoRow>
      <InfoRow label="포맷">{fileInfo.is_legacy ? '구형 (인덱스)' : '신규 (채널명)'}</InfoRow>
      <InfoRow label="궤도 RCP">
        {fileInfo.has_orbit
          ? Object.keys(fileInfo.orbit_map).map((rcp) => (
              <span key={rcp} className="dmd-rcp-chip">{rcp}</span>
            ))
          : <span style={{ color: 'var(--status-anomaly)', fontSize: '0.82rem' }}>궤도 채널 없음</span>
        }
      </InfoRow>
    </div>
  )
}
