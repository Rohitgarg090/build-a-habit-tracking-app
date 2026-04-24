'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { tokens } from '@/styles/tokens'

interface Habit {
  id: string
  name: string
  description?: string
  frequency: 'daily' | 'weekly'
  color: string
  icon: string
  created_at: string
  streak: number
  longest_streak: number
  completed_today: boolean
  total_completions: number
}

interface HabitFormData {
  name: string
  description: string
  frequency: 'daily' | 'weekly'
  color: string
  icon: string
}

const HABIT_COLORS = [
  '#4f46e5', '#f97316', '#10b981', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899'
]

const HABIT_ICONS = ['⭐', '💪', '📚', '🏃', '🧘', '💧', '🎯', '✍️', '🍎', '😴', '🎵', '💡']

const DEFAULT_FORM: HabitFormData = {
  name: '',
  description: '',
  frequency: 'daily',
  color: '#4f46e5',
  icon: '⭐'
}

function getTodayKey() {
  return new Date().toISOString().split('T')[0]
}

function loadLocalHabits(): Habit[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('habits_local')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLocalHabits(habits: Habit[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem('habits_local', JSON.stringify(habits))
}

function loadPendingCompletions(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem('pending_completions')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function savePendingCompletions(pending: Record<string, boolean>) {
  if (typeof window === 'undefined') return
  localStorage.setItem('pending_completions', JSON.stringify(pending))
}

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [deletingHabit, setDeletingHabit] = useState<Habit | null>(null)
  const [formData, setFormData] = useState<HabitFormData>(DEFAULT_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [pendingCompletions, setPendingCompletions] = useState<Record<string, boolean>>({})

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autosaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const today = getTodayKey()

  useEffect(() => {
    if (!user) {
      router.push('/auth/login')
    }
  }, [user, router])

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [search])

  const fetchHabits = useCallback(async () => {
    if (!user) return
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('access_token')
      const res = await fetch(`/api/habits?date=${today}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch habits')
      const data = await res.json()
      const fetched: Habit[] = data.habits || []
      setHabits(fetched)
      saveLocalHabits(fetched)
      const pending = loadPendingCompletions()
      if (Object.keys(pending).length > 0) {
        await syncPendingCompletions(pending, fetched)
      }
    } catch {
      const local = loadLocalHabits()
      if (local.length > 0) {
        setHabits(local)
        setError('Offline mode — showing cached data')
      } else {
        setError('Failed to load habits. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }, [user, today])

  const syncPendingCompletions = async (
    pending: Record<string, boolean>,
    currentHabits: Habit[]
  ) => {
    const token = localStorage.getItem('access_token')
    const synced: string[] = []
    for (const [habitId, completed] of Object.entries(pending)) {
      try {
        const res = await fetch(`/api/habits/${habitId}/complete`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ date: today, completed })
        })
        if (res.ok) synced.push(habitId)
      } catch {
        // keep in pending
      }
    }
    if (synced.length > 0) {
      const remaining = { ...pending }
      synced.forEach(id => delete remaining[id])
      savePendingCompletions(remaining)
      setPendingCompletions(remaining)
      if (synced.length > 0) {
        setHabits(currentHabits.map(h =>
          synced.includes(h.id)
            ? { ...h, completed_today: pending[h.id] }
            : h
        ))
      }
    }
  }

  useEffect(() => {
    if (user) {
      const pending = loadPendingCompletions()
      setPendingCompletions(pending)
      fetchHabits()
    }
  }, [user, fetchHabits])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC')
      const cmdKey = isMac ? e.metaKey : e.ctrlKey
      if (cmdKey && e.key === 'k') {
        e.preventDefault()
        setShowCreateModal(true)
      }
      if (cmdKey && e.key === '/') {
        e.preventDefault()
        document.getElementById('habit-search')?.focus()
      }
      if (e.key === 'Escape') {
        setShowCreateModal(false)
        setShowDeleteModal(false)
        setEditingHabit(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleToggleComplete = async (habit: Habit) => {
    const newCompleted = !habit.completed_today
    setHabits(prev => prev.map(h =>
      h.id === habit.id
        ? {
            ...h,
            completed_today: newCompleted,
            streak: newCompleted ? h.streak + 1 : Math.max(0, h.streak - 1)
          }
        : h
    ))
    const updatedLocal = habits.map(h =>
      h.id === habit.id
        ? { ...h, completed_today: newCompleted, streak: newCompleted ? h.streak + 1 : Math.max(0, h.streak - 1) }
        : h
    )
    saveLocalHabits(updatedLocal)
    const token = localStorage.getItem('access_token')
    try {
      const res = await fetch(`/api/habits/${habit.id}/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ date: today, completed: newCompleted })
      })
      if (!res.ok) throw new Error('Sync failed')
      const newPending = { ...pendingCompletions }
      delete newPending[habit.id]
      savePendingCompletions(newPending)
      setPendingCompletions(newPending)
    } catch {
      const newPending = { ...pendingCompletions, [habit.id]: newCompleted }
      savePendingCompletions(newPending)
      setPendingCompletions(newPending)
    }
  }

  const handleOpenCreate = () => {
    setFormData(DEFAULT_FORM)
    setFormError(null)
    setEditingHabit(null)
    setShowCreateModal(true)
  }

  const handleOpenEdit = (habit: Habit) => {
    setFormData({
      name: habit.name,
      description: habit.description || '',
      frequency: habit.frequency,
      color: habit.color,
      icon: habit.icon
    })
    setFormError(null)
    setEditingHabit(habit)
    setShowCreateModal(true)
  }

  const handleOpenDelete = (habit: Habit) => {
    setDeletingHabit(habit)
    setShowDeleteModal(true)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setFormError('Habit name is required')
      return
    }
    setFormLoading(true)
    setFormError(null)
    const token = localStorage.getItem('access_token')
    try {
      const url = editingHabit ? `/api/habits/${editingHabit.id}` : '/api/habits'
      const method = editingHabit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.message || 'Failed to save habit')
      }
      const data = await res.json()
      if (editingHabit) {
        setHabits(prev => prev.map(h => h.id === editingHabit.id ? { ...h, ...data.habit } : h))
      } else {
        setHabits(prev => [...prev, { ...data.habit, completed_today: false, streak: 0, longest_streak: 0, total_completions: 0 }])
      }
      setShowCreateModal(false)
      setEditingHabit(null)
      setFormData(DEFAULT_FORM)
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save habit')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingHabit) return
    const token = localStorage.getItem('access_token')
    try {
      const res = await fetch(`/api/habits/${deletingHabit.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to delete habit')
      setHabits(prev => prev.filter(h => h.id !== deletingHabit.id))
      setShowDeleteModal(false)
      setDeletingHabit(null)
    } catch {
      setFormError('Failed to delete habit')
    }
  }

  const handleExport = () => {
    const data = habits.map(h => ({
      name: h.name,
      description: h.description,
      frequency: h.frequency,
      streak: h.streak,
      longest_streak: h.longest_streak,
      total_completions: h.total_completions,
      completed_today: h.completed_today,
      created_at: h.created_at
    }))
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `habits-${today}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredHabits = habits.filter(h => {
    const matchSearch = h.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (h.description || '').toLowerCase().includes(debouncedSearch.toLowerCase())
    if (filterStatus === 'completed') return matchSearch && h.completed_today
    if (filterStatus === 'pending') return matchSearch && !h.completed_today
    return matchSearch
  })

  const displayedHabits = filteredHabits.slice(0, 50)

  const totalHabits = habits.length
  const completedToday = habits.filter(h => h.completed_today).length
  const completionRate = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0
  const longestCurrentStreak = habits.reduce((max, h) => Math.max(max, h.streak), 0)

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text
    const idx = text.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ backgroundColor: '#fef08a', borderRadius: '2px' }}>{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    )
  }

  if (!user) return null

  return (
    <div style={{ minHeight: '100vh', backgroundColor: tokens.colors.background }}>
      <header style={{
        backgroundColor: tokens.colors.surface,
        borderBottom: `1px solid ${tokens.colors.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>🎯</span>
              <span style={{ fontSize: '20px', fontWeight: 700, color: tokens.colors.text }}>HabitForge</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => router.push('/progress')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: tokens.colors.textSecondary,
                  fontSize: '14px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontWeight: 500
                }}
              >
                📊 Progress
              </button>
              <button
                onClick={handleExport}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: tokens.colors.textSecondary,
                  fontSize: '14px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontWeight: 500
                }}
              >
                ⬇ Export
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  backgroundColor: tokens.colors.primary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: '14px', fontWeight: 600
                }}>
                  {(user.email || 'U')[0].toUpperCase()}
                </div>
                <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 700, color: tokens.colors.text, marginBottom: '4px' }}>
                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'} 👋
              </h1>
              <p style={{ color: tokens.colors.textSecondary, fontSize: '15px' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <Button
              onClick={handleOpenCreate}
              variant="primary"
              size="md"
            >
              + New Habit
              <span style={{ marginLeft: '8px', fontSize: '11px', opacity: 0.7, fontWeight: 400 }}>⌘K</span>
            </Button>
          </div>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '24px',
            fontSize: '14px',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⚠️</span> {error}
            {Object.keys(pendingCompletions).length > 0 && (
              <span style={{ marginLeft: '8px' }}>
                ({Object.keys(pendingCompletions).length} update{Object.keys(pendingCompletions).length > 1 ? 's' : ''} pending sync)
              </span>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <Card style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: `${tokens.colors.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                📋
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: tokens.colors.text }}>{totalHabits}</div>
                <div style={{ fontSize: '13px', color: tokens.colors.textSecondary }}>Total Habits</div>
              </div>
            </div>
          </Card>

          <Card style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#10b98115', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                ✅
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: tokens.colors.text }}>{completedToday}/{totalHabits}</div>
                <div style={{ fontSize: '13px', color: tokens.colors.textSecondary }}>Done Today</div>
              </div>
            </div>
          </Card>

          <Card style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: `${tokens.colors.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                📈
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: tokens.colors.text }}>{completionRate}%</div>
                <div style={{ fontSize: '13px', color: tokens.colors.textSecondary }}>Completion Rate</div>
              </div>
            </div>
          </Card>

          <Card style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#f59e0b15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                🔥
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: tokens.colors.text }}>{longestCurrentStreak}</div>
                <div style={{ fontSize: '13px', color: tokens.colors.textSecondary }}>Best Streak</div>
              </div>
            </div>
          </Card>
        </div>

        {totalHabits > 0 && (
          <Card style={{ padding: '20px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: tokens.colors.text }}>Today's Progress</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: completionRate === 100 ? '#10b981' : tokens.colors.primary }}>
                {completionRate}%
              </span>
            </div>
            <div style={{ height: '8px', backgroundColor: tokens.colors.border, borderRadius: '100px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${completionRate}%`,
                backgroundColor: completionRate === 100 ? '#10b981' : tokens.colors.primary,
                borderRadius: '100px',
                transition: 'width 0.5s ease'
              }} />
            </div>
            {completionRate === 100 && (
              <p style={{ marginTop: '12px', fontSize: '14px', color: '#10b981', fontWeight: 500, textAlign: 'center' }}>
                🎉 All habits completed for today! Amazing work!
              </p>
            )}
          </Card>
        )}

        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <Input
              id="habit-search"
              placeholder="Search habits... (⌘/)"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['all', 'completed', 'pending'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${filterStatus === status ? tokens.colors.primary : tokens.colors.border}`,
                  backgroundColor: filterStatus === status ? tokens.colors.primary : 'transparent',
                  color: filterStatus === status ? 'white' : tokens.colors.textSecondary,
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textTransform: 'capitalize'
                }}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            {[1, 2, 3].map(i => (
              <Card key={i} style={{ padding: '20px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: tokens.colors.border, animation: 'pulse 2s infinite' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ width: '40%', height: '16px', backgroundColor: tokens.colors.border, borderRadius: '6px', marginBottom: '8px' }} />
                    <div style={{ width: '60%', height: '12px', backgroundColor: tokens.colors.border, borderRadius: '6px' }} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : habits.length === 0 ? (
          <Card style={{ padding: '64px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🌱</div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: tokens.colors.text, marginBottom: '8px' }}>
              Start your habit journey
            </h2>
            <p style={{ color: tokens.colors.textSecondary, fontSize: '15px', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
              Create your first habit to start building consistency and tracking your progress every day.
            </p>
            <Button variant="primary" onClick={handleOpenCreate}>
              + Create your first habit
            </Button>
          </Card>
        ) : filteredHabits.length === 0 ? (
          <Card style={{ padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: tokens.colors.text, marginBottom: '8px' }}>No habits found</h3>
            <p style={{ color: tokens.colors.textSecondary, fontSize: '14px' }}>
              Try adjusting your search or filter.
            </p>
          </Card>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {displayedHabits.map(habit => (
              <HabitCard
                key={habit.id}
                habit={habit}
                debouncedSearch={debouncedSearch}
                highlightText={highlightText}
                onToggle={handleToggleComplete}
                onEdit={handleOpenEdit}
                onDelete={handleOpenDelete}
                onClick={() => router.push(`/habits/${habit.id}`)}
                isPending={pendingCompletions[habit.id] !== undefined}
              />
            ))}
            {filteredHabits.length > 50 && (
              <p style={{ textAlign: 'center', fontSize: '13px', color: tokens.colors.textSecondary, padding: '16px' }}>
                Showing 50 of {filteredHabits.length} habits. Refine your search to see more.
              </p>
            )}
          </div>
        )}
      </main>

      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setEditingHabit(null); setFormError(null) }}
        title={editingHabit ? 'Edit Habit' : 'Create New Habit'}
      >
        <form onSubmit={handleFormSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: tokens.colors.text, marginBottom: '6px' }}>
                Habit Name *
              </label>
              <Input
                placeholder="e.g. Morning meditation"
                value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                autoFocus
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: tokens.colors.text, marginBottom: '6px' }}>
                Description
              </label>
              <Input
                placeholder="Optional — what is this habit for?"
                value={formData.description}
                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              />
            </div
>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <Button variant="ghost" onClick={() => setShowAddHabit(false)}>Cancel</Button>
              <Button onClick={handleAddHabit}>Add Habit</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
