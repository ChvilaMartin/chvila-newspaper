'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { prepare, layout } from '@chenglou/pretext'

interface Props {
  paragraphs: string[]
}

export function ArticleColumns({ paragraphs }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<{
    columns: number[][]
    colWidth: number
    gap: number
  } | null>(null)

  const reflow = useCallback(() => {
    const vw = window.innerWidth
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
    const colHeight = window.innerHeight - 280

    const font = '18px Georgia'
    const lineHeight = 26
    const paraSpacing = 14

    const columns: number[][] = [[]]
    let currentH = 0

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

    setState({ columns, colWidth, gap })
  }, [paragraphs])

  useEffect(() => {
    reflow()
    window.addEventListener('resize', reflow)
    return () => window.removeEventListener('resize', reflow)
  }, [reflow])

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
