import { useCallback, useEffect, useRef, useState } from 'react'

export function useObjectUrlImage() {
  const [src, setSrc] = useState(null)
  const objectUrlRef = useRef(null)

  const clear = useCallback(() => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = null
    setSrc(null)
  }, [])

  const setImage = useCallback((nextSrc, objectUrl = null) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = objectUrl
    setSrc(nextSrc)
  }, [])

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = null
  }, [])

  return { src, setImage, clear }
}
