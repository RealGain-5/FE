import React from 'react'

/**
 * 단일 파일 분석 모드 UI (파일 선택 + 분석 시작 버튼).
 *
 * @param {object}   props
 * @param {string}   props.binPath
 * @param {boolean}  props.loading
 * @param {Function} props.onSelectFile
 * @param {Function} props.onRun
 */
export function SingleFileMode({ binPath, loading, onSelectFile, onRun }) {
  return (
    <>
      <div className="input-group">
        <div className="file-picker-wrapper">
          <button onClick={onSelectFile} className="btn-file-select" disabled={loading}>파일 선택</button>
          <span className="file-path-text">{binPath || '분석할 .bin 파일을 선택해주세요.'}</span>
        </div>
      </div>
      <button onClick={onRun} disabled={!binPath || loading} className="btn-run-inference">
        {loading ? <><span className="btn-spinner" />분석 중</> : '분석 시작'}
      </button>
    </>
  )
}
