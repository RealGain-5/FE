import React from 'react'

/**
 * 배치 분석 실행/취소 버튼 묶음.
 *
 * @param {object}   props
 * @param {number}   props.filesCount   - 배치 파일 수
 * @param {boolean}  props.batchLoading
 * @param {Function} props.onRun
 * @param {Function} props.onCancel
 */
export function BatchActionButtons({ filesCount, batchLoading, onRun, onCancel }) {
  return (
    <div className="batch-action-buttons">
      <button
        onClick={onRun}
        disabled={filesCount === 0 || batchLoading}
        className="btn-run-inference"
      >
        {batchLoading ? <><span className="btn-spinner" />분석 중</> : '전체 분석 시작'}
      </button>
      {batchLoading && (
        <button onClick={onCancel} className="btn-cancel">⏹ 취소</button>
      )}
    </div>
  )
}
