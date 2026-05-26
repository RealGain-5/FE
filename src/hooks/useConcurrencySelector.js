import { useState } from 'react'

/**
 * 병렬 처리 수준 state + 핸들러 훅.
 * useAnalysisController와 RcpvmsOrbitViewer.BatchTab 양쪽에서 공유.
 *
 * @param {number} [initial=2] 초기 동시성 수준
 * @returns {{ level: number, handleChange: (e: Event) => Promise<void> }}
 */
export function useConcurrencySelector(initial = 2) {
  const [level, setLevel] = useState(initial)

  const handleChange = async (e) => {
    const newLevel = parseInt(e.target.value)
    if (newLevel === 4) {
      const confirmed = window.confirm(
        '⚠️ 병렬 처리 수준 4는 시스템 리소스를 많이 사용합니다.\n' +
        'CPU 사용률이 높아지고 메모리 부하가 증가할 수 있습니다.\n\n' +
        '계속하시겠습니까?'
      )
      if (!confirmed) return
    }
    const previousLevel = level
    setLevel(newLevel)
    try {
      await window.api.setConcurrencyLevel(newLevel)
    } catch (err) {
      setLevel(previousLevel)
      alert(`병렬 처리 수준 설정 실패: ${err.message}`)
    }
  }

  return { level, handleChange }
}
