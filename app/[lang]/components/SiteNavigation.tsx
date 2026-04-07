'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ViewTransition, useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react'
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

export function SiteNavigation({ lang, placement }: Props) {
  const pathname = usePathname()
  const navRef = useRef<HTMLElement | null>(null)
  const itemRefs = useRef<Partial<Record<NavKey, HTMLAnchorElement | null>>>({})
  const [hoveredKey, setHoveredKey] = useState<NavKey | null>(null)
  const [indicator, setIndicator] = useState<IndicatorState>({
    left: 0,
    width: 0,
    opacity: 0,
  })

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
    updateIndicator(indicatorKey)
  }, [indicatorKey])

  useEffect(() => {
    const nav = navRef.current
    if (!nav || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => {
      updateIndicator(indicatorKey)
    })

    observer.observe(nav)
    return () => observer.disconnect()
  }, [indicatorKey])

  return (
    <div className={`site-nav-shell site-nav-shell--${placement}`}>
      <ViewTransition name="site-navigation" default="none" share="nav-share">
        <nav
          ref={navRef}
          className="site-nav"
          aria-label="Primary"
          onPointerLeave={() => setHoveredKey(null)}
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
                  onClick={(event) => event.preventDefault()}
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
