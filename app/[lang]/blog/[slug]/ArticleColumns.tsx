'use client'

import {
  forwardRef,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { prepare, layout } from '@chenglou/pretext'
import type { Block } from '../articles'

interface Props {
  blocks: Block[]
  viewportHeight: number
  onNavigationStateChange?: (state: NavigationState) => void
}

interface NavigationState {
  canGoLeft: boolean
  canGoRight: boolean
}

interface ViewportSnapshot {
  width: number
}

type Column =
  | { type: 'text'; blockIndices: number[] }
  | { type: 'image'; blockIndex: number }

interface LayoutState {
  columns: Column[]
  columnStarts: number[]
  colWidth: number
  gap: number
  colHeight: number
  totalWidth: number
}

// Image slot height is capped at this fraction of the column height so a
// single image can never dominate or overflow its column. When the natural
// aspect ratio at the chosen slot width would exceed this, the image is
// rendered at the full slot width and clamped height with object-fit: cover.
const MAX_IMAGE_HEIGHT_RATIO = 0.7

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

function computeColumnStarts(count: number, colWidth: number, gap: number): number[] {
  const starts: number[] = []
  for (let i = 0; i < count; i++) {
    starts.push(i * (colWidth + gap))
  }
  return starts
}

function createLayoutState(
  blocks: Block[],
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

  const firstTextIndex = blocks.findIndex((b) => b.type === 'text')

  const columns: Column[] = []
  let currentText: { type: 'text'; blockIndices: number[] } | null = null
  let currentH = 0

  function startTextColumn(): { type: 'text'; blockIndices: number[] } {
    const col: { type: 'text'; blockIndices: number[] } = { type: 'text', blockIndices: [] }
    columns.push(col)
    currentText = col
    currentH = 0
    return col
  }

  try {
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      if (block.type === 'text') {
        const prepared = prepare(block.text, font)
        // Small width reduction to buffer for text-indent and justify variance
        const result = layout(prepared, colWidth - 6, lineHeight)
        let h = result.height + paraSpacing
        // Extra space for drop cap on the first text block of the article
        if (i === firstTextIndex) h += 32

        const target = currentText ?? startTextColumn()
        if (currentH + h > colHeight && target.blockIndices.length > 0) {
          const next = startTextColumn()
          next.blockIndices.push(i)
          currentH = h
        } else {
          target.blockIndices.push(i)
          currentH += h
        }
      } else {
        // Image gets its own dedicated column. Close the running text column.
        currentText = null
        currentH = 0
        columns.push({ type: 'image', blockIndex: i })
      }
    }
  } catch {
    // OffscreenCanvas 2D context may be unavailable on some browsers.
    // Fall back to one block per column — never clips, may waste space.
    columns.length = 0
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      if (block.type === 'image') {
        columns.push({ type: 'image', blockIndex: i })
      } else {
        columns.push({ type: 'text', blockIndices: [i] })
      }
    }
  }

  if (columns.length === 0) {
    columns.push({ type: 'text', blockIndices: [] })
  }

  const columnStarts = computeColumnStarts(columns.length, colWidth, gap)
  const totalWidth = columnStarts[columns.length - 1] + colWidth

  return { columns, columnStarts, colWidth, gap, colHeight, totalWidth }
}

export interface ArticleColumnsHandle {
  scrollByColumn: (direction: -1 | 1) => void
}

export const ArticleColumns = forwardRef<ArticleColumnsHandle, Props>(function ArticleColumns(
  { blocks, viewportHeight, onNavigationStateChange }: Props,
  ref,
) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canGoLeft, setCanGoLeft] = useState(false)
  const [canGoRight, setCanGoRight] = useState(false)
  const viewport = useSyncExternalStore(subscribeToViewport, getViewportSnapshot, () => null)
  const state = useMemo(() => {
    if (!viewport) return null
    return createLayoutState(blocks, viewport, viewportHeight)
  }, [blocks, viewport, viewportHeight])
  const updateScrollButtons = useEffectEvent(() => {
    const node = scrollRef.current
    if (!node) return

    const maxScrollLeft = Math.max(0, node.scrollWidth - node.clientWidth)
    setCanGoLeft(node.scrollLeft > 1)
    setCanGoRight(node.scrollLeft < maxScrollLeft - 1)
  })
  const columns = state?.columns ?? []
  const columnStarts = state?.columnStarts ?? []
  const colWidth = state?.colWidth ?? 0
  const totalWidth = state?.totalWidth ?? 0
  const firstTextIndex = useMemo(() => blocks.findIndex((b) => b.type === 'text'), [blocks])

  useLayoutEffect(() => {
    if (!state) return

    const node = scrollRef.current
    if (!node) return

    const maxScrollLeft = Math.max(0, node.scrollWidth - node.clientWidth)
    if (node.scrollLeft > maxScrollLeft) {
      node.scrollLeft = maxScrollLeft
    }

    updateScrollButtons()
  }, [state, totalWidth, viewportHeight])

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

  useImperativeHandle(
    ref,
    () => ({
      scrollByColumn(direction) {
        const node = scrollRef.current
        if (!node || columnStarts.length === 0) return

        const current = node.scrollLeft
        const maxScroll = Math.max(0, node.scrollWidth - node.clientWidth)
        let target: number
        if (direction === 1) {
          const next = columnStarts.find((s) => s > current + 1)
          target = next ?? maxScroll
        } else {
          let prev = 0
          for (const s of columnStarts) {
            if (s < current - 1) prev = s
          }
          target = prev
        }

        target = Math.min(Math.max(0, target), maxScroll)
        node.scrollTo({ left: target, behavior: 'smooth' })
      },
    }),
    [columnStarts],
  )

  useEffect(() => {
    onNavigationStateChange?.({
      canGoLeft: state ? canGoLeft : false,
      canGoRight: state ? canGoRight : false,
    })
  }, [canGoLeft, canGoRight, onNavigationStateChange, state])

  // SSR / pre-hydration fallback: render blocks in normal flow.
  if (!state) {
    return (
      <div className="article-body-fallback">
        {blocks.map((block, i) => {
          if (block.type === 'text') {
            return (
              <p key={i} className={i === firstTextIndex ? 'drop-cap' : undefined}>
                {block.text}
              </p>
            )
          }
          return (
            <figure key={i} className="article-figure article-figure--standard">
              <img src={block.src} alt={block.alt} width={block.width} height={block.height} />
            </figure>
          )
        })}
      </div>
    )
  }

  return (
    <div className="article-columns-shell">
      <div
        ref={scrollRef}
        className="article-scroll"
        style={{ height: viewportHeight }}
      >
        <div className="article-columns" style={{ width: totalWidth }}>
          <div className="article-columns-end-snap" aria-hidden />
          {columns.map((col, ci) => {
            const ruled = ci > 0
            return (
              <div
                key={ci}
                className={`article-column${ruled ? ' article-column-ruled' : ''}`}
                style={{ width: colWidth, minWidth: colWidth }}
              >
                {col.type === 'text'
                  ? col.blockIndices.map((bi) => {
                      const block = blocks[bi]
                      if (block.type !== 'text') return null
                      return (
                        <p
                          key={bi}
                          className={bi === firstTextIndex ? 'drop-cap' : undefined}
                        >
                          {block.text}
                        </p>
                      )
                    })
                  : (() => {
                      const block = blocks[col.blockIndex]
                      if (block.type !== 'image') return null
                      const naturalHeight = colWidth * (block.height / block.width)
                      const slotHeight = Math.min(
                        naturalHeight,
                        MAX_IMAGE_HEIGHT_RATIO * (state?.colHeight ?? 0),
                      )
                      return (
                        <figure
                          className="article-figure"
                          style={{ height: slotHeight }}
                        >
                          <img src={block.src} alt={block.alt} />
                        </figure>
                      )
                    })()}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
})
