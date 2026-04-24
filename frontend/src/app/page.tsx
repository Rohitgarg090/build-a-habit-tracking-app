'use client'

import { Button } from '@/components/ui/Button'
import { tokens } from '@/styles/tokens'
import { CheckCircle2, Flame, BarChart3, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function LandingPage() {
  return (
    <main style={{ backgroundColor: tokens.colors.background, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ maxWidth: '720px', width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <Flame size={36} color={tokens.colors.accent} />
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: tokens.colors.primary, letterSpacing: '-0.5px' }}>HabitForge</span>
        </div>

        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, color: tokens.colors.text, lineHeight: 1.1, marginBottom: '1.25rem', letterSpacing: '-1px' }}>
          Build habits that{' '}
          <span style={{ color: tokens.colors.primary }}>actually stick</span>
        </h1>

        <p style={{ fontSize: '1.125rem', color: tokens.colors.text, opacity: 0.7, lineHeight: 1.7, maxWidth: '520px', margin: '0 auto 2.5rem' }}>
          Track your daily habits, maintain streaks, and watch your progress grow. Small actions, compounded daily, create extraordinary results.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '4rem' }}>
          <Link href="/auth/signup">
            <Button variant="primary" size="lg">
              <Sparkles size={18} />
              Get Started Free
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button variant="outline" size="lg">
              Log In
            </Button>
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', textAlign: 'left' }}>
          {[
            { icon: <CheckCircle2 size={22} color={tokens.colors.primary} />, title: 'Daily Check-ins', desc: 'Mark habits complete with one tap each day' },
            { icon: <Flame size={22} color={tokens.colors.accent} />, title: 'Streak Tracking', desc: 'Stay motivated with consecutive day streaks' },
            { icon: <BarChart3 size={22} color={tokens.colors.primary} />, title: 'Progress Charts', desc: 'Visualise trends and celebrate your wins' },
          ].map((feature) => (
            <div key={feature.title} style={{ backgroundColor: tokens.colors.surface, border: `1px solid ${tokens.colors.border}`, borderRadius: '1rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', boxShadow: '0 2px 8px rgba(79,70,229,0.06)' }}>
              {feature.icon}
              <p style={{ fontWeight: 700, color: tokens.colors.text, fontSize: '0.95rem', margin: 0 }}>{feature.title}</p>
              <p style={{ color: tokens.colors.text, opacity: 0.6, fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>{feature.desc}</p>
            </div>
          ))}
        </div>

        <p style={{ marginTop: '3rem', fontSize: '0.8rem', color: tokens.colors.text, opacity: 0.4 }}>
          No credit card required · Free forever · Your data, your export
        </p>
      </div>
    </main>
  )
}