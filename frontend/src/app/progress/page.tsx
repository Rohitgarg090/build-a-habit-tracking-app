'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { tokens } from '@/styles/tokens'

interface Habit {
  id: string
  name: string
  color: string
  created_at: string
}

interface CompletionRecord {
  habit_id: string
  completed_date: string
  habit_name: string
}

interface HabitStats {
  id: string
  name: string
  color: string
  totalCompletions: number
  currentStreak: number
  longestStreak: number
  completionRate: number
  last30Days: boolean[]
}

interface WeeklyData {
  week: string
  completions: number
  total: number
  rate: number
}

interface MonthlyData {
  month: string
  completions: number
  total: number
  rate: number
}

const COLORS = [
  '#4f46e5',
  '#f97316',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#84cc16',
]

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getDateRange(days: number): string[] {
  const dates: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(formatDate(d))
  }
  return dates
}

function calculateStreak(completedDates: Set<string>): number {
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    if (completedDates.has(formatDate(d))) {
      streak++
    } else {
      break
    }
  }
  return streak
}

function calculateLongestStreak(completedDates: Set<string>): number {
  if (completedDates.size === 0) return 0
  const sorted = Array.from(completedDates).sort()
  let longest = 1
  let current = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    const curr = new Date(sorted[i])
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    if (diff === 1) {
      current++
      longest = Math.max(longest, current)
    } else {
      current = 1
    }
  }
  return longest
}

export default function ProgressPage() {
  const { user, session } = useAuth()
  const router = useRouter()
  const [habits, setHabits] = useState<Habit[]>([])
  const [completions, setCompletions] = useState<CompletionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90'>('30')
  const [selectedHabit, setSelectedHabit] = useState<string>('all')
  const [habitStats, setHabitStats] = useState<HabitStats[]>([])
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [heatmapData, setHeatmapData] = useState<{ date: string; count: number }[]>([])

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    fetchData()
  }, [user])

  useEffect(() => {
    if (habits.length > 0 && completions.length >= 0) {
      computeStats()
    }
  }, [habits, completions, timeRange, selectedHabit])

  const fetchData = async () => {
    try {
      setLoading(true)
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const [habitsRes, completionsRes] = await Promise.all([
        fetch('/api/habits', { headers }),
        fetch('/api/completions?days=365', { headers }),
      ])

      if (habitsRes.ok) {
        const habitsData = await habitsRes.json()
        const list = habitsData.habits || habitsData || []
        setHabits(
          list.map((h: Habit, idx: number) => ({
            ...h,
            color: h.color || COLORS[idx % COLORS.length],
          }))
        )
      }

      if (completionsRes.ok) {
        const compData = await completionsRes.json()
        setCompletions(compData.completions || compData || [])
      }
    } catch (err) {
      console.error('Failed to fetch progress data:', err)
    } finally {
      setLoading(false)
    }
  }

  const computeStats = useCallback(() => {
    const days = parseInt(timeRange)
    const dateRange = getDateRange(days)
    const rangeSet = new Set(dateRange)

    const filteredCompletions = completions.filter((c) => rangeSet.has(c.completed_date))
    const allCompletionDates = completions.map((c) => c.completed_date)

    const stats: HabitStats[] = habits.map((habit) => {
      const habitCompletions = completions.filter((c) => c.habit_id === habit.id)
      const completedDatesAll = new Set(habitCompletions.map((c) => c.completed_date))
      const completedDatesInRange = new Set(
        filteredCompletions.filter((c) => c.habit_id === habit.id).map((c) => c.completed_date)
      )

      const last30 = getDateRange(30).map((d) => completedDatesAll.has(d))

      return {
        id: habit.id,
        name: habit.name,
        color: habit.color,
        totalCompletions: habitCompletions.length,
        currentStreak: calculateStreak(completedDatesAll),
        longestStreak: calculateLongestStreak(completedDatesAll),
        completionRate:
          days > 0 ? Math.round((completedDatesInRange.size / days) * 100) : 0,
        last30Days: last30,
      }
    })

    setHabitStats(stats)

    const relevantCompletions =
      selectedHabit === 'all'
        ? filteredCompletions
        : filteredCompletions.filter((c) => c.habit_id === selectedHabit)

    const habitCount =
      selectedHabit === 'all' ? habits.length : 1

    const weeks: WeeklyData[] = []
    const numWeeks = Math.ceil(days / 7)
    for (let w = numWeeks - 1; w >= 0; w--) {
      const weekDates: string[] = []
      for (let d = 6; d >= 0; d--) {
        const date = new Date()
        date.setDate(date.getDate() - w * 7 - d)
        weekDates.push(formatDate(date))
      }
      const weekSet = new Set(weekDates)
      const weekCompletions = relevantCompletions.filter((c) => weekSet.has(c.completed_date))
      const weekStart = weekDates[0]
      const label = new Date(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      weeks.push({
        week: label,
        completions: weekCompletions.length,
        total: weekDates.length * habitCount,
        rate: habitCount > 0 ? Math.round((weekCompletions.length / (weekDates.length * habitCount)) * 100) : 0,
      })
    }
    setWeeklyData(weeks)

    const monthlyMap: Record<string, { completions: number; days: number }> = {}
    dateRange.forEach((date) => {
      const d = new Date(date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!monthlyMap[key]) monthlyMap[key] = { completions: 0, days: 0 }
      monthlyMap[key].days++
    })
    relevantCompletions.forEach((c) => {
      const d = new Date(c.completed_date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (monthlyMap[key]) monthlyMap[key].completions++
    })
    const monthly = Object.entries(monthlyMap).map(([key, val]) => {
      const [year, month] = key.split('-')
      return {
        month: `${MONTH_LABELS[parseInt(month) - 1]} ${year}`,
        completions: val.completions,
        total: val.days * habitCount,
        rate: val.days > 0 && habitCount > 0 ? Math.round((val.completions / (val.days * habitCount)) * 100) : 0,
      }
    })
    setMonthlyData(monthly)

    const heatmap = getDateRange(90).map((date) => {
      const count =
        selectedHabit === 'all'
          ? completions.filter((c) => c.completed_date === date).length
          : completions.filter((c) => c.completed_date === date && c.habit_id === selectedHabit).length
      return { date, count }
    })
    setHeatmapData(heatmap)
  }, [habits, completions, timeRange, selectedHabit])

  const getHeatmapColor = (count: number, max: number) => {
    if (count === 0) return '#e0deff'
    const intensity = Math.min(count / Math.max(max, 1), 1)
    if (intensity < 0.25) return '#c7d2fe'
    if (intensity < 0.5) return '#a5b4fc'
    if (intensity < 0.75) return '#818cf8'
    return '#4f46e5'
  }

  const maxHeatmapCount = Math.max(...heatmapData.map((d) => d.count), 1)

  const overallRate =
    habitStats.length > 0
      ? Math.round(habitStats.reduce((sum, s) => sum + s.completionRate, 0) / habitStats.length)
      : 0

  const totalCompletionsInRange = habitStats.reduce((sum, s) => sum + s.totalCompletions, 0)
  const bestStreak = habitStats.reduce((max, s) => Math.max(max, s.currentStreak), 0)
  const perfectDays = (() => {
    const days = parseInt(timeRange)
    const dateRange = getDateRange(days)
    return dateRange.filter((date) => {
      const dayCompletions = completions.filter((c) => c.completed_date === date)
      return habits.length > 0 && dayCompletions.length >= habits.length
    }).length
  })()

  const maxWeeklyCompletions = Math.max(...weeklyData.map((w) => w.completions), 1)

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: tokens.colors.background }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: `${tokens.colors.primary} transparent ${tokens.colors.primary} ${tokens.colors.primary}` }}
          ></div>
          <p style={{ color: tokens.colors.textSecondary || tokens.colors.text }}>Loading your progress...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: tokens.colors.background }}
    >
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1
              className="text-3xl font-bold"
              style={{ color: tokens.colors.text }}
            >
              Progress & Analytics
            </h1>
            <p className="mt-1 text-sm" style={{ color: tokens.colors.text, opacity: 0.6 }}>
              Track your habit completion trends over time
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={timeRange === '7' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTimeRange('7')}
            >
              7 Days
            </Button>
            <Button
              variant={timeRange === '30' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTimeRange('30')}
            >
              30 Days
            </Button>
            <Button
              variant={timeRange === '90' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTimeRange('90')}
            >
              90 Days
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Avg Completion Rate', value: `${overallRate}%`, icon: '📊', color: tokens.colors.primary },
            { label: 'Total Completions', value: totalCompletionsInRange, icon: '✅', color: '#10b981' },
            { label: 'Best Current Streak', value: `${bestStreak}d`, icon: '🔥', color: tokens.colors.accent },
            { label: 'Perfect Days', value: perfectDays, icon: '⭐', color: '#f59e0b' },
          ].map((stat) => (
            <Card key={stat.label} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: tokens.colors.text, opacity: 0.6 }}>
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold" style={{ color: stat.color }}>
                    {stat.value}
                  </p>
                </div>
                <span className="text-2xl">{stat.icon}</span>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold" style={{ color: tokens.colors.text }}>
                  Weekly Completion Trend
                </h2>
                <select
                  value={selectedHabit}
                  onChange={(e) => setSelectedHabit(e.target.value)}
                  className="text-sm rounded-lg px-3 py-1.5 border outline-none"
                  style={{
                    backgroundColor: tokens.colors.surface,
                    borderColor: tokens.colors.border,
                    color: tokens.colors.text,
                  }}
                >
                  <option value="all">All Habits</option>
                  {habits.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              {weeklyData.length === 0 ? (
                <div className="flex items-center justify-center h-48">
                  <p style={{ color: tokens.colors.text, opacity: 0.5 }}>No data available</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-end gap-1 h-40">
                    {weeklyData.slice(-12).map((week, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          {week.completions} / {week.total} ({week.rate}%)
                        </div>
                        <div className="w-full flex items-end" style={{ height: '100%' }}>
                          <div
                            className="w-full rounded-t-md transition-all duration-300 cursor-pointer"
                            style={{
                              height: `${Math.max((week.completions / maxWeeklyCompletions) * 100, 4)}%`,
                              backgroundColor: tokens.colors.primary,
                              opacity: 0.7 + (week.completions / maxWeeklyCompletions) * 0.3,
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    {weeklyData.slice(-12).map((week, idx) => (
                      <div key={idx} className="flex-1 text-center">
                        <span className="text-xs" style={{ color: tokens.colors.text, opacity: 0.5 }}>
                          {week.week.split(' ')[1]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          <div>
            <Card className="p-6 h-full">
              <h2 className="text-lg font-semibold mb-4" style={{ color: tokens.colors.text }}>
                Monthly Overview
              </h2>
              <div className="flex flex-col gap-3">
                {monthlyData.slice(-3).map((month, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium" style={{ color: tokens.colors.text }}>
                        {month.month}
                      </span>
                      <span className="text-sm font-bold" style={{ color: tokens.colors.primary }}>
                        {month.rate}%
                      </span>
                    </div>
                    <div
                      className="w-full h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: tokens.colors.border }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${month.rate}%`,
                          backgroundColor: month.rate >= 80 ? '#10b981' : month.rate >= 50 ? tokens.colors.primary : tokens.colors.accent,
                        }}
                      ></div>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: tokens.colors.text, opacity: 0.5 }}>
                      {month.completions} completions
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: tokens.colors.text }}>
            Activity Heatmap (Last 90 Days)
          </h2>
          <div className="overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {Array.from({ length: 13 }).map((_, weekIdx) => {
                const weekStart = 90 - (13 - weekIdx) * 7
                const weekDays = heatmapData.slice(Math.max(0, weekStart), Math.min(90, weekStart + 7))
                return (
                  <div key={weekIdx} className="flex flex-col gap-1">
                    {weekDays.map((day, dayIdx) => (
                      <div
                        key={dayIdx}
                        className="w-4 h-4 rounded-sm cursor-pointer transition-transform hover:scale-125 relative group"
                        style={{ backgroundColor: getHeatmapColor(day.count, maxHeatmapCount) }}
                        title={`${day.date}: ${day.count} completion${day.count !== 1 ? 's' : ''}`}
                      >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                          {day.date}: {day.count} completion{day.count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs" style={{ color: tokens.colors.text, opacity: 0.5 }}>
                Less
              </span>
              {['#e0deff', '#c7d2fe', '#a5b4fc', '#818cf8', '#4f46e5'].map((color) => (
                <div key={color} className="w-4 h-4 rounded-sm" style={{ backgroundColor: color }}></div>
              ))}
              <span className="text-xs" style={{ color: tokens.colors.text, opacity: 0.5 }}>
                More
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: tokens.colors.text }}>
            Habit Performance
          </h2>
          {habitStats.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-lg mb-2" style={{ color: tokens.colors.text, opacity: 0.5 }}>
                No habits found
              </p>
              <Button variant="primary" onClick={() => router.push('/dashboard')}>
                Create Your First Habit
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${tokens.colors.border}` }}>
                    {['Habit', 'Completion Rate', 'Current Streak', 'Best Streak', 'Total', 'Last 30 Days'].map((h) => (
                      <th
                        key={h}
                        className="text-left pb-3 pr-4 text-sm font-medium"
                        style={{ color: tokens.colors.text, opacity: 0.6 }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {habitStats.map((stat) => (
                    <tr
                      key={stat.id}
                      className="cursor-pointer hover:bg-opacity-50 transition-colors"
                      style={{ borderBottom: `1px solid ${tokens.colors.border}` }}
                      onClick={() => router.push(`/habits/${stat.id}`)}
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: stat.color }}
                          ></div>
                          <span className="font-medium text-sm" style={{ color: tokens.colors.text }}>
                            {stat.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-16 h-1.5 rounded-full overflow-hidden"
                            style={{ backgroundColor: tokens.colors.border }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${stat.completionRate}%`,
                                backgroundColor:
                                  stat.completionRate >= 80
                                    ? '#10b981'
                                    : stat.completionRate >= 50
                                    ? tokens.colors.primary
                                    : tokens.colors.accent,
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold" style={{ color: tokens.colors.text }}>
                            {stat.completionRate}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1">
                          {stat.currentStreak > 0 && <span>🔥</span>}
                          <span className="text-sm font-semibold" style={{ color: tokens.colors.text }}>
                            {stat.currentStreak}d
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm" style={{ color: tokens.colors.text, opacity: 0.8 }}>
                          {stat.longestStreak}d
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm" style={{ color: tokens.colors.text, opacity: 0.8 }}>
                          {stat.totalCompletions}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-0.5">
                          {stat.last30Days.slice(-21).map((completed, idx) => (
                            <div
                              key={idx}
                              className="w-2 h-2 rounded-sm"
                              style={{
                                backgroundColor: completed ? stat.color : tokens.colors.border,
                              }}
                            ></div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: tokens.colors.text }}>
            Day of Week Analysis
          </h2>
          {completions.length === 0 ? (
            <div className="text-center py-4">
              <p style={{ color: tokens.colors.text, opacity: 0.5 }}>Complete some habits to see patterns</p>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {DAY_LABELS.map((day, dayIdx) => {
                const dayCompletions = completions.filter(
                  (c) => new Date(c.completed_date).getDay() === dayIdx
                )
                const relevantHabitCount = habits.length
                const totalOccurrences = Math.ceil(parseInt(timeRange) / 7)
                const expectedCompletions = totalOccurrences * relevantHabitCount
                const rate = expectedCompletions > 0 ? Math.min(Math.round((dayCompletions.length / expectedCompletions) * 100), 100) : 0
                return (
                  <div key={day} className="flex flex-col items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: tokens.colors.text, opacity: 0.6 }}>
                      {day}
                    </span>
                    <div
                      className="w-full rounded-lg flex items-end justify-center overflow-hidden"
                      style={{ height: '80px', backgroundColor: tokens.colors.border }}
                    >
                      <div
                        className="w-full rounded-t-lg transition-all duration-500"
                        style={{
                          height: `${Math.max(rate, 4)}%`,
                          backgroundColor:
                            rate >= 80 ? '#10b981' : rate >= 50 ? tokens.colors.primary : tokens.colors.accent,
                        }}
                      ></div>
                    </div>
                    <span className="text-xs font-bold" style={{ color: tokens.colors.text }}>
                      {rate}%
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <div className="mt-6 flex justify-end">
          <Button
            variant="secondary"
            onClick={() => {
              const data = {
                exportedAt: new Date().toISOString(),
                timeRange: `${timeRange} days`,
                stats: habitStats,
                weekly: weeklyData,
                monthly: monthlyData,
              }
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `habit-progress-${formatDate(new Date())}.json`
              a.click()
              URL.
revokeObjectURL(url)
            }}
          >
            Export Data
          </button>
        </div>
      </div>
    </div>
  )
}