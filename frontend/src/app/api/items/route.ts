import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const habitId = searchParams.get('habit_id')
    const date = searchParams.get('date')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const completed = searchParams.get('completed')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    let query = supabase
      .from('habits')
      .select('*, habit_completions(*)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (habitId) {
      query = query.eq('id', habitId)
    }

    if (limit) {
      const limitNum = parseInt(limit, 10)
      if (!isNaN(limitNum) && limitNum > 0) {
        query = query.limit(Math.min(limitNum, 100))
      }
    } else {
      query = query.limit(50)
    }

    if (offset) {
      const offsetNum = parseInt(offset, 10)
      if (!isNaN(offsetNum) && offsetNum >= 0) {
        query = query.range(offsetNum, offsetNum + (limit ? parseInt(limit, 10) : 50) - 1)
      }
    }

    const { data: habits, error: habitsError } = await query

    if (habitsError) {
      console.error('Error fetching habits:', habitsError)
      return NextResponse.json(
        { error: 'Failed to fetch habits', details: habitsError.message },
        { status: 500 }
      )
    }

    let completionsQuery = supabase
      .from('habit_completions')
      .select('*')
      .in('habit_id', (habits || []).map((h: any) => h.id))

    if (date) {
      completionsQuery = completionsQuery.eq('completed_date', date)
    }

    if (startDate) {
      completionsQuery = completionsQuery.gte('completed_date', startDate)
    }

    if (endDate) {
      completionsQuery = completionsQuery.lte('completed_date', endDate)
    }

    if (completed !== null && completed !== undefined) {
      const isCompleted = completed === 'true'
      completionsQuery = completionsQuery.eq('completed', isCompleted)
    }

    const { data: completions, error: completionsError } = await completionsQuery

    if (completionsError) {
      console.error('Error fetching completions:', completionsError)
      return NextResponse.json(
        { error: 'Failed to fetch completions', details: completionsError.message },
        { status: 500 }
      )
    }

    const today = new Date().toISOString().split('T')[0]

    const enrichedHabits = (habits || []).map((habit: any) => {
      const habitCompletions = (completions || []).filter(
        (c: any) => c.habit_id === habit.id
      )

      const todayCompletion = habitCompletions.find(
        (c: any) => c.completed_date === today
      )

      const sortedCompletions = [...habitCompletions].sort(
        (a: any, b: any) =>
          new Date(b.completed_date).getTime() - new Date(a.completed_date).getTime()
      )

      let streak = 0
      let currentDate = new Date()
      currentDate.setHours(0, 0, 0, 0)

      for (let i = 0; i < sortedCompletions.length; i++) {
        const completionDate = new Date(sortedCompletions[i].completed_date)
        completionDate.setHours(0, 0, 0, 0)

        const diffDays = Math.round(
          (currentDate.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (diffDays === 0 || diffDays === 1) {
          streak++
          currentDate = completionDate
        } else {
          break
        }
      }

      return {
        ...habit,
        completions: habitCompletions,
        completed_today: todayCompletion ? true : false,
        streak,
      }
    })

    return NextResponse.json(
      {
        data: enrichedHabits,
        count: enrichedHabits.length,
        filters: {
          habit_id: habitId,
          date,
          start_date: startDate,
          end_date: endDate,
          completed,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Unexpected error in GET /api/items:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { name, description, frequency, color, icon, target_days } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: 'name is required and must be a non-empty string' },
        { status: 422 }
      )
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { error: 'Validation failed', details: 'name must be 100 characters or fewer' },
        { status: 422 }
      )
    }

    if (description && typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Validation failed', details: 'description must be a string' },
        { status: 422 }
      )
    }

    if (description && description.length > 500) {
      return NextResponse.json(
        { error: 'Validation failed', details: 'description must be 500 characters or fewer' },
        { status: 422 }
      )
    }

    const validFrequencies = ['daily', 'weekly', 'custom']
    if (frequency && !validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: 'Validation failed', details: `frequency must be one of: ${validFrequencies.join(', ')}` },
        { status: 422 }
      )
    }

    if (color && typeof color !== 'string') {
      return NextResponse.json(
        { error: 'Validation failed', details: 'color must be a string' },
        { status: 422 }
      )
    }

    if (target_days !== undefined) {
      if (!Array.isArray(target_days)) {
        return NextResponse.json(
          { error: 'Validation failed', details: 'target_days must be an array' },
          { status: 422 }
        )
      }

      const validDays = [0, 1, 2, 3, 4, 5, 6]
      const allValid = target_days.every((d: any) => validDays.includes(d))
      if (!allValid) {
        return NextResponse.json(
          { error: 'Validation failed', details: 'target_days must contain values between 0 (Sunday) and 6 (Saturday)' },
          { status: 422 }
        )
      }
    }

    const newHabit = {
      name: name.trim(),
      description: description ? description.trim() : null,
      frequency: frequency || 'daily',
      color: color || '#4f46e5',
      icon: icon || null,
      target_days: target_days || [0, 1, 2, 3, 4, 5, 6],
      user_id: session.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
    }

    const { data: createdHabit, error: insertError } = await supabase
      .from('habits')
      .insert(newHabit)
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting habit:', insertError)

      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Conflict', details: 'A habit with this name already exists' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to create habit', details: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        data: {
          ...createdHabit,
          completions: [],
          completed_today: false,
          streak: 0,
        },
        message: 'Habit created successfully',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Unexpected error in POST /api/items:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}