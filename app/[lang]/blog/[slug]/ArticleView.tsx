'use client'

import { useState, useSyncExternalStore } from 'react'
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
const MOBILE_MEDIA_QUERY = '(max-width: 639px)'

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

export function ArticleView({ paragraphs }: Props) {
  const [preferredMode, setPreferredMode] = useState<'columns' | 'standard'>(getStoredMode)
  const isSmallScreen = useSyncExternalStore(subscribeToSmallScreen, getIsSmallScreen, () => false)
  const mode = isSmallScreen ? 'standard' : preferredMode

  function toggleMode() {
    const next = preferredMode === 'columns' ? 'standard' : 'columns'
    setPreferredMode(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  return (
    <>
      {!isSmallScreen ? (
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
      ) : null}

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
