import { Link } from 'react-router-dom'

/**
 * Visible breadcrumb trail. Last item is the current page (no link).
 * @param {{ items: { name: string, to?: string }[], className?: string }} props
 */
export default function Breadcrumbs({ items = [], className = '' }) {
  const list = (items || []).filter((i) => i && String(i.name || '').trim())
  if (list.length < 2) return null

  return (
    <nav
      aria-label="Хлебные крошки"
      className={`breadcrumbs ${className}`.trim()}
    >
      <ol className="breadcrumbs-list">
        {list.map((item, index) => {
          const isLast = index === list.length - 1
          const name = String(item.name).trim()
          return (
            <li key={`${name}-${index}`} className="breadcrumbs-item">
              {!isLast && item.to ? (
                <Link to={item.to} className="breadcrumbs-link">
                  {name}
                </Link>
              ) : (
                <span className="breadcrumbs-current" aria-current="page">
                  {name}
                </span>
              )}
              {!isLast && (
                <span className="breadcrumbs-sep" aria-hidden="true">
                  →
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
