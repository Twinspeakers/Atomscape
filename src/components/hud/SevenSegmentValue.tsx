interface SevenSegmentValueProps {
  value: string
  label?: string
  className?: string
}

export function SevenSegmentValue({ value, label, className }: SevenSegmentValueProps) {
  return (
    <div className={['seven-segment', className ?? ''].join(' ').trim()} aria-label={label}>
      {value.split('').map((char, index) => (
        <span
          key={`digit-${index}-${char}`}
          className={`seven-segment__glyph ${
            char === '.'
              ? 'seven-segment__glyph--dot'
              : char === '-'
                ? 'seven-segment__glyph--dash'
                : 'seven-segment__glyph--digit'
          }`}
        >
          {char}
        </span>
      ))}
    </div>
  )
}

