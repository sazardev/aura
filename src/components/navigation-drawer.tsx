import type { LucideIcon } from 'lucide-react'

import {
  BarChart3,
  Database,
  Headphones,
  Map,
  MessageCircle,
  Mic,
  PenLine,
  Settings,
  SpellCheck,
  X,
} from 'lucide-react'

import type { Route } from '@/lib/router'

import { useHashRoute } from '@/hooks/use-hash-route'

interface NavigationDrawerProps {
  open: boolean
  onClose: () => void
}

interface DrawerItem {
  label: string
  route: Route
  icon: LucideIcon
}

const ITEMS: DrawerItem[] = [
  { label: 'Speaking', route: { name: 'speak' }, icon: Mic },
  { label: 'Dictation', route: { name: 'dictation' }, icon: Headphones },
  { label: 'Writing', route: { name: 'write' }, icon: PenLine },
  { label: 'Dialogues', route: { name: 'dialogue' }, icon: MessageCircle },
  { label: 'Grammar', route: { name: 'grammar' }, icon: SpellCheck },
  { label: 'Roadmap', route: { name: 'roadmap' }, icon: Map },
  { label: 'Profile & stats', route: { name: 'profile' }, icon: BarChart3 },
  { label: 'Settings', route: { name: 'settings' }, icon: Settings },
  { label: 'Backup', route: { name: 'backup' }, icon: Database },
]

export function NavigationDrawer({ open, onClose }: NavigationDrawerProps) {
  const { navigate } = useHashRoute()

  if (!open) return null

  const go = (route: Route) => {
    navigate(route)
    onClose()
  }

  return (
    <div className="nav-drawer__overlay" onClick={onClose}>
      <aside
        className="nav-drawer"
        role="dialog"
        aria-label="All sections"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="nav-drawer__header">
          <h2>All sections</h2>
          <button
            type="button"
            className="reader-lookup__close"
            aria-label="Close navigation"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <nav className="nav-drawer__list" aria-label="More sections">
          {ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                type="button"
                className="nav-drawer__item"
                onClick={() => go(item.route)}
              >
                <span className="nav-drawer__icon">
                  <Icon size={18} aria-hidden="true" />
                </span>
                {item.label}
              </button>
            )
          })}
        </nav>
      </aside>
    </div>
  )
}
