import { notFound } from 'next/navigation'
import { ViewTransition } from 'react'
import { hasLocale } from '../../dictionaries'
import { articles, getArticleBySlug } from '../articles'
import { ArticleView } from './ArticleView'
import { SiteNavigation } from '../../components/SiteNavigation'

export async function generateStaticParams() {
  const params: { lang: string; slug: string }[] = []
  for (const article of articles) {
    for (const lang of ['en', 'cs']) {
      params.push({ lang, slug: article.slug })
    }
  }
  return params
}

export default async function ArticlePage({
  params,
}: PageProps<'/[lang]/blog/[slug]'>) {
  const { lang, slug } = await params

  if (!hasLocale(lang)) notFound()

  const article = getArticleBySlug(slug)
  if (!article) notFound()

  const blocks = article.blocks[lang] ?? article.blocks['en']

  return (
    <ViewTransition default="none" enter="page-enter" exit="page-exit">
      <div>
        <SiteNavigation lang={lang} placement="top" />

        <div className="article-page article-page--top-nav">
          <header className="article-header">
            <time dateTime={article.date}>{article.date}</time>
            <h1>{article.title[lang]}</h1>
            <p className="article-subtitle">{article.subtitle[lang]}</p>
          </header>

          <ArticleView blocks={blocks} />
        </div>
      </div>
    </ViewTransition>
  )
}
