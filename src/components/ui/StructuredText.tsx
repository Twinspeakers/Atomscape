import type { ReactNode } from 'react'

interface StructuredTextProps {
  text: string
  containerClassName?: string
  paragraphClassName?: string
  listClassName?: string
  orderedListClassName?: string
}

interface StructuredBlock {
  type: 'paragraph' | 'unordered-list' | 'ordered-list'
  lines: string[]
}

function parseStructuredBlocks(text: string): StructuredBlock[] {
  const blocks: StructuredBlock[] = []
  const lines = text.split('\n')
  let currentListType: 'unordered-list' | 'ordered-list' | null = null
  let currentListLines: string[] = []

  const flushList = (): void => {
    if (!currentListType || currentListLines.length === 0) {
      currentListType = null
      currentListLines = []
      return
    }

    blocks.push({
      type: currentListType,
      lines: [...currentListLines],
    })
    currentListType = null
    currentListLines = []
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trim()
    if (!line) {
      flushList()
      return
    }

    if (line.startsWith('- ')) {
      const content = line.slice(2).trim()
      if (!content) {
        return
      }

      if (currentListType !== 'unordered-list') {
        flushList()
        currentListType = 'unordered-list'
      }
      currentListLines.push(content)
      return
    }

    const orderedMatch = line.match(/^\d+\.\s+(.*)$/)
    if (orderedMatch) {
      const content = orderedMatch[1]?.trim()
      if (!content) {
        return
      }

      if (currentListType !== 'ordered-list') {
        flushList()
        currentListType = 'ordered-list'
      }
      currentListLines.push(content)
      return
    }

    flushList()
    blocks.push({
      type: 'paragraph',
      lines: [line],
    })
  })

  flushList()
  return blocks
}

export function StructuredText({
  text,
  containerClassName = 'space-y-2',
  paragraphClassName = 'ui-body-copy',
  listClassName = 'ui-body-copy list-disc space-y-1 pl-4',
  orderedListClassName = 'ui-body-copy list-decimal space-y-1 pl-4',
}: StructuredTextProps) {
  const blocks = parseStructuredBlocks(text)
  if (blocks.length === 0) {
    return null
  }

  const nodes: ReactNode[] = blocks.map((block, index) => {
    if (block.type === 'unordered-list') {
      return (
        <ul key={`ul-${index}`} className={listClassName}>
          {block.lines.map((line, itemIndex) => (
            <li key={`ul-${index}-item-${itemIndex}`}>{line}</li>
          ))}
        </ul>
      )
    }

    if (block.type === 'ordered-list') {
      return (
        <ol key={`ol-${index}`} className={orderedListClassName}>
          {block.lines.map((line, itemIndex) => (
            <li key={`ol-${index}-item-${itemIndex}`}>{line}</li>
          ))}
        </ol>
      )
    }

    return (
      <p key={`p-${index}`} className={paragraphClassName}>
        {block.lines[0]}
      </p>
    )
  })

  return <div className={containerClassName}>{nodes}</div>
}
