import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ViewTransition } from 'react'
import { hasLocale } from '../dictionaries'
import { articles } from './articles'
import { SiteNavigation } from '../components/SiteNavigation'

export default async function BlogPage({ params }: PageProps<'/[lang]/blog'>) {
  const { lang } = await params

  if (!hasLocale(lang)) notFound()

  return (
    <ViewTransition default="none" enter="page-enter" exit="page-exit">
      <div>
        <SiteNavigation lang={lang} placement="top" />

        <div className="page page--top-nav">
          <header>
            <h1>Blog</h1>
          </header>

          <ul className="blog-list">
            {articles.map((article) => (
              <li key={article.slug}>
                <Link href={`/${lang}/blog/${article.slug}`} transitionTypes={['site-nav']}>
                  <span className="blog-date">{article.date}</span>
                  <span className="blog-title">{article.title[lang]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ViewTransition>
  )
}
