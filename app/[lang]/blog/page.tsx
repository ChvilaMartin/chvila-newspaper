import { notFound } from 'next/navigation'
import Link from 'next/link'
import { hasLocale } from '../dictionaries'
import { articles } from './articles'

export default async function BlogPage({ params }: PageProps<'/[lang]/blog'>) {
  const { lang } = await params

  if (!hasLocale(lang)) notFound()

  return (
    <div className="page">
      <header>
        <Link href={`/${lang}`} className="back-link">&larr;</Link>
        <h1>Blog</h1>
      </header>

      <ul className="blog-list">
        {articles.map((article) => (
          <li key={article.slug}>
            <Link href={`/${lang}/blog/${article.slug}`}>
              <span className="blog-date">{article.date}</span>
              <span className="blog-title">{article.title[lang]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
