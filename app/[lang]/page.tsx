import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getDictionary, hasLocale } from './dictionaries'

export default async function Page({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params

  if (!hasLocale(lang)) notFound()

  const dict = await getDictionary(lang)
  const switchLang = lang === 'en' ? 'cs' : 'en'

  return (
    <div className="page">
      <header>
        <h1>{dict.title}</h1>
        <p className="intro">
          {dict.description}
        </p>
        <p className="intro-body">
          {renderIntro(dict.intro)}
        </p>
      </header>

      <nav className="lang-switch">
        <Link href={`/${switchLang}`}>{dict.switchLabel}</Link>
      </nav>

      <article>
        <section id="founder">
          <h2>{dict.sections.founder.title}</h2>
          <p>{dict.sections.founder.text}</p>
        </section>

        <section id="engineer">
          <h2>{dict.sections.engineer.title}</h2>
          <p>{dict.sections.engineer.text}</p>
        </section>

        <section id="ai">
          <h2>{dict.sections.ai.title}</h2>
          <p>{dict.sections.ai.text}</p>
        </section>

        <section id="blog">
          <h2>Blog</h2>
          <p>
            <Link href={`/${lang}/blog`}>{lang === 'cs' ? 'Cist clanky' : 'Read articles'} &rarr;</Link>
          </p>
        </section>

        <section id="contact">
          <h2>{dict.sections.contact.title}</h2>
          <p>{dict.sections.contact.text}</p>
        </section>
      </article>
    </div>
  )
}

function renderIntro(text: string) {
  const parts = text.split(/(<\w+>.*?<\/\w+>)/g)
  return parts.map((part, i) => {
    const match = part.match(/<(\w+)>(.*?)<\/\w+>/)
    if (match) {
      const [, id, label] = match
      return (
        <a key={i} href={`#${id}`}>
          {label}
        </a>
      )
    }
    return part
  })
}
