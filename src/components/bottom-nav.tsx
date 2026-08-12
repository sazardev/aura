import { useDueCardCount } from '@/state/store'

export type NavTarget = 'home' | 'dictionary' | 'analyzer' | 'review'

interface NavItem {
  target: NavTarget
  label: string
  icon: string
  badge?: number
}

interface BottomNavProps {
  active: NavTarget
  onNavigate: (target: NavTarget) => void
}

export function BottomNav({ active, onNavigate }: BottomNavProps) {
  const dueCount = useDueCardCount()

  const items: NavItem[] = [
    { target: 'home', label: 'Home', icon: '🏠' },
    { target: 'dictionary', label: 'Dictionary', icon: '📖' },
    { target: 'analyzer', label: 'Analyzer', icon: '🧪' },
    { target: 'review', label: 'Review', icon: '🔁', badge: dueCount },
  ]

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {items.map((item) => {
        const isActive = active === item.target
        const classes = ['bottom-nav__item', isActive ? 'bottom-nav__item--active' : '']
          .filter(Boolean)
          .join(' ')
        return (
          <button
            key={item.target}
            type="button"
            className={classes}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onNavigate(item.target)}
          >
            <span className="bottom-nav__icon">
              {item.icon}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bottom-nav__badge">{item.badge}</span>
              )}
            </span>
            <span className="bottom-nav__label">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
