import React from 'react'
import { getFileName } from '../../utils/fileUtils'
import { ErrorDisplay } from './ErrorDisplay'

/**
 * 파일 선택 → 로딩 → 파일 정보 → 파라미터 → 실행 → 결과 플로우 공통 컴포넌트.
 *
 * SingleFileTab(RcpvmsOrbitViewer)과 DmdConvertTab(DmdOrbitViewer)이 공유하는
 * 5단계 UI 구조를 추상화한다. 각 단계의 도메인 고유 렌더링은 render-prop으로 주입.
 *
 * @param {object} props
 * @param {string}   props.filePickerLabel       - 파일 선택 버튼 텍스트
 * @param {string}   props.filePlaceholderText   - 파일 미선택 시 표시할 안내 문구
 * @param {string}   props.filePath              - 현재 선택된 파일 경로 (null 가능)
 * @param {Function} props.onSelectFile
 * @param {boolean}  props.pickerDisabled        - 파일 선택 버튼 비활성 여부
 * @param {boolean}  props.loading               - 파일 정보 로딩 중 여부 (spinner 표시)
 * @param {string}   [props.loadingText]         - 로딩 중 메시지 (기본: '파일 정보 읽는 중...')
 * @param {any}      props.fileInfo              - 파일 정보 객체 (truthy일 때 이하 UI 표시)
 * @param {Function} props.renderFileInfo        - (fileInfo) => JSX
 * @param {Function} [props.renderParams]        - () => JSX  파라미터 행 (선택)
 * @param {Function} props.onRun                 - 실행 버튼 클릭 핸들러
 * @param {boolean}  props.canRun                - 실행 버튼 활성 여부
 * @param {boolean}  props.analyzing             - 실행 중 여부 (spinner + label 전환)
 * @param {string|ReactNode} props.actionLabel   - 실행 버튼 기본 텍스트
 * @param {string}   [props.analyzingLabel]      - 실행 중 버튼 텍스트 (기본: '처리 중...')
 * @param {string}   props.error
 * @param {any}      props.result                - 결과 데이터 (truthy일 때 renderResult 호출)
 * @param {Function} props.renderResult          - (result) => JSX
 */
export function FileOperationFlow({
  filePickerLabel,
  filePlaceholderText,
  filePath,
  onSelectFile,
  pickerDisabled,
  loading,
  loadingText,
  fileInfo,
  renderFileInfo,
  renderParams,
  onRun,
  canRun,
  analyzing,
  actionLabel,
  analyzingLabel,
  error,
  result,
  renderResult,
}) {
  const fileName = filePath ? getFileName(filePath) : null

  return (
    <div>
      {/* 파일 선택 */}
      <div className="input-group">
        <div className="file-picker-wrapper">
          <button onClick={onSelectFile} className="btn-file-select" disabled={pickerDisabled}>
            {filePickerLabel}
          </button>
          <span className="file-path-text">
            {fileName || filePlaceholderText}
          </span>
        </div>
      </div>

      {/* 로딩 힌트 */}
      {loading && (
        <div className="dmd-loading-hint">
          <span className="dmd-inline-spinner" />{loadingText ?? '파일 정보 읽는 중...'}
        </div>
      )}

      {/* 파일 정보 패널 */}
      {fileInfo && !loading && renderFileInfo(fileInfo)}

      {/* 파라미터 행 */}
      {fileInfo && !loading && renderParams && renderParams()}

      {/* 실행 버튼 */}
      {fileInfo && !loading && (
        <button
          onClick={onRun}
          disabled={!canRun}
          className="btn-run-inference"
          style={{ marginTop: '0.75rem' }}
        >
          {analyzing
            ? <><span className="btn-spinner" />{analyzingLabel ?? '처리 중...'}</>
            : actionLabel
          }
        </button>
      )}

      <ErrorDisplay error={error} />

      {/* 결과 */}
      {result && renderResult(result)}
    </div>
  )
}
