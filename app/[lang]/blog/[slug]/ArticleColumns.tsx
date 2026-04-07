'use client'

import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { prepare, layout } from '@chenglou/pretext'

interface Props {
  paragraphs: string[]
  viewportHeight: number
}

interface ViewportSnapshot {
  width: number
}

interface LayoutState {
  columns: number[][]
  colWidth: number
  gap: number
}

const COLUMN_CONTROLS_HEIGHT = 60

let cachedViewportSnapshot: ViewportSnapshot | null = null

function subscribeToViewport(callback: () => void) {
  if (typeof window === 'undefined') return () => {}

  window.addEventListener('resize', callback)
  return () => window.removeEventListener('resize', callback)
}

function getViewportSnapshot(): ViewportSnapshot | null {
  if (typeof window === 'undefined') return null

  const nextWidth = window.innerWidth

  if (cachedViewportSnapshot && cachedViewportSnapshot.width === nextWidth) {
    return cachedViewportSnapshot
  }

  cachedViewportSnapshot = {
    width: nextWidth,
  }

  return cachedViewportSnapshot
}

function createLayoutState(
  paragraphs: string[],
  viewport: ViewportSnapshot,
  viewportHeight: number,
): LayoutState {
  const vw = viewport.width
  const padding = 40

  let containerWidth: number
  let colsVisible: number

  if (vw < 640) {
    containerWidth = vw - padding
    colsVisible = 1
  } else if (vw < 1024) {
    containerWidth = Math.min(720 - padding, vw - padding)
    colsVisible = 2
  } else {
    containerWidth = Math.min(1080 - padding, vw - padding)
    colsVisible = 3
  }

  const gap = 32
  const colWidth = (containerWidth - (colsVisible - 1) * gap) / colsVisible
  const colHeight = Math.max(0, viewportHeight - 8)

  const font = '18px Georgia'
  const lineHeight = 26
  const paraSpacing = 14

  const columns: number[][] = [[]]
  let currentH = 0

  try {
    for (let i = 0; i < paragraphs.length; i++) {
      const prepared = prepare(paragraphs[i], font)
      // Small width reduction to buffer for text-indent and justify variance
      const result = layout(prepared, colWidth - 6, lineHeight)
      let pH = result.height + paraSpacing
      // Extra space for drop cap on first paragraph of the article
      if (i === 0) pH += 32

      if (currentH + pH > colHeight && columns[columns.length - 1].length > 0) {
        columns.push([])
        currentH = 0
      }

      columns[columns.length - 1].push(i)
      currentH += pH
    }
  } catch {
    // OffscreenCanvas 2D context may be unavailable on some browsers.
    // Falling back to one paragraph per column guarantees nothing clips.
    columns.length = 0
    for (let i = 0; i < paragraphs.length; i++) columns.push([i])
  }

  return { columns, colWidth, gap }
}

function ArrowLeftIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.5 3.5 6 8l4.5 4.5" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5.5 3.5 10 8l-4.5 4.5" />
    </svg>
  )
}

export function ArticleColumns({ paragraphs, viewportHeight }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canGoLeft, setCanGoLeft] = useState(false)
  const [canGoRight, setCanGoRight] = useState(false)
  const scrollViewportHeight = Math.max(0, viewportHeight - COLUMN_CONTROLS_HEIGHT)
  const viewport = useSyncExternalStore(subscribeToViewport, getViewportSnapshot, () => null)
  const state = useMemo(() => {
    if (!viewport) return null
    return createLayoutState(paragraphs, viewport, scrollViewportHeight)
  }, [paragraphs, scrollViewportHeight, viewport])
  const updateScrollButtons = useEffectEvent(() => {
    const node = scrollRef.current
    if (!node) return

    const maxScrollLeft = Math.max(0, node.scrollWidth - node.clientWidth)
    setCanGoLeft(node.scrollLeft > 1)
    setCanGoRight(node.scrollLeft < maxScrollLeft - 1)
  })
  const columns = state?.columns ?? []
  const colWidth = state?.colWidth ?? 0
  const gap = state?.gap ?? 0
  const totalWidth = columns.length * colWidth + Math.max(0, columns.length - 1) * gap

  useLayoutEffect(() => {
    if (!state) return

    const node = scrollRef.current
    if (!node) return

    const maxScrollLeft = Math.max(0, node.scrollWidth - node.clientWidth)
    if (node.scrollLeft > maxScrollLeft) {
      node.scrollLeft = maxScrollLeft
    }

    updateScrollButtons()
  }, [scrollViewportHeight, state, totalWidth])

  useEffect(() => {
    if (!state) return

    const node = scrollRef.current
    if (!node) return

    updateScrollButtons()

    const handleScroll = () => {
      updateScrollButtons()
    }

    node.addEventListener('scroll', handleScroll, { passive: true })

    if (typeof ResizeObserver === 'undefined') {
      return () => node.removeEventListener('scroll', handleScroll)
    }

    const observer = new ResizeObserver(() => {
      updateScrollButtons()
    })

    observer.observe(node)

    return () => {
      node.removeEventListener('scroll', handleScroll)
      observer.disconnect()
    }
  }, [state, totalWidth])

  // SSR / pre-hydration fallback
  if (!state) {
    return (
      <div className="article-body-fallback">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    )
  }

  function scrollByColumn(direction: -1 | 1) {
    const node = scrollRef.current
    if (!node) return

    const delta = direction * (colWidth + gap)
    node.scrollTo({
      left: node.scrollLeft + delta,
      behavior: 'smooth',
    })
  }

  return (
    <div className="article-columns-shell">
      <div className="article-scroll-controls">
        <button
          type="button"
          className="article-scroll-arrow"
          onClick={() => scrollByColumn(-1)}
          aria-label="Previous column"
          disabled={!canGoLeft}
        >
          <ArrowLeftIcon />
        </button>

        <button
          type="button"
          className="article-scroll-arrow"
          onClick={() => scrollByColumn(1)}
          aria-label="Next column"
          disabled={!canGoRight}
        >
          <ArrowRightIcon />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="article-scroll"
        style={{ height: scrollViewportHeight }}
      >
        <div className="article-columns" style={{ width: totalWidth }}>
          {columns.map((colIndices, ci) => (
            <div
              key={ci}
              className={`article-column${ci > 0 ? ' article-column-ruled' : ''}`}
              style={{ width: colWidth, minWidth: colWidth }}
            >
              {colIndices.map((pi) => (
                <p key={pi} className={pi === 0 ? 'drop-cap' : undefined}>
                  {paragraphs[pi]}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
