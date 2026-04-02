'use client'

import { useState } from 'react'
import { ArticleColumns } from './ArticleColumns'

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

interface Props {
  paragraphs: string[]
}

const STORAGE_KEY = 'article-view-mode'

function getStoredMode(): 'columns' | 'standard' {
  if (typeof window === 'undefined') return 'columns'
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'standard' ? 'standard' : 'columns'
}

export function ArticleView({ paragraphs }: Props) {
  const [mode, setMode] = useState<'columns' | 'standard'>(getStoredMode)

  function toggleMode() {
    const next = mode === 'columns' ? 'standard' : 'columns'
    setMode(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  return (
    <>
      <div className="view-toggle">
        <button
          onClick={toggleMode}
          className="view-toggle-btn"
          title={mode === 'columns' ? 'Standard view' : 'Column view'}
          aria-label={mode === 'columns' ? 'Switch to standard view' : 'Switch to column view'}
        >
          {mode === 'columns' ? <StandardIcon /> : <ColumnsIcon />}
        </button>
      </div>

      <hr className="article-rule" />

      {mode === 'standard' ? (
        <div className="article-standard">
          {paragraphs.map((p, i) => (
            <p key={i} className={i === 0 ? 'drop-cap' : undefined}>
              {p}
            </p>
          ))}
        </div>
      ) : (
        <ArticleColumns paragraphs={paragraphs} />
      )}
    </>
  )
}
