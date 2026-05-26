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
      setError(`?뚯씪 ?좏깮 ?ㅻ쪟: ${err.message}`)
    }
  }

  const handleRunSingle = async () => {
    if (!binPath) { setError('癒쇱? BIN ?뚯씪???좏깮?댁＜?몄슂.'); return }
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
      setError(`遺꾩꽍 ?ㅻ쪟: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAddBatchFiles = async () => {
    try {
      const paths = await window.api.selectBinFiles()
      if (paths && paths.length > 0) {
        // I-6: ?꾩껜 batchFiles 湲곗??쇰줈 以묐났 泥댄겕 ??completed/failed 寃곌낵 ?좎??섎ŉ append
        setBatchFiles(prev => {
          const existingPaths = new Set(prev.map(f => f.path))
          const newPaths = paths.filter(p => !existingPaths.has(p))
          const newFiles = newPaths.map(path => ({ path, status: 'pending', result: null, error: null }))
          return [...prev, ...newFiles]
        })
      }
    } catch (err) {
      setError(`?뚯씪 ?좏깮 ?ㅻ쪟: ${err.message}`)
    }
  }

  const handleRemoveBatchFile = (path) => {
    setBatchFiles(prev => prev.filter(f => f.path !== path))
  }

  const handleRunBatch = async () => {
    if (batchLoading) return  // C-1: ?ъ쭊??諛⑹?
    if (batchFiles.length === 0) { setError('癒쇱? 遺꾩꽍???뚯씪??異붽??댁＜?몄슂.'); return }
    setBatchLoading(true)
    setError(null)
    setBatchFiles(prev => prev.map(f => ({ ...f, status: 'pending', result: null, error: null })))
    setBatchProgress({ total: batchFiles.length, completed: 0, failed: 0, current: null, running: [], runningCount: 0 })

    offBatchProgress()  // C-1: ?댁쟾 由ъ뒪???좎젣 ?쒓굅 ???щ벑濡?
    onBatchProgress((progress) => {
      setBatchProgress(progress)
      // C-2: 4媛?遺꾧린瑜??⑥씪 setBatchFiles ?몄텧濡??듯빀 (O(N횞4) ??O(N))
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
      setError(`諛곗튂 遺꾩꽍 ?ㅻ쪟: ${err.message}`)
    } finally {
      setBatchLoading(false)
      offBatchProgress()
    }
  }

  const handleCancelBatch = async () => {
    if (!window.confirm('吏꾪뻾 以묒씤 遺꾩꽍??痍⑥냼?섏떆寃좎뒿?덇퉴?')) return
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
