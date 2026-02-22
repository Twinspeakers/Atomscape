import type {
  AnchorHTMLAttributes,
  ComponentType,
  HTMLAttributes,
  ImgHTMLAttributes,
} from 'react'
import { MDXProvider } from '@mdx-js/react'

interface WikiArticleProps {
  Content: ComponentType<Record<string, unknown>> | null
}

function withClassName(baseClass: string, className?: string): string {
  return className ? `${baseClass} ${className}` : baseClass
}

const mdxComponents = {
  h1: (props: HTMLAttributes<HTMLHeadingElement>) => (
    <h1 {...props} className={withClassName('ui-prose-h1', props.className)} />
  ),
  h2: (props: HTMLAttributes<HTMLHeadingElement>) => (
    <h2 {...props} className={withClassName('ui-prose-h2', props.className)} />
  ),
  h3: (props: HTMLAttributes<HTMLHeadingElement>) => (
    <h3 {...props} className={withClassName('ui-prose-h3', props.className)} />
  ),
  p: (props: HTMLAttributes<HTMLParagraphElement>) => (
    <p {...props} className={withClassName('ui-prose-p', props.className)} />
  ),
  img: (props: ImgHTMLAttributes<HTMLImageElement>) => (
    <img {...props} className={withClassName('ui-prose-img', props.className)} />
  ),
  ul: (props: HTMLAttributes<HTMLUListElement>) => (
    <ul {...props} className={withClassName('ui-prose-ul', props.className)} />
  ),
  ol: (props: HTMLAttributes<HTMLOListElement>) => (
    <ol {...props} className={withClassName('ui-prose-ol', props.className)} />
  ),
  li: (props: HTMLAttributes<HTMLLIElement>) => (
    <li {...props} className={withClassName('ui-prose-li', props.className)} />
  ),
  code: (props: HTMLAttributes<HTMLElement>) => (
    <code {...props} className={withClassName('ui-prose-code', props.className)} />
  ),
  pre: (props: HTMLAttributes<HTMLPreElement>) => (
    <pre {...props} className={withClassName('ui-prose-pre', props.className)} />
  ),
  a: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props} className={withClassName('ui-prose-a', props.className)} />
  ),
  table: (props: HTMLAttributes<HTMLTableElement>) => (
    <table {...props} className={withClassName('ui-prose-table', props.className)} />
  ),
  th: (props: HTMLAttributes<HTMLTableCellElement>) => (
    <th {...props} className={withClassName('ui-prose-th', props.className)} />
  ),
  td: (props: HTMLAttributes<HTMLTableCellElement>) => (
    <td {...props} className={withClassName('ui-prose-td', props.className)} />
  ),
}

export function WikiArticle({ Content }: WikiArticleProps) {
  if (!Content) {
    return <p className="ui-body-copy">Select a wiki page from the list.</p>
  }

  return (
    <MDXProvider components={mdxComponents}>
      <article className="ui-prose">
        <Content />
      </article>
    </MDXProvider>
  )
}
