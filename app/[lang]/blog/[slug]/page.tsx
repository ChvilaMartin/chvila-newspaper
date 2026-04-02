import { notFound } from 'next/navigation'
import Link from 'next/link'
import { hasLocale } from '../../dictionaries'
import { articles, getArticleBySlug } from '../articles'
import { ArticleView } from './ArticleView'

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

  const paragraphs = article.paragraphs[lang] ?? article.paragraphs['en']

  return (
    <div className="article-page">
      <nav className="article-nav">
        <Link href={`/${lang}/blog`}>&larr; Blog</Link>
      </nav>

      <header className="article-header">
        <time dateTime={article.date}>{article.date}</time>
        <h1>{article.title[lang]}</h1>
        <p className="article-subtitle">{article.subtitle[lang]}</p>
      </header>

      <ArticleView paragraphs={paragraphs} />
    </div>
  )
}
