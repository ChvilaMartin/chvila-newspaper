'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ViewTransition,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import type { Locale } from '../dictionaries'

type Placement = 'home' | 'top'
type NavKey = 'home' | 'about' | 'blog' | 'uses' | 'contact'

interface Props {
  lang: Locale
  placement: Placement
}

interface IndicatorState {
  left: number
  width: number
  opacity: number
}

type NavItem =
  | { key: NavKey; label: string; kind: 'route'; href: string }
  | { key: NavKey; label: string; kind: 'placeholder'; href: '#' }

const NAV_TRANSITION_TYPES = ['site-nav']
const MOBILE_MEDIA_QUERY = '(max-width: 720px)'

function subscribeToMobileNavigation(callback: () => void) {
  if (typeof window === 'undefined') return () => {}

  const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY)
  const handleChange = () => callback()

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }

  mediaQuery.addListener(handleChange)
  return () => mediaQuery.removeListener(handleChange)
}

function getIsMobileNavigation() {
  if (typeof window === 'undefined') return false
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches
}

export function SiteNavigation({ lang, placement }: Props) {
  const pathname = usePathname()
  const navRef = useRef<HTMLElement | null>(null)
  const itemRefs = useRef<Partial<Record<NavKey, HTMLAnchorElement | null>>>({})
  const [hoveredKey, setHoveredKey] = useState<NavKey | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [indicator, setIndicator] = useState<IndicatorState>({
    left: 0,
    width: 0,
    opacity: 0,
  })
  const isMobileNavigation = useSyncExternalStore(
    subscribeToMobileNavigation,
    getIsMobileNavigation,
    () => false,
  )

  const activeKey: NavKey = pathname?.includes('/blog') ? 'blog' : 'home'
  const indicatorKey = hoveredKey ?? activeKey

  const items: NavItem[] = [
    { key: 'home', label: 'Home', kind: 'route', href: `/${lang}` },
    { key: 'about', label: 'About', kind: 'placeholder', href: '#' },
    { key: 'blog', label: 'Blog', kind: 'route', href: `/${lang}/blog` },
    { key: 'uses', label: 'Uses', kind: 'placeholder', href: '#' },
    { key: 'contact', label: 'Contact', kind: 'placeholder', href: '#' },
  ]

  const updateIndicator = useEffectEvent((key: NavKey) => {
    const nav = navRef.current
    const item = itemRefs.current[key]

    if (!nav || !item) {
      setIndicator((current) => ({ ...current, opacity: 0 }))
      return
    }

    const navBox = nav.getBoundingClientRect()
    const itemBox = item.getBoundingClientRect()

    setIndicator({
      left: itemBox.left - navBox.left,
      width: itemBox.width,
      opacity: 1,
    })
  })

  useLayoutEffect(() => {
    if (isMobileNavigation) return
    updateIndicator(indicatorKey)
  }, [indicatorKey, isMobileNavigation])

  useEffect(() => {
    if (isMobileNavigation) return

    const nav = navRef.current
    if (!nav || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => {
      updateIndicator(indicatorKey)
    })

    observer.observe(nav)
    return () => observer.disconnect()
  }, [indicatorKey, isMobileNavigation])

  function handleNavItemClick() {
    if (isMobileNavigation) {
      setIsMobileMenuOpen(false)
    }
  }

  return (
    <div
      className={[
        'site-nav-shell',
        `site-nav-shell--${placement}`,
        isMobileMenuOpen ? 'is-mobile-open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        className="site-nav-mobile-toggle"
        aria-expanded={isMobileMenuOpen}
        aria-controls={`site-nav-${placement}`}
        onClick={() => setIsMobileMenuOpen((open) => !open)}
      >
        Menu
      </button>

      <ViewTransition name="site-navigation" default="none" share="nav-share">
        <nav
          id={`site-nav-${placement}`}
          ref={navRef}
          className="site-nav"
          aria-label="Primary"
          onPointerLeave={() => setHoveredKey(null)}
          data-mobile-open={isMobileMenuOpen ? 'true' : 'false'}
        >
          <span
            aria-hidden="true"
            className="site-nav-indicator"
            style={{
              transform: `translateX(${indicator.left}px)`,
              width: `${indicator.width}px`,
              opacity: indicator.opacity,
            }}
          />

          {items.map((item) => {
            const className = [
              'site-nav-link',
              item.key === activeKey ? 'is-active' : '',
              item.kind === 'placeholder' ? 'is-placeholder' : '',
            ]
              .filter(Boolean)
              .join(' ')

            if (item.kind === 'placeholder') {
              return (
                <a
                  key={item.key}
                  ref={(node) => {
                    itemRefs.current[item.key] = node
                  }}
                  href={item.href}
                  className={className}
                  onClick={(event) => {
                    event.preventDefault()
                    handleNavItemClick()
                  }}
                  onPointerEnter={() => setHoveredKey(item.key)}
                  onFocus={() => setHoveredKey(item.key)}
                  onBlur={() => setHoveredKey(null)}
                >
                  <span>{item.label}</span>
                </a>
              )
            }

            return (
              <Link
                key={item.key}
                ref={(node) => {
                  itemRefs.current[item.key] = node
                }}
                href={item.href}
                className={className}
                aria-current={item.key === activeKey ? 'page' : undefined}
                transitionTypes={NAV_TRANSITION_TYPES}
                onClick={handleNavItemClick}
                onPointerEnter={() => setHoveredKey(item.key)}
                onFocus={() => setHoveredKey(item.key)}
                onBlur={() => setHoveredKey(null)}
              >
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </ViewTransition>
    </div>
  )
}
