import { useState } from 'react'
import { useConcurrencySelector } from './useConcurrencySelector'

/**
 * Shared state and logic for single-file + batch analysis workflows.
 *
 * @param {object} opts
 * @param {(binPath: string) => Promise<{success, data, error}>} opts.apiRunSingle
 * @param {(paths: string[]) => Promise<{success, summary?, error}>} opts.apiRunBatch
 * @param {() => Promise<void>} opts.apiCancelBatch
 * @param {(cb: (progress) => void) => void} opts.onBatchProgress
 * @param {() => void} opts.offBatchProgress
 * @param {(binPath: string, data: any) => Promise<void>} [opts.onSingleSuccess]
 * @param {(paths: string[], response: any) => Promise<void>} [opts.onBatchComplete]
 */
export function useAnalysisController({
  apiRunSingle,
  apiRunBatch,
  apiCancelBatch,
  onBatchProgress,
  offBatchProgress,
  onSingleSuccess,
  onBatchComplete,
}) {
  const [mode, setMode] = useState('single')

  const [binPath, setBinPath] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const [batchFiles, setBatchFiles] = useState([])
  const [batchProgress, setBatchProgress] = useState({
    total: 0, completed: 0, failed: 0, current: null, running: [], runningCount: 0,
  })
  const [batchLoading, setBatchLoading] = useState(false)
  const { level: concurrencyLevel, handleChange: handleConcurrencyChange } = useConcurrencySelector(2)

  const handleSelectFile = async () => {
    try {
      const p = await window.api.selectBinFile()
      if (p) { setBinPath(p); setResult(null); setError(null) }
    } catch (err) {
      setError(`파일 선택 오류: ${err.message}`)
    }
  }

  const handleRunSingle = async () => {
    if (!binPath) { setError('먼저 BIN 파일을 선택해주세요.'); return }
    setLoading(true); setResult(null); setError(null)
    try {
      const response = await apiRunSingle(binPath)
      if (response.success) {
        setResult(response.data)
        await onSingleSuccess?.(binPath, response.data)
      } else {
        setError(response.error)
      }
    } catch (e) {
      setError(`분석 오류: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAddBatchFiles = async () => {
    try {
      const paths = await window.api.selectBinFiles()
      if (paths && paths.length > 0) {
        // I-6: 전체 batchFiles 기준으로 중복 체크 — completed/failed 결과 유지하며 append
        const existingPaths = new Set(batchFiles.map(f => f.path))
        const newPaths = paths.filter(p => !existingPaths.has(p))
        const newFiles = newPaths.map(path => ({ path, status: 'pending', result: null, error: null }))
        setBatchFiles(prev => [...prev, ...newFiles])
        if (newPaths.length < paths.length) {
          alert(`${paths.length - newPaths.length}개의 중복 파일이 제외되었습니다.`)
        }
      }
    } catch (err) {
      setError(`파일 선택 오류: ${err.message}`)
    }
  }

  const handleRemoveBatchFile = (path) => {
    setBatchFiles(prev => prev.filter(f => f.path !== path))
  }

  const handleRunBatch = async () => {
    if (batchLoading) return  // C-1: 재진입 방지
    if (batchFiles.length === 0) { setError('먼저 분석할 파일을 추가해주세요.'); return }
    setBatchLoading(true)
    setError(null)
    setBatchFiles(prev => prev.map(f => ({ ...f, status: 'pending', result: null, error: null })))
    setBatchProgress({ total: batchFiles.length, completed: 0, failed: 0, current: null, running: [], runningCount: 0 })

    offBatchProgress()  // C-1: 이전 리스너 선제 제거 후 재등록
    onBatchProgress((progress) => {
      setBatchProgress(progress)
      // C-2: 4개 분기를 단일 setBatchFiles 호출로 통합 (O(N×4) → O(N))
      setBatchFiles(prev => prev.map(f => {
        if (progress.currentResult !== undefined && f.path === progress.current)
          return { ...f, status: 'completed', result: progress.currentResult }
        if (progress.currentError !== undefined && f.path === progress.current)
          return { ...f, status: 'failed', error: progress.currentError }
        if (f.path === progress.current || progress.running?.includes(f.path))
          return { ...f, status: 'running' }
        return f
      }))
    })

    try {
      const paths = batchFiles.map(f => f.path)
      const response = await apiRunBatch(paths)
      await onBatchComplete?.(paths, response)
    } catch (err) {
      setError(`배치 분석 오류: ${err.message}`)
    } finally {
      setBatchLoading(false)
      offBatchProgress()
    }
  }

  const handleCancelBatch = async () => {
    if (!window.confirm('진행 중인 분석을 취소하시겠습니까?')) return
    try {
      await apiCancelBatch()
      setBatchLoading(false)
      offBatchProgress()
    } catch (err) {
      console.error('Cancel error:', err)
    }
  }

  return {
    mode, setMode,
    binPath, setBinPath,
    loading, result, error, setError,
    batchFiles, setBatchFiles,
    batchProgress,
    batchLoading,
    concurrencyLevel,
    handleConcurrencyChange,
    handleSelectFile,
    handleRunSingle,
    handleAddBatchFiles,
    handleRemoveBatchFile,
    handleRunBatch,
    handleCancelBatch,
  }
}
