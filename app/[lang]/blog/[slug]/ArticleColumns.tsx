'use client'

import { useMemo, useRef, useSyncExternalStore } from 'react'
import { prepare, layout } from '@chenglou/pretext'

interface Props {
  paragraphs: string[]
}

interface ViewportSnapshot {
  width: number
  height: number
}

interface LayoutState {
  columns: number[][]
  colWidth: number
  gap: number
}

function subscribeToViewport(callback: () => void) {
  if (typeof window === 'undefined') return () => {}

  window.addEventListener('resize', callback)
  return () => window.removeEventListener('resize', callback)
}

function getViewportSnapshot(): ViewportSnapshot | null {
  if (typeof window === 'undefined') return null

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  }
}

function createLayoutState(paragraphs: string[], viewport: ViewportSnapshot): LayoutState {
  const vw = viewport.width
  const vh = viewport.height
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
  const colHeight = vh - 280

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
    // OffscreenCanvas 2D context may be unavailable on some mobile browsers,
    // causing prepare()/layout() to throw. Fall back to one paragraph per
    // visible column slot, cycling through the available columns evenly.
    columns.length = 0
    for (let c = 0; c < colsVisible; c++) columns.push([])
    for (let i = 0; i < paragraphs.length; i++) {
      columns[i % colsVisible].push(i)
    }
  }

  return { columns, colWidth, gap }
}

export function ArticleColumns({ paragraphs }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const viewport = useSyncExternalStore(subscribeToViewport, getViewportSnapshot, () => null)
  const state = useMemo(() => {
    if (!viewport) return null
    return createLayoutState(paragraphs, viewport)
  }, [paragraphs, viewport])

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

  const { columns, colWidth, gap } = state
  const totalWidth = columns.length * colWidth + (columns.length - 1) * gap

  return (
    <div ref={scrollRef} className="article-scroll">
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
  )
}
