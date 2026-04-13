import './StatsOverview.css'

function CardIcon({ icon }) {
  if (icon === 'check') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="M8.8 12.2l2.2 2.2 4.2-4.4" />
      </svg>
    )
  }

  if (icon === 'alert') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4.6 3.8 18.8h16.4z" />
        <path d="M12 9.2v4.8" />
        <circle cx="12" cy="16.9" r="0.85" fill="currentColor" stroke="none" />
      </svg>
    )
  }

  if (icon === 'spark') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.7 14 6.2l3.1-.1.7 3 2.8 1.4-1.4 2.8 1.4 2.8-2.8 1.4-.7 3-3.1-.1L12 22.3l-2.1-2.5-3.1.1-.7-3-2.8-1.4 1.4-2.8-1.4-2.8 2.8-1.4.7-3 3.1.1z" />
        <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
      </svg>
    )
  }

  if (icon === 'rocket') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8.6 15.9c4.9-.6 8.1-3.8 8.7-8.8-4.9.6-8.1 3.8-8.7 8.8Z" />
        <path d="M8.3 16.2 6.1 17.9l.8-3" />
        <path d="M15.1 7.4a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2Z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
    </svg>
  )
}

function StatsCard({ card }) {
  const cardVariant = card?.variant || 'default'
  const badgeTone = card?.badgeTone || 'neutral'

  return (
    <article className={`stats-card variant-${cardVariant}`}>
      <div className="stats-card-head">
        <span className={`card-icon icon-${card?.icon || 'spark'}`}>
          <CardIcon icon={card?.icon} />
        </span>

        {card?.badge ? <span className={`card-badge badge-${badgeTone}`}>{card.badge}</span> : null}
      </div>

      <p className="card-label">{card?.label}</p>
      <p className="card-value">{card?.value}</p>

      {cardVariant === 'highlight' ? <span className="card-decor" aria-hidden="true" /> : null}
    </article>
  )
}

export function StatsOverview({ cards, label }) {
  const metricCards = Array.isArray(cards) ? cards : []

  return (
    <section className="stats-overview" aria-label={label}>
      {metricCards.map((card) => (
        <StatsCard key={card.id} card={card} />
      ))}
    </section>
  )
}
