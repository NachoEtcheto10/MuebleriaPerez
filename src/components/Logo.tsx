import { Link } from 'react-router-dom'

/**
 * Logotipo de Pérez dibujado en vector a partir del logo de su Instagram:
 * letras geométricas con los cortes característicos (panza abierta en P y R,
 * brazo medio despegado en las E, pierna suelta en la R y diagonal separada en la Z).
 */
export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 1220 440" className={className} fill="currentColor" role="img" aria-label="Pérez Muebles & Colchones">
      {/* P */}
      <rect x="0" y="0" width="58" height="285" />
      <path d="M0 0H165Q235 0 235 70V130Q235 200 165 200H95L77 150H160Q182 150 182 128V72Q182 50 160 50H0Z" />
      {/* E */}
      <g transform="translate(260 0)">
        <rect x="0" y="0" width="56" height="285" />
        <rect x="0" y="0" width="195" height="50" />
        <rect x="0" y="235" width="195" height="50" />
        <path d="M70 120H162V170H90Z" />
      </g>
      {/* R */}
      <g transform="translate(485 0)">
        <rect x="0" y="0" width="58" height="285" />
        <path d="M0 0H170Q235 0 235 65V107Q235 172 170 172H80L63 125H165Q182 125 182 108V67Q182 50 165 50H0Z" />
        <path d="M120 222L170 205L235 285H182Z" />
      </g>
      {/* E */}
      <g transform="translate(745 0)">
        <rect x="0" y="0" width="56" height="285" />
        <rect x="0" y="0" width="195" height="50" />
        <rect x="0" y="235" width="195" height="50" />
        <path d="M70 120H162V170H90Z" />
      </g>
      {/* Z */}
      <g transform="translate(970 0)">
        <rect x="10" y="0" width="240" height="50" />
        <path d="M184 48H250L92 232L54 200Z" />
        <rect x="0" y="235" width="250" height="50" />
      </g>
      <text x="0" y="435" textLength="1220" lengthAdjust="spacingAndGlyphs"
        style={{ font: '600 100px Montserrat, system-ui, sans-serif' }}>
        MUEBLES &amp; COLCHONES
      </text>
    </svg>
  )
}

export function Logo({ light = false, className = '' }: { light?: boolean; className?: string }) {
  return (
    <Link to="/" className={`inline-block ${light ? 'text-white' : 'text-piedra-900'} ${className}`} aria-label="Pérez Muebles & Colchones, ir al inicio">
      <LogoMark className="h-10 w-auto sm:h-11" />
    </Link>
  )
}
