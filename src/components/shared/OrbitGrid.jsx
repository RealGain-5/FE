import React, { useState } from 'react'

// ─────────────────────────────────────────────
// 공유 상수
// ─────────────────────────────────────────────
export const RCP_ORDER = ['RCPA1', 'RCPA2', 'RCPB1', 'RCPB2']

// ─────────────────────────────────────────────
// 공유 UI: 궤도 그리드 (base64 이미지)
// ─────────────────────────────────────────────
export function OrbitCell({ src, isActive, onClick }) {
  return (
    <div
      className={`dmd-orbit-cell ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      {src ? (
        <img src={src} alt="" className="dmd-orbit-thumb" />
      ) : (
        <div className="dmd-orbit-placeholder">—</div>
      )}
    </div>
  )
}

/**
 * 궤도 그리드 컴포넌트.
 * @param {{ data: { n_windows, window_sec, timeline, orbit_map } }} props
 * 계약: data.orbit_map은 반드시 존재해야 한다.
 *   - rcpvms_orbit 응답은 항상 orbit_map을 포함한다.
 *   - 호출 측(SingleFileTab 등)은 has_orbit가 false이면 분석 버튼을 비활성화해 이 함수에 진입을 막아야 한다.
 */
export function OrbitGrid({ data }) {
  const [modal, setModal] = useState(null)
  const { n_windows, window_sec, timeline, orbit_map } = data

  return (
    <div className="dmd-orbit-section">
      <div className="dmd-orbit-grid-wrap">
        <div className="dmd-grid-header-row">
          <div className="dmd-rcp-label-col" />
          {Array.from({ length: n_windows }, (_, wi) => (
            <div key={wi} className="dmd-window-header">
              {wi * window_sec}~{(wi + 1) * window_sec}s
            </div>
          ))}
        </div>
        {RCP_ORDER.map((rcp) => {
          const hasData = rcp in (orbit_map ?? {})
          const rcpImages = timeline?.[rcp] ?? []
          return (
            <div key={rcp} className="dmd-grid-row">
              <div className={`dmd-rcp-label-col ${hasData ? '' : 'no-data'}`}>
                {rcp}
              </div>
              {hasData
                ? rcpImages.map((src, wi) => (
                    <OrbitCell
                      key={wi}
                      src={src}
                      isActive={modal?.rcp === rcp && modal?.wi === wi}
                      onClick={() => src && setModal({ rcp, wi, src })}
                    />
                  ))
                : <div className="dmd-no-channel">채널 없음</div>
              }
            </div>
          )
        })}
      </div>

      {modal && (
        <div className="dmd-modal-backdrop" onClick={() => setModal(null)}>
          <div className="dmd-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="dmd-modal-header">
              <span className="dmd-modal-title">
                {modal.rcp} · {modal.wi * window_sec}~{(modal.wi + 1) * window_sec}s
              </span>
              <button className="dmd-modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="dmd-modal-body">
              <img src={modal.src} alt={`${modal.rcp} 궤도`} className="dmd-modal-img" />
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
