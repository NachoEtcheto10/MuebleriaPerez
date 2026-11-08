import type { Product } from './types'

export interface YouTubeSyncResult {
  matchedCount: number
  updatedProducts: Product[]
  details: { code: string; title: string; videoUrl: string }[]
  errors: string[]
}

export async function syncYouTubeVideos(
  apiKey: string,
  channelOrPlaylistId: string,
  products: Product[]
): Promise<YouTubeSyncResult> {
  const cleanKey = apiKey.trim()
  let cleanId = channelOrPlaylistId.trim()

  if (!cleanKey || !cleanId) {
    throw new Error('Tenés que ingresar la API Key y el ID de Canal o Playlist de YouTube.')
  }

  // Si pasaron un Channel ID (empieza con UC), la lista de subidas del canal empieza con UU
  let playlistId = cleanId
  if (cleanId.startsWith('UC') && cleanId.length === 24) {
    playlistId = 'UU' + cleanId.slice(2)
  }

  // Obtenemos los videos de la playlist (soporta hasta 50 videos por página)
  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${encodeURIComponent(
    playlistId
  )}&key=${encodeURIComponent(cleanKey)}`

  const res = await fetch(url)
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    const msg = errorData?.error?.message || `Error ${res.status}: no se pudo conectar con YouTube`
    throw new Error(msg)
  }

  const json = await res.json()
  const items = json.items || []

  const details: { code: string; title: string; videoUrl: string }[] = []
  const errors: string[] = []

  // Mapeamos los productos por código normalizado
  const productsByCode = new Map<string, Product>()
  for (const p of products) {
    if (p.code) {
      const norm = p.code.toUpperCase().replace(/[^A-Z0-9]/g, '')
      if (norm) productsByCode.set(norm, p)
    }
  }

  const updatedMap = new Map<string, Product>()

  for (const item of items) {
    const snippet = item.snippet
    const videoId = snippet?.resourceId?.videoId
    if (!videoId) continue

    const videoTitle = snippet.title || ''
    const videoDesc = snippet.description || ''
    const fullText = `${videoTitle} ${videoDesc}`.toUpperCase()
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`

    // Buscamos si algún código de producto aparece en el título o descripción
    for (const [normCode, product] of productsByCode.entries()) {
      // Expresión para buscar el código completo (ej. SOF-01, SOF01)
      const pattern = new RegExp(`\\b${normCode}\\b|[\\[#(-]${normCode}[\\]#)-]`, 'i')
      const rawCodePattern = new RegExp(`\\b${product.code.toUpperCase()}\\b`, 'i')

      if (pattern.test(fullText) || rawCodePattern.test(fullText)) {
        if (product.youtube_url !== videoUrl) {
          const updated = { ...product, youtube_url: videoUrl }
          updatedMap.set(product.id, updated)
          details.push({
            code: product.code,
            title: videoTitle,
            videoUrl,
          })
        }
      }
    }
  }

  return {
    matchedCount: details.length,
    updatedProducts: Array.from(updatedMap.values()),
    details,
    errors,
  }
}

