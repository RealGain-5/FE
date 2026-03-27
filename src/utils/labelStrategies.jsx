import React from 'react'

/**
 * 분석 타입별 BatchFileList / BatchResultList 레이블 렌더링 전략.
 *
 * 각 분석 모듈이 다른 필드명(final_label vs final_verdict)을 사용하는 것을
 * 여기에 집중하여 호출 측의 필드명 결합을 제거한다.
 */
export const LABEL_STRATEGIES = {
  ensemble: {
    getFileLabel: (file) => {
      const label = file.result.final_label
      return <span className={`file-label ${label}`}>{label.toUpperCase()}</span>
    },
    getAccordionLabel: (file) => {
      const label = file.result.final_label
      return <span className={`accordion-label ${label}`}>{label.toUpperCase()}</span>
    },
  },
  mae: {
    getFileLabel: (file) => {
      const verdict = file.result.final_verdict
      const css = verdict === 'anomaly' ? 'abnormal' : 'normal'
      return <span className={`file-label ${css}`}>{verdict.toUpperCase()}</span>
    },
    getAccordionLabel: (file) => {
      const verdict = file.result.final_verdict
      const css = verdict === 'anomaly' ? 'abnormal' : 'normal'
      return <span className={`accordion-label ${css}`}>{verdict.toUpperCase()}</span>
    },
  },
}
