import React from 'react'
import { SingleFileMode } from './SingleFileMode'
import { BatchFileList } from './BatchFileList'
import { BatchProgressBar } from './BatchProgressBar'
import { BatchActionButtons } from './BatchActionButtons'
import { BatchResultList } from './BatchResultList'
import { ConcurrencySelector } from './ConcurrencySelector'
import { ErrorDisplay } from './ErrorDisplay'

/**
 * 단일 파일 / 배치 처리 모드 레이아웃 공통 컴포넌트.
 *
 * ModelInference와 MAEAnalysis가 공유하는 구조적 패턴을 추상화:
 *   - control-panel (헤더 + 모드 토글 + 모드별 컨트롤)
 *   - 에러 표시
 *   - 결과 영역 (단일 결과 패널 또는 배치 리스트)
 *
 * 도메인 고유 로직은 render-prop으로 주입한다.
 *
 * @param {object} props
 * @param {string}   props.title            - 섹션 타이틀 (h2)
 * @param {ReactNode} [props.headerBadge]   - 모드 토글 옆에 표시할 배지 (선택)
 * @param {string}   props.mode             - 'single' | 'batch'
 * @param {Function} props.setMode
 * @param {string}   props.binPath
 * @param {boolean}  props.loading
 * @param {Function} props.onSelectFile
 * @param {Function} props.onRunSingle
 * @param {any}      props.singleResult
 * @param {Function} props.renderSingleResult  - (result) => JSX
 * @param {Array}    props.batchFiles
 * @param {object}   props.batchProgress
 * @param {boolean}  props.batchLoading
 * @param {number}   props.concurrencyLevel
 * @param {Function} props.onConcurrencyChange
 * @param {string}   props.concurrencyId        - ConcurrencySelector label htmlFor
 * @param {Function} props.onAddFiles
 * @param {Function} props.onRemoveFile
 * @param {Function} [props.onRetryFile]         - 개별 파일 재시도 (선택)
 * @param {Function} props.onRunBatch
 * @param {Function} props.onCancelBatch
 * @param {Function} props.getFileLabel          - (file) => JSX  BatchFileList 레이블
 * @param {Function} props.getAccordionLabel     - (file) => JSX  BatchResultList 레이블
 * @param {Function} props.renderBatchResult     - (result) => JSX
 * @param {ReactNode} [props.batchExtraControls] - BatchActionButtons 하단 슬롯 (export 버튼 등)
 * @param {string}   props.error
 */
export function AnalysisModeLayout({
  title,
  headerBadge,
  mode,
  setMode,
  binPath,
  loading,
  onSelectFile,
  onRunSingle,
  singleResult,
  renderSingleResult,
  batchFiles,
  batchProgress,
  batchLoading,
  concurrencyLevel,
  onConcurrencyChange,
  concurrencyId,
  onAddFiles,
  onRemoveFile,
  onRetryFile,
  onRunBatch,
  onCancelBatch,
  getFileLabel,
  getAccordionLabel,
  renderBatchResult,
  batchExtraControls,
  error,
}) {
  return (
    <div className="model-inference">
      <div className="control-panel">
        <div className="header-row">
          <h2 className="section-title">{title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {headerBadge}
            <div className="mode-toggle">
              <button className={`mode-btn ${mode === 'single' ? 'active' : ''}`} onClick={() => setMode('single')}>단일 파일</button>
              <button className={`mode-btn ${mode === 'batch'  ? 'active' : ''}`} onClick={() => setMode('batch')}>배치 처리</button>
            </div>
          </div>
        </div>

        {mode === 'single' ? (
          <SingleFileMode
            binPath={binPath}
            loading={loading}
            onSelectFile={onSelectFile}
            onRun={onRunSingle}
          />
        ) : (
          <>
            <div className="batch-controls-row">
              <button onClick={onAddFiles} className="btn-add-files" disabled={batchLoading}>+ 파일 추가</button>
              <ConcurrencySelector
                id={concurrencyId}
                value={concurrencyLevel}
                onChange={onConcurrencyChange}
                disabled={batchLoading}
              />
            </div>

            <BatchFileList
              files={batchFiles}
              onRemove={onRemoveFile}
              disabled={batchLoading}
              onRetry={onRetryFile}
              getLabel={getFileLabel}
            />

            {batchFiles.length > 0 && (
              <BatchProgressBar batchProgress={batchProgress} batchLoading={batchLoading} />
            )}

            <BatchActionButtons
              filesCount={batchFiles.length}
              batchLoading={batchLoading}
              onRun={onRunBatch}
              onCancel={onCancelBatch}
            />

            {batchExtraControls}
          </>
        )}
      </div>

      <ErrorDisplay error={error} />

      {mode === 'single' && singleResult && renderSingleResult(singleResult)}

      {mode === 'batch' && (
        <BatchResultList
          files={batchFiles}
          renderResult={renderBatchResult}
          getLabel={getAccordionLabel}
        />
      )}
    </div>
  )
}
