'use client'

import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import {
  ArticleColumns,
  type ArticleColumnsHandle,
} from './ArticleColumns'

// Column icon (3 vertical bars)
function ColumnsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="3" y1="3" x2="3" y2="15" />
      <line x1="9" y1="3" x2="9" y2="15" />
      <line x1="15" y1="3" x2="15" y2="15" />
    </svg>
  )
}

// Standard view icon (horizontal lines)
function StandardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="3" y1="4" x2="15" y2="4" />
      <line x1="3" y1="8" x2="15" y2="8" />
      <line x1="3" y1="12" x2="12" y2="12" />
    </svg>
  )
}

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 3.5 6 8l4.5 4.5" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.5 3.5 10 8l-4.5 4.5" />
    </svg>
  )
}

interface Props {
  paragraphs: string[]
}

const STORAGE_KEY = 'article-view-mode'
const MOBILE_MEDIA_QUERY = '(max-width: 639px)'
const COLUMN_VIEWPORT_BOTTOM_GUTTER = 8
const MIN_COLUMN_VIEWPORT_HEIGHT = 320

function getStoredMode(): 'columns' | 'standard' {
  if (typeof window === 'undefined') return 'columns'
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'standard' ? 'standard' : 'columns'
}

function subscribeToSmallScreen(callback: () => void) {
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

function getIsSmallScreen() {
  if (typeof window === 'undefined') return false
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches
}

function getAvailableViewportHeight(element: HTMLElement | null) {
  if (typeof window === 'undefined' || !element) return null

  const { top } = element.getBoundingClientRect()
  return Math.max(
    0,
    Math.floor(window.innerHeight - top - COLUMN_VIEWPORT_BOTTOM_GUTTER),
  )
}

export function ArticleView({ paragraphs }: Props) {
  const columnsRef = useRef<ArticleColumnsHandle | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [preferredMode, setPreferredMode] = useState<'columns' | 'standard'>(getStoredMode)
  const [columnViewportHeight, setColumnViewportHeight] = useState<number | null>(null)
  const [canGoLeft, setCanGoLeft] = useState(false)
  const [canGoRight, setCanGoRight] = useState(false)
  const isSmallScreen = useSyncExternalStore(subscribeToSmallScreen, getIsSmallScreen, () => false)
  const updateColumnViewportHeight = useEffectEvent(() => {
    setColumnViewportHeight(getAvailableViewportHeight(contentRef.current))
  })

  useLayoutEffect(() => {
    updateColumnViewportHeight()
  }, [isSmallScreen])

  useEffect(() => {
    if (typeof window === 'undefined') return

    updateColumnViewportHeight()

    const handleResize = () => {
      updateColumnViewportHeight()
    }

    window.addEventListener('resize', handleResize)

    if (typeof ResizeObserver === 'undefined') {
      return () => window.removeEventListener('resize', handleResize)
    }

    const observer = new ResizeObserver(() => {
      updateColumnViewportHeight()
    })

    if (contentRef.current) observer.observe(contentRef.current)
    if (contentRef.current?.parentElement) observer.observe(contentRef.current.parentElement)

    return () => {
      window.removeEventListener('resize', handleResize)
      observer.disconnect()
    }
  }, [])

  const isHeightConstrained =
    columnViewportHeight !== null &&
    columnViewportHeight < MIN_COLUMN_VIEWPORT_HEIGHT
  const mode =
    isSmallScreen || isHeightConstrained || columnViewportHeight === null
      ? 'standard'
      : preferredMode
  const showTopControls =
    !isSmallScreen && !isHeightConstrained && columnViewportHeight !== null

  function toggleMode() {
    const next = preferredMode === 'columns' ? 'standard' : 'columns'
    setPreferredMode(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  return (
    <>
      {showTopControls ? (
        <div className="view-toggle">
          {mode === 'columns' ? (
            <div className="view-toggle-controls">
              <button
                type="button"
                className="article-scroll-arrow"
                onClick={() => columnsRef.current?.scrollByColumn(-1)}
                aria-label="Previous column"
                disabled={!canGoLeft}
              >
                <ArrowLeftIcon />
              </button>

              <button
                type="button"
                className="article-scroll-arrow"
                onClick={() => columnsRef.current?.scrollByColumn(1)}
                aria-label="Next column"
                disabled={!canGoRight}
              >
                <ArrowRightIcon />
              </button>
            </div>
          ) : null}

          <button
            onClick={toggleMode}
            className="view-toggle-btn"
            title={mode === 'columns' ? 'Standard view' : 'Column view'}
            aria-label={mode === 'columns' ? 'Switch to standard view' : 'Switch to column view'}
          >
            {mode === 'columns' ? <StandardIcon /> : <ColumnsIcon />}
          </button>
        </div>
      ) : null}

      <hr className="article-rule" />

      <div ref={contentRef}>
        {mode === 'standard' ? (
          <div className="article-standard">
            {paragraphs.map((p, i) => (
              <p key={i} className={i === 0 ? 'drop-cap' : undefined}>
                {p}
              </p>
            ))}
          </div>
        ) : (
          <ArticleColumns
            ref={columnsRef}
            paragraphs={paragraphs}
            viewportHeight={columnViewportHeight!}
            onNavigationStateChange={({ canGoLeft, canGoRight }) => {
              setCanGoLeft(canGoLeft)
              setCanGoRight(canGoRight)
            }}
          />
        )}
      </div>
    </>
  )
}
