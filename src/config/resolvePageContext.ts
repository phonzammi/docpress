import { assert, jsxToTextContent, objectAssign } from '../utils/server'
import { getHeadings, HeadingWithoutLink, parseTitle } from '../headings'
import type { Heading } from '../headings'
import type { PageContextBuiltIn } from 'vite-plugin-ssr'
import type { MarkdownHeading } from '../markdownHeadingsVitePlugin'
import type { Config } from './Config'
import { getConfig } from './getConfig'

export { resolvePageContext }
export type { PageContextOriginal }
export type { PageContextResolved }
export type { Heading }

type ReactComponent = () => JSX.Element
type Exports = {
  headings?: MarkdownHeading[]
}
type PageContextOriginal = PageContextBuiltIn & {
  Page: ReactComponent
  exports: Exports
}
type PageContextResolved = ReturnType<typeof resolvePageContext>

function resolvePageContext(pageContext: PageContextOriginal) {
  const config = getConfig()
  const { headings, headingsWithoutLink } = getHeadings(config)
  const { activeHeading, activeNavigationHeading } = findHeading(headings, headingsWithoutLink, pageContext)
  const headingsWithSubHeadings = getHeadingsWithSubHeadings(headings, pageContext, activeNavigationHeading)
  const { title, isLandingPage, pageTitle, isDetachedPage } = getMetaData(
    headingsWithoutLink,
    activeNavigationHeading,
    pageContext,
    config
  )
  const { faviconUrl, algolia, tagline, twitterHandle, bannerUrl, websiteUrl } = config
  const pageContextResolved = {}
  objectAssign(pageContextResolved, {
    ...pageContext,
    meta: {
      title,
      faviconUrl,
      twitterHandle,
      bannerUrl,
      websiteUrl,
      tagline,
      algolia
    },
    activeHeading,
    headings,
    headingsWithSubHeadings,
    isLandingPage,
    isDetachedPage,
    pageTitle,
    config
  })
  return pageContextResolved
}

function getMetaData(
  headingsWithoutLink: HeadingWithoutLink[],
  activeNavigationHeading: Heading | null,
  pageContext: { urlOriginal: string; exports: Exports },
  config: Config
) {
  const url = pageContext.urlOriginal

  let title: string
  let pageTitle: string | JSX.Element | null
  let isDetachedPage: boolean
  if (activeNavigationHeading) {
    title = activeNavigationHeading.titleDocument || jsxToTextContent(activeNavigationHeading.title)
    pageTitle = activeNavigationHeading.title
    isDetachedPage = false
  } else {
    pageTitle = headingsWithoutLink.find((h) => h.url === url)!.title
    title = jsxToTextContent(pageTitle)
    isDetachedPage = true
  }

  const isLandingPage = url === '/'
  if (!isLandingPage) {
    title += ' | ' + config.projectInfo.projectName
  }

  if (isLandingPage) {
    pageTitle = null
  }

  return { title, isLandingPage, pageTitle, isDetachedPage }
}

function findHeading(
  headings: Heading[],
  headingsWithoutLink: HeadingWithoutLink[],
  pageContext: { urlOriginal: string; exports: Exports }
): { activeHeading: Heading | HeadingWithoutLink; activeNavigationHeading: Heading | null } {
  let activeNavigationHeading: Heading | null = null
  let activeHeading: Heading | HeadingWithoutLink | null = null
  assert(pageContext.urlOriginal)
  const pageUrl = pageContext.urlOriginal
  headings.forEach((heading) => {
    if (heading.url === pageUrl) {
      activeNavigationHeading = heading
      activeHeading = heading
      assert(heading.level === 2, { pageUrl, heading })
    }
  })
  if (!activeHeading) {
    activeHeading = headingsWithoutLink.find(({ url }) => pageUrl === url) ?? null
  }
  const debugInfo = {
    msg: 'Heading not found for url: ' + pageUrl,
    urls: headings.map((h) => h.url),
    url: pageUrl
  }
  assert(activeHeading, debugInfo)
  return { activeHeading, activeNavigationHeading }
}

function getHeadingsWithSubHeadings(
  headings: Heading[],
  pageContext: { exports: Exports; urlOriginal: string },
  activeNavigationHeading: Heading | null
): Heading[] {
  const headingsWithSubHeadings = headings.slice()
  if (activeNavigationHeading === null) return headingsWithSubHeadings
  const activeHeadingIdx = headingsWithSubHeadings.indexOf(activeNavigationHeading)
  assert(activeHeadingIdx >= 0)
  const pageHeadings = pageContext.exports.headings || []
  pageHeadings.forEach((pageHeading, i) => {
    const title = parseTitle(pageHeading.title)
    const url: null | string = pageHeading.headingId && '#' + pageHeading.headingId
    assert(
      pageHeading.headingLevel !== 3,
      'Wrong page heading level `' +
        pageHeading.headingLevel +
        '` (it should be `<h2>`) for sub-heading `' +
        pageHeading.title +
        '` of page `' +
        pageContext.urlOriginal +
        '`.'
    )
    if (pageHeading.headingLevel === 2) {
      const heading: Heading = {
        url,
        title,
        parentHeadings: [activeNavigationHeading, ...activeNavigationHeading.parentHeadings],
        titleInNav: title,
        level: 3
      }
      headingsWithSubHeadings.splice(activeHeadingIdx + 1 + i, 0, heading)
    }
  })

  if (activeNavigationHeading?.sectionTitles) {
    activeNavigationHeading.sectionTitles.forEach((sectionTitle) => {
      const pageHeadingTitles = pageHeadings.map((h) => h.title)
      assert(pageHeadingTitles.includes(sectionTitle), { pageHeadingTitles, sectionTitle })
    })
  }

  return headingsWithSubHeadings
}
