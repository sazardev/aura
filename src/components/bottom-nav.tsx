import { useDueCardCount } from '@/state/store'

export type NavTarget = 'inicio' | 'diccionario' | 'analizador' | 'repaso'

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
    { target: 'inicio', label: 'Inicio', icon: '🏠' },
    { target: 'diccionario', label: 'Diccionario', icon: '📖' },
    { target: 'analizador', label: 'Analizador', icon: '🧪' },
    { target: 'repaso', label: 'Repaso', icon: '🔁', badge: dueCount },
  ]

  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
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
