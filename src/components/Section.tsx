import type { ReactNode } from 'react'

interface SectionProps {
  id: string
  kicker: string
  title: string
  children?: ReactNode
}

export function Section({ id, kicker, title, children }: SectionProps) {
  return (
    <section className="page-section" id={id} aria-labelledby={`${id}-heading`}>
      <header className="page-section-header">
        <p className="page-kicker mono">{kicker}</p>
        <h2 id={`${id}-heading`}>{title}</h2>
      </header>
      <div className="page-section-body">{children}</div>
    </section>
  )
}
