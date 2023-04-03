import { assert } from './utils/client'

autoScrollNav()

function autoScrollNav() {
  const navigationEl = document.getElementById('navigation-content-main')
  assert(navigationEl)
  const href = window.location.pathname
  const navLinks: HTMLElement[] = Array.from(navigationEl.querySelectorAll(`a[href="${href}"]`))
  assert(navLinks.length <= 1, { navLinks, href })
  const navLink = navLinks[0]
  if (!navLink) return
  navLink.scrollIntoView({
    /*
    behavior: 'smooth',
    /*/
    behavior: 'auto',
    //*/
    block: 'center',
    inline: 'center'
  })
}
