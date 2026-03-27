import { ModelInference } from '../components/ModelInference'
import { MAEAnalysis } from '../components/MAEAnalysis'
import { DmdOrbitViewer } from '../components/DmdOrbitViewer'
import { RcpvmsOrbitViewer } from '../components/RcpvmsOrbitViewer'

/**
 * 앱 탭 설정 레지스트리.
 * 탭 추가 = 이 배열에 항목 1개 추가로 완결 — App.jsx 수정 불필요.
 */
export const TAB_CONFIG = [
  { id: 'ensemble', label: '앙상블 분석', Component: ModelInference },
  { id: 'mae',      label: 'MAE 분석',   Component: MAEAnalysis },
  { id: 'dmd',      label: 'DMD 분석',   Component: DmdOrbitViewer },
  { id: 'rcpvms',   label: 'RCPVMS 뷰어', Component: RcpvmsOrbitViewer },
]
