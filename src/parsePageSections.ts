export { parsePageSections }
export type { PageSection }

import { assert } from './utils/assert.js'
import { determineSectionUrlHash } from './utils/determineSectionUrlHash.js'
import os from 'os'

type PageSection = {
  pageSectionTitle: string
  pageSectionId: string | null
  pageSectionLevel: number
}

function parsePageSections() {
  return {
    name: '@brillout/docpress:parsePageSections',
    enforce: 'pre',
    transform: async (code: string, id: string) => {
      if (!id.endsWith('+Page.mdx')) {
        return
      }
      const codeNew = transform(code)
      return codeNew
    },
  }
}

function transform(code: string) {
  const pageSections: PageSection[] = []
  let isCodeBlock = false
  let codeNew = code
    .split('\n')
    .map((line) => {
      // Skip code blocks, e.g.
      // ~~~md
      // # Markdown Example
      // Bla
      // ~~~
      if (line.startsWith('~~~') || line.startsWith('```')) {
        isCodeBlock = !isCodeBlock
        return line
      }
      if (isCodeBlock) {
        return line
      }

      if (line.startsWith('#')) {
        const { pageSectionId, pageSectionLevel, pageSectionTitle, headingHtml } = parsePageSection(line)
        pageSections.push({ pageSectionId, pageSectionLevel, pageSectionTitle })
        return headingHtml
      }

      return line
    })
    .join('\n')
  const exportCode = `export const pageSectionsExport = [${pageSections
    .map((pageSection) => JSON.stringify(pageSection))
    .join(', ')}];`
  codeNew += `\n\n${exportCode}\n`
  return codeNew
}

function parsePageSection(line: string): PageSection & { headingHtml: string } {
  const [lineBegin, ...lineWords] = line.split(' ')
  assert(lineBegin.split('#').join('') === '', { line, lineWords })
  const pageSectionLevel = lineBegin.length

  const titleMdx = lineWords.join(' ')
  assert(!titleMdx.startsWith(' '), { line, lineWords })
  assert(titleMdx, { line, lineWords })

  const headingMdx = {
    pageSectionTitle: titleMdx,
    anchor: titleMdx,
  }
  {
    // Support custom anchor like: `## Some Title{#custom-anchor}`
    const customAnchor = /(?<={#).*(?=})/g.exec(titleMdx)?.[0]
    if (customAnchor) {
      headingMdx.anchor = customAnchor
      headingMdx.pageSectionTitle = titleMdx.replace(/{#.*}/g, '')
    }
  }
  const pageSectionId = determineSectionUrlHash(headingMdx.anchor)
  const { pageSectionTitle } = headingMdx

  const titleParsed = parseTitle(pageSectionTitle)
  assert(pageSectionId === null || pageSectionId.length > 0)
  const headingId = pageSectionId === null ? '' : ` id="${pageSectionId}"`
  const headingHtml = `<h${pageSectionLevel}${headingId}>${titleParsed}</h${pageSectionLevel}>`

  const pageSection = { pageSectionLevel, pageSectionTitle, pageSectionId, headingHtml }
  return pageSection
}

function parseTitle(titleMarkdown: string): string {
  type Part = { nodeType: 'text' | 'code'; content: string }
  const parts: Part[] = []
  let current: Part | undefined
  titleMarkdown.split('').forEach((letter) => {
    if (letter === '`') {
      if (current?.nodeType === 'code') {
        // </code>
        parts.push(current)
        current = undefined
      } else {
        // <code>
        if (current) {
          parts.push(current)
        }
        current = { nodeType: 'code', content: '' }
      }
    } else {
      if (!current) {
        current = { nodeType: 'text', content: '' }
      }
      current.content += letter
    }
  })
  if (current) {
    parts.push(current)
  }

  const titleHtml = parts
    .map((part) => {
      if (part.nodeType === 'code') {
        return `<code>${serializeText(part.content)}</code>`
      } else {
        assert(part.nodeType === 'text', { parts })
        return serializeText(part.content)
      }
    })
    .join('')

  return titleHtml

  function serializeText(text: string) {
    let textEscaped = text.split("'").join("\\'")
    // https://github.com/brillout/docpress/pull/2
    if (isWindows()) {
      textEscaped = textEscaped.replace(/\r/, '')
    }
    return `{'${textEscaped}'}`
  }
}

function isWindows() {
  return os.platform() === 'win32'
}
