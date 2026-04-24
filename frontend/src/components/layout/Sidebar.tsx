'use client'

import { useAuth } from '@/context/AuthContext'
import { tokens } from '@/styles/tokens'
import {
  BarChart2,
  CheckSquare,
  Home,
  LogOut,
  Menu,
  Target,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    label: 'Habits',
    href: '/habits',
    icon: CheckSquare,
  },
  {
    label: 'Progress',
    href: '/progress',
    icon: BarChart2,
  },
  {
    label: 'Goals',
    href: '/goals',
    icon: Target,
  },
]

export default function Sidebar() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  const handleSignOut = async () => {
    await signOut()
  }

  const sidebarContent = (
    <div
      style={{
        backgroundColor: tokens.colors.surface,
        borderRight: `1px solid ${tokens.colors.border}`,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        width: '240px',
      }}
    >
      <div
        style={{
          padding: '24px 20px',
          borderBottom: `1px solid ${tokens.colors.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: tokens.colors.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CheckSquare size={18} color="#ffffff" />
        </div>
        <span
          style={{
            fontSize: '18px',
            fontWeight: '700',
            color: tokens.colors.text,
            letterSpacing: '-0.3px',
          }}
        >
          HabitForge
        </span>
      </div>

      <nav
        style={{
          flex: 1,
          padding: '16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '8px',
                textDecoration: 'none',
                backgroundColor: active ? `${tokens.colors.primary}15` : 'transparent',
                color: active ? tokens.colors.primary : tokens.colors.text,
                fontWeight: active ? '600' : '400',
                fontSize: '14px',
                transition: 'background-color 0.15s ease, color 0.15s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = `${tokens.colors.border}`
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              <Icon
                size={18}
                style={{
                  color: active ? tokens.colors.primary : '#6b7280',
                  flexShrink: 0,
                }}
              />
              <span>{item.label}</span>
              {active && (
                <div
                  style={{
                    marginLeft: 'auto',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: tokens.colors.primary,
                  }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      <div
        style={{
          padding: '16px 12px',
          borderTop: `1px solid ${tokens.colors.border}`,
        }}
      >
        {user && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '8px',
              marginBottom: '8px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: `${tokens.colors.primary}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: tokens.colors.primary,
                }}
              >
                {user.email ? user.email[0].toUpperCase() : 'U'}
              </span>
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p
                style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  color: tokens.colors.text,
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user.email}
              </p>
              <p
                style={{
                  fontSize: '11px',
                  color: '#6b7280',
                  margin: 0,
                }}
              >
                Free plan
              </p>
            </div>
          </div>
        )}

        <button
          onClick={handleSignOut}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: '#ef4444',
            fontWeight: '500',
            fontSize: '14px',
            cursor: 'pointer',
            width: '100%',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#fef2f2'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <LogOut size={18} style={{ flexShrink: 0 }} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      <div
        className="hidden md:flex"
        style={{
          height: '100vh',
          position: 'sticky',
          top: 0,
          flexShrink: 0,
        }}
      >
        {sidebarContent}
      </div>

      <div className="md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          style={{
            position: 'fixed',
            top: '16px',
            left: '16px',
            zIndex: 50,
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            border: `1px solid ${tokens.colors.border}`,
            backgroundColor: tokens.colors.surface,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
          aria-label="Open menu"
        >
          <Menu size={20} color={tokens.colors.text} />
        </button>

        {mobileOpen && (
          <>
            <div
              onClick={() => setMobileOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.4)',
                zIndex: 40,
              }}
            />
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                zIndex: 50,
                boxShadow: '4px 0 16px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ position: 'relative', height: '100%' }}>
                <button
                  onClick={() => setMobileOpen(false)}
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '-48px',
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: tokens.colors.surface,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 51,
                  }}
                  aria-label="Close menu"
                >
                  <X size={18} color={tokens.colors.text} />
                </button>
                {sidebarContent}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}