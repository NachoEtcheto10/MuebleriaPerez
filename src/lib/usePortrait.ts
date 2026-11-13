import { useEffect, useState } from 'react'

/** Carga la foto en segundo plano y dice si es vertical (más alta que ancha) */
export function usePortrait(src: string | undefined) {
  const [portrait, setPortrait] = useState(false)
  useEffect(() => {
    if (!src) return setPortrait(false)
    let alive = true
    const img = new Image()
    img.onload = () => alive && setPortrait(img.naturalHeight > img.naturalWidth * 1.02)
    img.src = src
    return () => {
      alive = false
    }
  }, [src])
  return portrait
}
