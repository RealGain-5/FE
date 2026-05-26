import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react'
import { useObjectUrlImage } from '../../hooks/useObjectUrlImage'
import { imagePayloadToSource } from '../../utils/imageSource'

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
 * filterMode: 'raw' | '1x' | '2x' | 'broadband' (기본값: '1x')
 */
export function OrbitGrid({ data, binPath, windowSec: windowSecProp, scaleMode = 'auto', filterMode = '1x' }) {
  const [modalIdx, setModalIdx]           = useState(null)
  const [zoom, setZoom]                   = useState(1.0)
  const [scaleInput, setScaleInput]       = useState('')
  const [scaleLoading, setScaleLoading]   = useState(false)
  const [scaleError, setScaleError]       = useState(null)
  const [lazyImages, setLazyImages]       = useState({})  // `${pos}:${wi}` → base64 string
  const [lazyError, setLazyError]         = useState(null)
  const [gridVisible, setGridVisible]     = useState(false)
  const modalBodyRef                      = useRef(null)
  const scaleInputRef                     = useRef(null)
  const gridWrapRef                       = useRef(null)
  const scaleRequestIdRef                 = useRef(0)
  const lazyRequestIdRef                  = useRef(0)
  const { src: overrideImage, setImage: setOverrideImage, clear: clearOverrideImage } = useObjectUrlImage()

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
    scaleRequestIdRef.current += 1
    setModalIdx(null)
    setZoom(1.0)
    setScaleInput('')
    clearOverrideImage()
    setScaleError(null)
  }, [clearOverrideImage])

  const navigate = useCallback((dir) => {
    scaleRequestIdRef.current += 1
    setModalIdx(prev => {
      if (prev === null) return null
      const next = prev + dir
      if (next < 0 || next >= flatList.length) return prev
      return next
    })
    setZoom(1.0)
    setScaleInput('')
    clearOverrideImage()
    setScaleError(null)
  }, [flatList.length, clearOverrideImage])

  const openModal = useCallback((rcp, wi) => {
    const idx = flatIdxMap[`${rcp}:${wi}`]
    if (idx !== undefined) {
      scaleRequestIdRef.current += 1
      setModalIdx(idx)
      setZoom(1.0)
      setScaleInput('')
      clearOverrideImage()
      setScaleError(null)
    }
  }, [flatIdxMap, clearOverrideImage])

  // 그리드가 뷰포트에 들어오면 이미지 로딩 허가 (오프스크린 탭 낭비 방지)
  useEffect(() => {
    const el = gridWrapRef.current
    if (!el) { setGridVisible(true); return }
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setGridVisible(true); obs.disconnect() } },
      { threshold: 0.01 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

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
    const requestId = scaleRequestIdRef.current + 1
    scaleRequestIdRef.current = requestId
    const targetKey = `${modal.rcp}:${modal.wi}`
    const axisLim = parseFloat(scaleInput)
    if (!axisLim || axisLim <= 0) {
      setScaleError('0보다 큰 숫자를 입력하세요')
      return
    }
    setScaleLoading(true)
    setScaleError(null)
    try {
      const res = await window.api.runRcpvmsOrbitSingle(
        binPath, modal.rcp, modal.wi, resolvedWindowSec, axisLim, filterMode
      )
      if (scaleRequestIdRef.current !== requestId) return
      if (!res.success) throw new Error(res.error || 'Unknown error')
      const currentKey = modalIdx !== null ? `${flatList[modalIdx]?.rcp}:${flatList[modalIdx]?.wi}` : null
      if (currentKey !== targetKey) return
      const payload = imagePayloadToSource(res.data)
      if (!payload.source) throw new Error(payload.error || 'Unsupported image payload')
      setOverrideImage(payload.source, payload.objectUrl)
    } catch (err) {
      if (scaleRequestIdRef.current !== requestId) return
      setScaleError(err.message)
    } finally {
      if (scaleRequestIdRef.current === requestId) setScaleLoading(false)
    }
  }, [binPath, modal, modalIdx, flatList, scaleInput, scaleLoading, resolvedWindowSec, filterMode, setOverrideImage])

  const handleScaleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleApplyScale()
  }, [handleApplyScale])

  const canApplyScale = !!binPath && !!modal

  // timeline이 없고 binPath가 있으면 rcpvms_orbit_multi로 전체 셀을 1회 IPC로 일괄 로딩.
  // gridVisible(IntersectionObserver)이 true가 될 때까지 요청을 지연해 오프스크린 낭비를 방지.
  useEffect(() => {
    if (!gridVisible) return
    const positions = serverPositions ?? []
    const nWindows = n_windows ?? 0
    if (!binPath || positions.length === 0 || nWindows === 0) return
    if (timeline && Object.keys(timeline).length > 0) return

    const requestId = lazyRequestIdRef.current + 1
    lazyRequestIdRef.current = requestId
    setLazyImages({})
    setLazyError(null)
    let cancelled = false

    const items = []
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
        items.push({ pos, wi, axis_lim: axisLim })
      }
    }

    window.api.runRcpvmsOrbitMulti(binPath, resolvedWindowSec, filterMode, items)
      .then(res => {
        if (cancelled || lazyRequestIdRef.current !== requestId) return
        if (!res?.success) throw new Error(res?.error || 'Orbit image loading failed')
        if (res?.success && res.data?.images) {
          const newImages = {}
          for (const { pos, wi, image_b64 } of res.data.images) {
            newImages[`${pos}:${wi}`] = image_b64
          }
          setLazyImages(newImages)
        }
      })
      .catch((err) => {
        if (!cancelled && lazyRequestIdRef.current === requestId) {
          setLazyError(err.message || 'Orbit image loading failed')
        }
      })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridVisible, binPath, (serverPositions ?? []).join(','), n_windows, scaleMode, filterMode,
      resolvedWindowSec, fixed_axis_lim, per_window_axis_lim, user_axis_lim_map, !!timeline])

  return (
    <div className="dmd-orbit-section" ref={gridWrapRef}>
      <div className="dmd-orbit-filter-note">
        {filterMode === '1x' && '1X 동기 성분 필터 적용 — 회전 주파수를 자동 탐지하여 해당 성분만 추출합니다.'}
        {filterMode === '2x' && '2X 성분 필터 적용 — 2배 회전 주파수(불균형/미스얼라인먼트 특징) 성분만 추출합니다.'}
        {filterMode === 'broadband' && '브로드밴드 필터 적용 — DC 드리프트만 제거하고 전체 주파수 성분을 표시합니다.'}
        {filterMode === 'raw' && 'Raw 신호 — 필터 없음, DC offset만 제거합니다.'}
        {filterMode === 'overlay' && 'Overlay — Raw(회백) · BB(황색) · 2X(진홍) · 1X(하늘) 4가지 궤도를 동일 스케일로 겹쳐 표시합니다.'}
      </div>
      {lazyError && (
        <div className="dmd-orbit-filter-note" style={{ color: 'var(--status-anomaly)' }}>
          {lazyError}
        </div>
      )}
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
                    onClick={() => {
                      scaleRequestIdRef.current += 1
                      clearOverrideImage(); setScaleInput(''); setScaleError(null)
                    }}
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
