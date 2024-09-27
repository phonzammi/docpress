export { onRenderClient }

import React, { useEffect } from 'react'
import type { PageContextClient } from 'vike/types'
import ReactDOM from 'react-dom/client'
import { PageContextResolved } from '../config/resolvePageContext'
import { getPageElement } from './getPageElement'
import {
  hideNavigationFullScreen,
  initNavigationFullscreen,
} from '../navigation/navigation-fullscreen/initNavigationFullscreen'
import { hideMobileNavigation, initMobileNavigation } from '../navigation/initMobileNavigation'
import { initPressKit } from '../navigation/initPressKit'
import '../css/index.css'
import { autoScrollNav } from '../autoScrollNav'
import { installSectionUrlHashs } from '../installSectionUrlHashs'
import { addFeatureClickHandlers, addTwitterWidgets } from '../components/FeatureList/FeatureList.client'

addEcosystemStamp()
initOnLinkClick()

let root: ReactDOM.Root
let renderPromiseResolve: () => void
async function onRenderClient(pageContext: PageContextClient) {
  // TODO: stop using any
  const pageContextResolved: PageContextResolved = (pageContext as any).pageContextResolved
  const renderPromise = new Promise<void>((r) => {
    renderPromiseResolve = r
  })
  let page = getPageElement(pageContext, pageContextResolved)
  page = <OnRenderDoneHook>{page}</OnRenderDoneHook>
  const container = document.getElementById('page-view')!
  if (pageContext.isHydration) {
    root = ReactDOM.hydrateRoot(container, page)
  } else {
    if (!root) {
      root = ReactDOM.createRoot(container)
    }
    root.render(page)
  }
  if (!pageContext.isHydration) {
    applyHead(pageContext)
  }
  await renderPromise
}

function applyHead(pageContext: PageContextClient) {
  // TODO: stop using any
  const pageContextResolved: PageContextResolved = (pageContext as any).pageContextResolved
  document.title = pageContextResolved.documentTitle
}

function onRenderDone() {
  autoScrollNav()
  installSectionUrlHashs()
  initNavigationFullscreen()
  initMobileNavigation()
  initPressKit()
  addFeatureClickHandlers()
  addTwitterWidgets()
  setHydrationIsFinished()
  renderPromiseResolve()
}

function OnRenderDoneHook({ children }: { children: React.ReactNode }) {
  useEffect(onRenderDone)
  return children
}

function initOnLinkClick() {
  document.addEventListener('click', (ev) => {
    const linkTag = findLinkTag(ev.target as HTMLElement)
    if (!linkTag) return
    const url = linkTag.getAttribute('href')
    if (!url) return
    hideMobileNavigation()
    hideNavigationFullScreen()
  })
}
function findLinkTag(target: HTMLElement): null | HTMLElement {
  while (target.tagName !== 'A') {
    const { parentNode } = target
    if (!parentNode) {
      return null
    }
    target = parentNode as HTMLElement
  }
  return target
}

function setHydrationIsFinished() {
  // Used by:
  // - https://github.com/vikejs/vike/blob/9d67f3dd4bdfb38c835186b8147251e0e3b06657/docs/.testRun.ts#L22
  // - https://github.com/brillout/telefunc/blob/57c942c15b7795cfda96b5106acc9e098aa509aa/docs/.testRun.ts#L26
  ;(window as any).__docpress_hydrationFinished = true
}

// Used by:
// - https://github.com/vikejs/vike/blob/87cca54f30b3c7e71867763d5723493d7eef37ab/vike/client/client-routing-runtime/prefetch.ts#L309-L312
function addEcosystemStamp() {
  ;(window as any)._isBrilloutDocpress = true
}
