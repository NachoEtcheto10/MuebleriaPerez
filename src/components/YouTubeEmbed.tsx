import { useState } from 'react'
import { Icon } from './Icon'

export function parseYouTubeEmbed(urlOrId?: string): { embedUrl: string | null; watchUrl: string | null } {
  if (!urlOrId || typeof urlOrId !== 'string') return { embedUrl: null, watchUrl: null }
  const clean = urlOrId.trim()
  if (!clean) return { embedUrl: null, watchUrl: null }

  // 1. Canal / Playlist
  const channelMatch = clean.match(/(?:youtube\.com\/channel\/UC)([\w-]{22})/i)
  if (channelMatch) {
    const listId = 'UU' + channelMatch[1]
    return {
      embedUrl: `https://www.youtube-nocookie.com/embed?listType=playlist&list=${listId}`,
      watchUrl: clean,
    }
  }

  const playlistMatch = clean.match(/[?&]list=([a-zA-Z0-9_-]+)/)
  if (playlistMatch && !clean.includes('watch?v=')) {
    return {
      embedUrl: `https://www.youtube-nocookie.com/embed?listType=playlist&list=${playlistMatch[1]}`,
      watchUrl: clean,
    }
  }

  // 2. Shorts: youtube.com/shorts/VIDEO_ID
  const shortsMatch = clean.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i)
  if (shortsMatch) {
    return {
      embedUrl: `https://www.youtube-nocookie.com/embed/${shortsMatch[1]}`,
      watchUrl: `https://www.youtube.com/watch?v=${shortsMatch[1]}`,
    }
  }

  // 3. Watch: youtube.com/watch?v=VIDEO_ID
  const watchMatch = clean.match(/[?&]v=([a-zA-Z0-9_-]{11})/i)
  if (watchMatch) {
    return {
      embedUrl: `https://www.youtube-nocookie.com/embed/${watchMatch[1]}`,
      watchUrl: `https://www.youtube.com/watch?v=${watchMatch[1]}`,
    }
  }

  // 4. Short URL: youtu.be/VIDEO_ID
  const youtuMatch = clean.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i)
  if (youtuMatch) {
    return {
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtuMatch[1]}`,
      watchUrl: `https://www.youtube.com/watch?v=${youtuMatch[1]}`,
    }
  }

  // 5. Already embed URL
  const embedMatch = clean.match(/youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{11})/i)
  if (embedMatch) {
    return {
      embedUrl: `https://www.youtube-nocookie.com/embed/${embedMatch[1]}`,
      watchUrl: `https://www.youtube.com/watch?v=${embedMatch[1]}`,
    }
  }

  // 6. Direct 11-char video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return {
      embedUrl: `https://www.youtube-nocookie.com/embed/${clean}`,
      watchUrl: `https://www.youtube.com/watch?v=${clean}`,
    }
  }

  return { embedUrl: null, watchUrl: clean.startsWith('http') ? clean : null }
}

interface YouTubeEmbedProps {
  url?: string
  title?: string
  subtitle?: string
  className?: string
}

export function YouTubeEmbed({
  url,
  title = 'Conocé nuestros productos en acción',
  subtitle = 'Mirá el video con detalles de calidad, materiales y terminaciones.',
  className = '',
}: YouTubeEmbedProps) {
  const { embedUrl, watchUrl } = parseYouTubeEmbed(url)
  const [loaded, setLoaded] = useState(false)

  if (!embedUrl) return null

  return (
    <div className={`overflow-hidden rounded-3xl border border-piedra-200 bg-white shadow-card ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-piedra-100 px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-white">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </span>
            <h3 className="font-display text-lg font-bold text-piedra-900">{title}</h3>
          </div>
          {subtitle && <p className="mt-1 text-sm text-piedra-500">{subtitle}</p>}
        </div>
        {watchUrl && (
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-piedra-200 bg-piedra-50 px-3.5 py-1.5 text-xs font-semibold text-piedra-700 hover:bg-piedra-100"
          >
            Abrir en YouTube
            <Icon name="arrowRight" size={13} />
          </a>
        )}
      </div>

      <div className="relative aspect-video w-full bg-piedra-900">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-piedra-300">
            Cargando video de YouTube…
          </div>
        )}
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onLoad={() => setLoaded(true)}
          className={`h-full w-full border-0 transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
    </div>
  )
}

