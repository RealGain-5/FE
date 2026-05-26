export function imageBufferToObjectUrl(bufferLike, mime = 'image/png') {
  if (!bufferLike) return null

  let bytes
  if (bufferLike instanceof ArrayBuffer) {
    bytes = new Uint8Array(bufferLike)
  } else if (ArrayBuffer.isView(bufferLike)) {
    bytes = new Uint8Array(bufferLike.buffer, bufferLike.byteOffset, bufferLike.byteLength)
  } else if (Array.isArray(bufferLike)) {
    bytes = new Uint8Array(bufferLike)
  } else if (Array.isArray(bufferLike.data)) {
    bytes = new Uint8Array(bufferLike.data)
  }

  if (!bytes) return null
  return URL.createObjectURL(new Blob([bytes], { type: mime }))
}

export function imagePayloadToSource(data) {
  if (!data) return { source: null, objectUrl: null, error: 'Image payload is empty.' }

  if (data.image_buffer) {
    try {
      const objectUrl = imageBufferToObjectUrl(data.image_buffer, data.image_mime)
      if (objectUrl) return { source: objectUrl, objectUrl, error: null }
    } catch (err) {
      return { source: null, objectUrl: null, error: err.message }
    }
  }

  if (data.image_b64) {
    return { source: data.image_b64, objectUrl: null, error: null }
  }

  return { source: null, objectUrl: null, error: 'Image payload has no supported image field.' }
}
