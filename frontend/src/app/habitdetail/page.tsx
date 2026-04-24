'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'
import { tokens } from '@/styles/tokens'

interface Habit {
  id: string
  name: string
  description: string
  frequency: string
  color: string
  created_at: string
  target_days: number[]
}

interface CompletionRecord {
  id: string
  habit_id: string
  completed_date: string
  notes: string
  created_at: string
}

interface StreakStats {
  currentStreak: number
  longestStreak: number
  totalCompletions: number
  completionRate: number
  thisWeek: number
  thisMonth: number
}

const COLORS = [
  '#4f46e5', '#f97316', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'
]

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00')
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

export default function HabitDetailPage() {
  const { user, session } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const habitId = searchParams.get('id')

  const [habit, setHabit] = useState<Habit | null>(null)
  const [completions, setCompletions] = useState<CompletionRecord[]>([])
  const [streakStats, setStreakStats] = useState<StreakStats>({
    currentStreak: 0,
    longestStreak: 0,
    totalCompletions: 0,
    completionRate: 0,
    thisWeek: 0,
    thisMonth: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', description: '', color: '#4f46e5' })
  const [saving, setSaving] = useState(false)
  const [activeView, setActiveView] = useState<'calendar' | 'list'>('calendar')
  const [optimisticCompletions, setOptimisticCompletions] = useState<Set<string>>(new Set())
  const [optimisticRemovals, setOptimisticRemovals] = useState<Set<string>>(new Set())

  const getAuthHeaders = useCallback(() => {
    const token = session?.access_token
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }, [session])

  const computeStreaks = useCallback((records: CompletionRecord[]) => {
    if (records.length === 0) {
      setStreakStats({ currentStreak: 0, longestStreak: 0, totalCompletions: 0, completionRate: 0, thisWeek: 0, thisMonth: 0 })
      return
    }

    const dateSet = new Set(records.map(r => r.completed_date))
    const today = new Date()
    const todayStr = formatDate(today)

    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0
    let checkDate = new Date(today)

    if (!dateSet.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1)
    }

    while (true) {
      const ds = formatDate(checkDate)
      if (dateSet.has(ds)) {
        currentStreak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }

    const allDates = Array.from(dateSet).sort()
    if (allDates.length > 0) {
      let prev = parseDate(allDates[0])
      tempStreak = 1
      longestStreak = 1
      for (let i = 1; i < allDates.length; i++) {
        const curr = parseDate(allDates[i])
        const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
        if (diff === 1) {
          tempStreak++
          longestStreak = Math.max(longestStreak, tempStreak)
        } else {
          tempStreak = 1
        }
        prev = curr
      }
    }

    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const thisWeek = records.filter(r => parseDate(r.completed_date) >= weekStart).length
    const thisMonth = records.filter(r => parseDate(r.completed_date) >= monthStart).length

    const habitCreated = habit?.created_at ? new Date(habit.created_at) : new Date()
    const daysSinceCreation = Math.max(1, Math.floor((now.getTime() - habitCreated.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    const completionRate = Math.round((records.length / daysSinceCreation) * 100)

    setStreakStats({
      currentStreak,
      longestStreak,
      totalCompletions: records.length,
      completionRate: Math.min(completionRate, 100),
      thisWeek,
      thisMonth,
    })
  }, [habit])

  const fetchHabit = useCallback(async () => {
    if (!habitId) return
    try {
      const res = await fetch(`/api/habits/${habitId}`, { headers: getAuthHeaders() })
      if (!res.ok) throw new Error('Failed to fetch habit')
      const data = await res.json()
      setHabit(data)
      setEditForm({ name: data.name, description: data.description || '', color: data.color || '#4f46e5' })
    } catch (err) {
      setError('Could not load habit details.')
    }
  }, [habitId, getAuthHeaders])

  const fetchCompletions = useCallback(async () => {
    if (!habitId) return
    try {
      const res = await fetch(`/api/habits/${habitId}/completions`, { headers: getAuthHeaders() })
      if (!res.ok) throw new Error('Failed to fetch completions')
      const data = await res.json()
      setCompletions(data)
    } catch (err) {
      setError('Could not load completion history.')
    }
  }, [habitId, getAuthHeaders])

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    if (!habitId) {
      router.push('/dashboard')
      return
    }
    const load = async () => {
      setLoading(true)
      await fetchHabit()
      await fetchCompletions()
      setLoading(false)
    }
    load()
  }, [user, habitId])

  useEffect(() => {
    computeStreaks(completions)
  }, [completions, computeStreaks])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault()
        setEditModalOpen(true)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowLeft') {
        e.preventDefault()
        router.push('/dashboard')
      }
      if (e.key === 'Escape') {
        setNoteModalOpen(false)
        setEditModalOpen(false)
        setDeleteModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  const completionDates = new Set([
    ...completions.map(c => c.completed_date),
    ...Array.from(optimisticCompletions),
  ].filter(d => !optimisticRemovals.has(d)))

  const isDateCompleted = (dateStr: string) => completionDates.has(dateStr)

  const toggleCompletion = async (dateStr: string) => {
    const wasCompleted = isDateCompleted(dateStr)

    if (wasCompleted) {
      setOptimisticRemovals(prev => new Set([...prev, dateStr]))
      setOptimisticCompletions(prev => { const n = new Set(prev); n.delete(dateStr); return n })
    } else {
      setOptimisticCompletions(prev => new Set([...prev, dateStr]))
      setOptimisticRemovals(prev => { const n = new Set(prev); n.delete(dateStr); return n })
    }

    try {
      if (wasCompleted) {
        const record = completions.find(c => c.completed_date === dateStr)
        if (record) {
          await fetch(`/api/habits/${habitId}/completions/${record.id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          })
        }
      } else {
        await fetch(`/api/habits/${habitId}/completions`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ completed_date: dateStr, notes: '' }),
        })
      }
      await fetchCompletions()
    } catch {
      if (wasCompleted) {
        setOptimisticRemovals(prev => { const n = new Set(prev); n.delete(dateStr); return n })
      } else {
        setOptimisticCompletions(prev => { const n = new Set(prev); n.delete(dateStr); return n })
      }
    }
  }

  const openNoteModal = (dateStr: string) => {
    setSelectedDate(dateStr)
    const existing = completions.find(c => c.completed_date === dateStr)
    setNoteText(existing?.notes || '')
    setNoteModalOpen(true)
  }

  const saveNote = async () => {
    if (!selectedDate) return
    setSaving(true)
    try {
      const existing = completions.find(c => c.completed_date === selectedDate)
      if (existing) {
        await fetch(`/api/habits/${habitId}/completions/${existing.id}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ notes: noteText }),
        })
      } else {
        await fetch(`/api/habits/${habitId}/completions`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ completed_date: selectedDate, notes: noteText }),
        })
      }
      await fetchCompletions()
      setNoteModalOpen(false)
    } catch {
      setError('Failed to save note.')
    } finally {
      setSaving(false)
    }
  }

  const saveEdit = async () => {
    if (!habit) return
    setSaving(true)
    try {
      await fetch(`/api/habits/${habitId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(editForm),
      })
      await fetchHabit()
      setEditModalOpen(false)
    } catch {
      setError('Failed to update habit.')
    } finally {
      setSaving(false)
    }
  }

  const deleteHabit = async () => {
    setSaving(true)
    try {
      await fetch(`/api/habits/${habitId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      router.push('/dashboard')
    } catch {
      setError('Failed to delete habit.')
      setSaving(false)
    }
  }

  const exportData = () => {
    const rows = [
      ['Date', 'Completed', 'Notes'],
      ...completions.map(c => [c.completed_date, 'Yes', c.notes || '']),
    ]
    const csv = rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${habit?.name || 'habit'}-history.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const navigateMonth = (dir: number) => {
    let newMonth = calendarMonth + dir
    let newYear = calendarYear
    if (newMonth < 0) { newMonth = 11; newYear-- }
    if (newMonth > 11) { newMonth = 0; newYear++ }
    setCalendarMonth(newMonth)
    setCalendarYear(newYear)
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(calendarYear, calendarMonth)
    const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth)
    const today = formatDate(new Date())
    const cells: JSX.Element[] = []

    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} />)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const completed = isDateCompleted(dateStr)
      const isToday = dateStr === today
      const isFuture = dateStr > today

      cells.push(
        <button
          key={dateStr}
          onClick={() => !isFuture && toggleCompletion(dateStr)}
          onContextMenu={e => { e.preventDefault(); if (!isFuture) openNoteModal(dateStr) }}
          disabled={isFuture}
          title={isFuture ? 'Future date' : completed ? 'Click to unmark' : 'Click to mark complete'}
          style={{
            aspectRatio: '1',
            borderRadius: '50%',
            border: isToday ? `2px solid ${tokens.colors.primary}` : '2px solid transparent',
            backgroundColor: completed
              ? (habit?.color || tokens.colors.primary)
              : isToday
              ? `${tokens.colors.primary}15`
              : tokens.colors.border,
            color: completed ? '#fff' : isFuture ? '#ccc' : tokens.colors.text,
            cursor: isFuture ? 'not-allowed' : 'pointer',
            fontSize: '0.75rem',
            fontWeight: isToday ? '700' : '400',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
            width: '100%',
          }}
          aria-label={`${dateStr}${completed ? ' - completed' : ''}`}
        >
          {day}
        </button>
      )
    }

    return cells
  }

  const recentCompletions = [...completions]
    .sort((a, b) => b.completed_date.localeCompare(a.completed_date))
    .slice(0, 30)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: tokens.colors.background, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: `4px solid ${tokens.colors.border}`,
            borderTopColor: tokens.colors.primary,
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: tokens.colors.text, opacity: 0.6 }}>Loading habit details...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!habit) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: tokens.colors.background, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Card>
          <div style={{ padding: 32, textAlign: 'center' }}>
            <p style={{ color: tokens.colors.text, marginBottom: 16 }}>Habit not found.</p>
            <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: tokens.colors.background }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
        .stat-card:hover { transform: translateY(-2px); }
        .completion-row:hover { background: ${tokens.colors.border}; }
      `}</style>

      {/* Header */}
      <header style={{
        backgroundColor: tokens.colors.surface,
        borderBottom: `1px solid ${tokens.colors.border}`,
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => router.push('/dashboard')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: tokens.colors.text, opacity: 0.6, fontSize: 20, padding: 4,
                display: 'flex', alignItems: 'center',
              }}
              title="Back (⌘←)"
              aria-label="Back to dashboard"
            >
              ←
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: habit.color || tokens.colors.primary }} />
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: tokens.colors.text, margin: 0 }}>
                {habit.name}
              </h1>
              <Badge variant="info">{habit.frequency || 'Daily'}</Badge>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={exportData}>
              Export CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setEditModalOpen(true)} title="Edit (⌘E)">
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={() => setDeleteModalOpen(true)}>
              Delete
            </Button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px', animation: 'fadeIn 0.3s ease' }}>
        {error && (
          <div style={{
            backgroundColor: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 8, padding: '12px 16px', marginBottom: 24,
            color: '#dc2626', fontSize: '0.875rem',
          }}>
            {error}
          </div>
        )}

        {habit.description && (
          <p style={{ color: tokens.colors.text, opacity: 0.7, marginBottom: 24, fontSize: '0.9rem' }}>
            {habit.description}
          </p>
        )}

        {/* Streak Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Current Streak', value: `${streakStats.currentStreak}`, unit: 'days', color: tokens.colors.accent },
            { label: 'Longest Streak', value: `${streakStats.longestStreak}`, unit: 'days', color: tokens.colors.primary },
            { label: 'Total Done', value: `${streakStats.totalCompletions}`, unit: 'times', color: '#10b981' },
            { label: 'Completion Rate', value: `${streakStats.completionRate}`, unit: '%', color: '#8b5cf6' },
            { label: 'This Week', value: `${streakStats.thisWeek}`, unit: 'days', color: '#06b6d4' },
            { label: 'This Month', value: `${streakStats.thisMonth}`, unit: 'days', color: '#f59e0b' },
          ].map(stat => (
            <div
              key={stat.label}
              className="stat-card"
              style={{
                backgroundColor: tokens.colors.surface,
                border: `1px solid ${tokens.colors.border}`,
                borderRadius: 12,
                padding: '20px 16px',
                textAlign: 'center',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                cursor: 'default',
              }}
            >
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: stat.color, lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.65rem', color: stat.color, opacity: 0.8, marginBottom: 4 }}>
                {stat.unit}
              </div>
              <div style={{ fontSize: '0.7rem', color: tokens.colors.text, opacity: 0.6, fontWeight: 500 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button
            onClick={() => setActiveView('calendar')}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              backgroundColor: activeView === 'calendar' ? tokens.colors.primary : tokens.colors.surface,
              color: activeView === 'calendar' ? '#fff' : tokens.colors.text,
              fontWeight: 600, fontSize: '0.85rem',
              border: `1px solid ${activeView === 'calendar' ? tokens.colors.primary : tokens.colors.border}`,
            }}
          >
            Calendar View
          </button>
          <button
            onClick={() => setActiveView('list')}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              backgroundColor: activeView === 'list' ? tokens.colors.primary : tokens.colors.surface,
              color: activeView === 'list' ? '#fff' : tokens.colors.text,
              fontWeight: 600, fontSize: '0.85rem',
              border: `1px solid ${activeView === 'list' ? tokens.colors.primary : tokens.colors.border}`,
            }}
          >
            History List
          </button>
        </div>

        {/* Calendar View */}
        {activeView === 'calendar' && (
          <Card>
            <div style={{ padding: 24 }}>
              {/* Month Navigation */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <button
                  onClick={() => navigateMonth(-1)}
                  style={{ background: 'none', border: `1px solid ${tokens.colors.border}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: tokens.colors.text }}
                  aria-label="Previous month"
                >
                  ‹
                </button>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: tokens.colors.text, margin: 0 }}>
                  {MONTH_LABELS[calendarMonth]} {calendarYear}
                </h2>
                <button
                  onClick={() => navigateMonth(1)}
                  disabled={calendarYear === new Date().getFullYear() && calendarMonth === new Date().getMonth()}
                  style={{
                    background: 'none', border: `1px solid ${tokens.colors.border}`, borderRadius: 8,
                    padding: '6px 12px', cursor: 'pointer', color: tokens.colors.text,
                    opacity: calendarYear === new Date().getFullYear() && calendarMonth === new Date().getMonth() ? 0.3 : 1,
                  }}
                  aria-label="Next month"
                >
                  ›
                </button>
              </div>

              {/* Day labels */}
              <div className="cal-grid" style={{ marginBottom: 8 }}>
                {DAY_LABELS.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 600, color: tokens.colors.text, opacity: 0.5, padding: '4px 0' }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar cells */}
              <div className="cal-grid">
                {renderCalendar()}
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', gap: 20, marginTop: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: tokens.colors.text, opacity: 0.7 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: habit.color || tokens.colors.primary }} />
                  Completed
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: tokens.colors.text, opacity: 0.7 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: tokens.colors.border, border: `2px solid ${tokens.colors.primary}` }} />
                  Today
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: tokens.colors.text, opacity: 0.7 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: tokens.colors.border }} />
                  Missed
                </div>
              </div>
              <p style={{ textAlign: 'center', fontSize: '0.72rem', color: tokens.colors.text, opacity: 0.5, marginTop: 8 }}>
                Right-click any day to add a note
              </p>
            </div>
          </Card>
        )}

        {/* History List View */}
        {activeView === 'list' && (
          <Card>
            <div style={{ padding: 24 }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: tokens.colors.text, marginBottom: 16 }}>
                Recent Completions
              </h2>
              {recentCompletions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: tokens.colors.text, opacity: 0.5 }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
                  <p style={{ fontSize: '0.9rem' }}>No completions yet. Start tracking today!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {recentCompletions.map(record => (
                    <div
                      key={record.id}
                      className="completion-row"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px', borderRadius: 8, transition: 'background 0.1s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: habit.color || tokens.colors.primary, flexShrink: 0 }} />
                        <div>
                          <div style={{
Here's the closing code needed:

                            fontWeight: 600, fontSize: 15, color: tokens.colors.textPrimary
                          }}>{habit.name}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
}
}