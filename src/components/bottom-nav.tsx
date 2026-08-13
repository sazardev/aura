import type { LucideIcon } from 'lucide-react'

import { BookOpen, FlaskConical, Home, LayoutGrid, LibraryBig, RotateCcw } from 'lucide-react'
import { useState } from 'react'

import { NavigationDrawer } from '@/components/navigation-drawer'
import { playSound } from '@/engine/sounds'
import { useDueCardCount } from '@/state/store'

export type NavTarget = 'home' | 'dictionary' | 'analyzer' | 'library' | 'review'

interface NavItem {
  target: NavTarget
  label: string
  icon: LucideIcon
  badge?: number
}

interface BottomNavProps {
  active: NavTarget
  onNavigate: (target: NavTarget) => void
}

export function BottomNav({ active, onNavigate }: BottomNavProps) {
  const dueCount = useDueCardCount()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const items: NavItem[] = [
    { target: 'home', label: 'Home', icon: Home },
    { target: 'dictionary', label: 'Dictionary', icon: BookOpen },
    { target: 'analyzer', label: 'Analyzer', icon: FlaskConical },
    { target: 'library', label: 'Library', icon: LibraryBig },
    { target: 'review', label: 'Review', icon: RotateCcw, badge: dueCount },
  ]

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {items.map((item) => {
        const isActive = active === item.target
        const Icon = item.icon
        const classes = ['bottom-nav__item', isActive ? 'bottom-nav__item--active' : '']
          .filter(Boolean)
          .join(' ')
        return (
          <button
            key={item.target}
            type="button"
            className={classes}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => {
              playSound('click')
              onNavigate(item.target)
            }}
          >
            <span className="bottom-nav__icon">
              <Icon size={20} strokeWidth={2} aria-hidden="true" />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bottom-nav__badge">{item.badge}</span>
              )}
            </span>
            <span className="bottom-nav__label">{item.label}</span>
          </button>
        )
      })}
      <button
        type="button"
        className={['bottom-nav__item', 'bottom-nav__item--more'].filter(Boolean).join(' ')}
        aria-label="All sections"
        aria-expanded={drawerOpen}
        onClick={() => {
          playSound('click')
          setDrawerOpen(true)
        }}
      >
        <span className="bottom-nav__icon">
          <LayoutGrid size={20} strokeWidth={2} aria-hidden="true" />
        </span>
        <span className="bottom-nav__label">More</span>
      </button>
      <NavigationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </nav>
  )
}
