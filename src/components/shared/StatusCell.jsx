import React from 'react'

const STATUS_ICONS = {
  pending:   '⏸',
  running:   '⏳',
  completed: '✓',
  failed:    '✗',
}

/**
 * 파일 처리 상태를 아이콘으로 표시하는 셀.
 * BatchFileList 및 여러 컴포넌트에서 반복되던 if-chain을 데이터 룩업으로 대체.
 */
export function StatusCell({ status }) {
  return <span className="file-status-icon">{STATUS_ICONS[status] ?? '?'}</span>
}
