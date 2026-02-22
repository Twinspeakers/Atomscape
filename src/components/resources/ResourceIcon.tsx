import type { ResourceId } from '@domain/resources/resourceCatalog'
import { resourcePresentationById, type ResourceIconKind } from '@domain/resources/resourcePresentation'

interface ResourceIconProps {
  resourceId: ResourceId
  size?: number | string
  className?: string
}

interface Palette {
  bg: string
  stroke: string
  glyph: string
  text: string
}

const iconPaletteByKind: Record<ResourceIconKind, Palette> = {
  rubble: { bg: '#0f1418', stroke: '#7c8a95', glyph: '#a7b5bf', text: '#d9e1e7' },
  crystal: { bg: '#10151f', stroke: '#8ca3b8', glyph: '#bfd7eb', text: '#e6f2fb' },
  ore: { bg: '#1a1411', stroke: '#b7916d', glyph: '#d9bb8f', text: '#f5dcc1' },
  ice: { bg: '#0f1620', stroke: '#93b7d7', glyph: '#c7e4ff', text: '#ecf8ff' },
  liquid: { bg: '#101822', stroke: '#86a8c6', glyph: '#b7d5ee', text: '#e5f1fb' },
  gas: { bg: '#12131a', stroke: '#8b93a8', glyph: '#c0c8d8', text: '#ecf1ff' },
  carbon: { bg: '#171616', stroke: '#9e9e9e', glyph: '#d8d8d8', text: '#f2f2f2' },
  metal: { bg: '#16181c', stroke: '#8f99a3', glyph: '#c7d0d8', text: '#eff4f7' },
  glass: { bg: '#0f1b1d', stroke: '#7da9aa', glyph: '#abd6d7', text: '#ddf4f5' },
  alloy: { bg: '#1a1714', stroke: '#b8a58f', glyph: '#decab0', text: '#f4e7d6' },
  bio: { bg: '#111b13', stroke: '#6fa16d', glyph: '#9ad596', text: '#d6f3d4' },
  wood: { bg: '#1c140f', stroke: '#b48358', glyph: '#d8a77a', text: '#f1d2b3' },
  crate: { bg: '#1a1713', stroke: '#9a8870', glyph: '#c8b79f', text: '#ece0d1' },
  battery: { bg: '#101915', stroke: '#78ef00', glyph: '#b6ff73', text: '#e8ffd1' },
  ration: { bg: '#161313', stroke: '#b19595', glyph: '#dec7c7', text: '#f4ebeb' },
  waste: { bg: '#141414', stroke: '#747474', glyph: '#a8a8a8', text: '#dfdfdf' },
}

function iconGlyph(kind: ResourceIconKind, glyphColor: string) {
  switch (kind) {
    case 'rubble':
      return (
        <path
          d="M17 38 L24 20 L36 18 L45 26 L43 38 L31 44 Z"
          fill={glyphColor}
          stroke={glyphColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      )
    case 'crystal':
      return (
        <path
          d="M31 14 L42 25 L36 43 L26 43 L20 25 Z"
          fill="none"
          stroke={glyphColor}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      )
    case 'ore':
      return (
        <g fill="none" stroke={glyphColor} strokeWidth="2" strokeLinecap="round">
          <circle cx="24" cy="24" r="4.5" />
          <circle cx="38" cy="30" r="5.5" />
          <circle cx="27" cy="39" r="3.8" />
        </g>
      )
    case 'ice':
      return (
        <path
          d="M31 17 L40 22 L40 32 L31 37 L22 32 L22 22 Z M31 14 L31 40 M19 27 L43 27 M23 20 L39 34 M39 20 L23 34"
          fill="none"
          stroke={glyphColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )
    case 'liquid':
      return (
        <path
          d="M31 15 C36 24 41 28 41 34 C41 39.5 36.5 44 31 44 C25.5 44 21 39.5 21 34 C21 28 26 24 31 15 Z"
          fill="none"
          stroke={glyphColor}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      )
    case 'gas':
      return (
        <g fill="none" stroke={glyphColor} strokeWidth="1.8">
          <circle cx="25" cy="31" r="7" />
          <circle cx="35" cy="26" r="5.5" />
          <circle cx="38" cy="35" r="4.5" />
        </g>
      )
    case 'carbon':
      return (
        <path
          d="M31 18 L42 24 L42 36 L31 42 L20 36 L20 24 Z"
          fill="none"
          stroke={glyphColor}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )
    case 'metal':
      return (
        <path
          d="M19 34 L25 22 H45 L39 34 Z M18 36 H40"
          fill="none"
          stroke={glyphColor}
          strokeWidth="2.1"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )
    case 'glass':
      return (
        <g fill="none" stroke={glyphColor} strokeWidth="1.9">
          <rect x="20" y="18" width="22" height="24" rx="2.5" />
          <path d="M24 23 H38 M24 30 H38 M24 37 H34" />
        </g>
      )
    case 'alloy':
      return (
        <g fill="none" stroke={glyphColor} strokeWidth="1.9" strokeLinecap="round">
          <path d="M19 35 L26 22 H45 L38 35 Z" />
          <path d="M22 35 L29 22" />
          <path d="M30 35 L37 22" />
        </g>
      )
    case 'bio':
      return (
        <path
          d="M21 37 C25 24 35 19 43 19 C41 30 35 40 24 42 M27 35 C30 32 34 29 39 27"
          fill="none"
          stroke={glyphColor}
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )
    case 'wood':
      return (
        <g fill="none" stroke={glyphColor} strokeWidth="1.9">
          <rect x="19" y="20" width="24" height="19" rx="2.5" />
          <path d="M24 20 V39 M30 20 V39 M36 20 V39" />
        </g>
      )
    case 'crate':
      return (
        <g fill="none" stroke={glyphColor} strokeWidth="1.9" strokeLinejoin="round">
          <path d="M19 24 L31 18 L43 24 L31 30 Z" />
          <path d="M19 24 V37 L31 43 V30 M43 24 V37 L31 43" />
        </g>
      )
    case 'battery':
      return (
        <g fill="none" stroke={glyphColor} strokeWidth="2" strokeLinejoin="round">
          <rect x="21" y="20" width="20" height="22" rx="3" />
          <path d="M27 16 H35 M31 24 L26 32 H32 L29 39" strokeLinecap="round" />
        </g>
      )
    case 'ration':
      return (
        <g fill="none" stroke={glyphColor} strokeWidth="2" strokeLinejoin="round">
          <rect x="18" y="23" width="26" height="16" rx="4" />
          <path d="M30 23 V39" />
          <path d="M38 23 C38 20 41 19 43 20" />
        </g>
      )
    case 'waste':
      return (
        <g fill="none" stroke={glyphColor} strokeWidth="1.9" strokeLinecap="round">
          <path d="M22 22 L40 40 M40 22 L22 40" />
          <circle cx="31" cy="31" r="11.5" />
        </g>
      )
    default:
      return <g />
  }
}

export function ResourceIcon({ resourceId, size = 34, className }: ResourceIconProps) {
  const presentation = resourcePresentationById[resourceId]
  const palette = iconPaletteByKind[presentation.iconKind]

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label={`${resourceId} icon`}
    >
      <rect x="4" y="4" width="56" height="56" rx="14" fill={palette.bg} stroke={palette.stroke} strokeWidth="1.6" />
      <circle cx="32" cy="32" r="21" fill="none" stroke={palette.stroke} strokeWidth="1" opacity="0.5" />
      {iconGlyph(presentation.iconKind, palette.glyph)}
      <text
        x="32"
        y="54"
        textAnchor="middle"
        fontFamily="Bahnschrift, 'Trebuchet MS', 'Segoe UI', sans-serif"
        fontSize="8.5"
        letterSpacing="0.04em"
        fill={palette.text}
      >
        {presentation.shortCode}
      </text>
    </svg>
  )
}

