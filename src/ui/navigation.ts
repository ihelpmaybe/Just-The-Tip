export type PageView =
  | 'main'
  | 'live'
  | 'settings'
  | 'menu'
  | 'obs'

const PAGE_VIEWS: PageView[] = [
  'main',
  'live',
  'settings',
  'menu',
  'obs',
]

export function pageFromHash(): PageView {
  const h = (location.hash || '').replace(/^#\/?/, '').toLowerCase()
  // Pools merged into Go live — keep old hashes working.
  if (
    h === 'live' ||
    h === 'go-live' ||
    h === 'watch' ||
    h === 'pools' ||
    h === 'pool'
  ) {
    return 'live'
  }
  if (h === 'settings') return 'settings'
  // Tip menu 2/3 are gone — send old links to Tip menu.
  if (
    h === 'menu' ||
    h === 'menu2' ||
    h === 'menu-2' ||
    h === 'menu3' ||
    h === 'menu-3'
  ) {
    return 'menu'
  }
  if (h === 'obs') return 'obs'
  return 'main'
}

function applyHash(page: PageView) {
  const next = page === 'main' ? '' : `#${page}`
  const cur = location.hash || ''
  if (page === 'main') {
    if (cur) {
      history.replaceState(null, '', `${location.pathname}${location.search}`)
    }
    return
  }
  if (cur !== next) {
    history.replaceState(
      null,
      '',
      `${location.pathname}${location.search}${next}`,
    )
  }
}

export type PageNavigationOptions = {
  root: ParentNode
  pageMain: HTMLElement
  pageLive: HTMLElement
  pageSettings: HTMLElement
  pageMenu: HTMLElement
  pageObs: HTMLElement
  menuButton: HTMLButtonElement
  drawer: HTMLElement
  drawerScrim: HTMLElement
  onPage: (page: PageView) => void
  onDrawerChange?: (open: boolean) => void
}

/**
 * Owns hash, drawer, page visibility, and page chrome. Feature panes stay in
 * app.ts and receive a single `onPage` callback when they become active.
 */
export function createPageNavigation(options: PageNavigationOptions) {
  let current = pageFromHash()
  let drawerOpen = false
  let syncingHash = false

  const foundPageTag = options.root.querySelector<HTMLElement>('#page-tag')
  if (!foundPageTag) throw new Error('#page-tag missing')
  const pageTag: HTMLElement = foundPageTag

  function setDrawerOpen(open: boolean) {
    drawerOpen = open
    options.drawer.hidden = !open
    options.drawerScrim.hidden = !open
    options.menuButton.setAttribute('aria-expanded', open ? 'true' : 'false')
    options.menuButton.classList.toggle('open', open)
    document.body.classList.toggle('drawer-open', open)
    options.onDrawerChange?.(open)
  }

  function showPage(next: PageView, opts?: { fromHash?: boolean }) {
    if (!PAGE_VIEWS.includes(next)) next = 'main'
    current = next
    setDrawerOpen(false)
    options.pageMain.hidden = next !== 'main'
    options.pageLive.hidden = next !== 'live'
    options.pageSettings.hidden = next !== 'settings'
    options.pageMenu.hidden = next !== 'menu'
    options.pageObs.hidden = next !== 'obs'
    document.body.classList.toggle('view-live', next === 'live')
    document.body.classList.toggle('view-menu', next === 'menu')
    document.body.classList.toggle('view-settings', next === 'settings')
    document.body.classList.toggle('view-obs', next === 'obs')

    const title =
      next === 'main'
        ? 'Home'
        : next === 'live'
          ? ''
          : next === 'settings'
            ? 'Settings'
            : next === 'obs'
              ? 'Stream alerts'
              : 'Tip menu'
    pageTag.textContent = title
    pageTag.hidden = !title
    options.menuButton.setAttribute('aria-label', 'Menu')
    options.menuButton.title = 'Menu'
    options.onPage(next)

    if (!opts?.fromHash) {
      syncingHash = true
      applyHash(next)
      syncingHash = false
    } else if (
      next === 'live' &&
      /^#\/?(pools|pool|go-live|watch)$/i.test(location.hash || '')
    ) {
      // Quietly canonicalize aliases once the live page is shown.
      syncingHash = true
      applyHash('live')
      syncingHash = false
    } else if (
      next === 'menu' &&
      /^#\/?(menu2|menu-2|menu3|menu-3)$/i.test(location.hash || '')
    ) {
      syncingHash = true
      applyHash('menu')
      syncingHash = false
    }
    window.scrollTo({ top: 0, behavior: opts?.fromHash ? 'auto' : 'smooth' })
  }

  return {
    get current() {
      return current
    },
    get drawerOpen() {
      return drawerOpen
    },
    get syncingHash() {
      return syncingHash
    },
    setDrawerOpen,
    showPage,
  }
}
