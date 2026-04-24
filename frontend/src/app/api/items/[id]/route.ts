import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: item, error } = await supabase
      .from('habits')
      .select(`
        *,
        habit_completions (
          id,
          completed_at,
          notes
        )
      `)
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }
      console.error('GET item error:', error)
      return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 })
    }

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    return NextResponse.json({ data: item }, { status: 200 })
  } catch (err) {
    console.error('Unexpected GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const allowedFields = ['name', 'description', 'frequency', 'target_count', 'color', 'icon', 'is_active', 'reminder_time']
    const updateData: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    if ('name' in updateData) {
      const name = updateData['name']
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Name must be a non-empty string' }, { status: 400 })
      }
      if (name.trim().length > 255) {
        return NextResponse.json({ error: 'Name must not exceed 255 characters' }, { status: 400 })
      }
      updateData['name'] = name.trim()
    }

    if ('description' in updateData) {
      const description = updateData['description']
      if (description !== null && typeof description !== 'string') {
        return NextResponse.json({ error: 'Description must be a string or null' }, { status: 400 })
      }
      if (typeof description === 'string' && description.length > 1000) {
        return NextResponse.json({ error: 'Description must not exceed 1000 characters' }, { status: 400 })
      }
    }

    if ('frequency' in updateData) {
      const validFrequencies = ['daily', 'weekly', 'monthly']
      if (!validFrequencies.includes(updateData['frequency'] as string)) {
        return NextResponse.json({ error: 'Frequency must be daily, weekly, or monthly' }, { status: 400 })
      }
    }

    if ('target_count' in updateData) {
      const targetCount = updateData['target_count']
      if (typeof targetCount !== 'number' || !Number.isInteger(targetCount) || targetCount < 1) {
        return NextResponse.json({ error: 'target_count must be a positive integer' }, { status: 400 })
      }
    }

    if ('is_active' in updateData) {
      if (typeof updateData['is_active'] !== 'boolean') {
        return NextResponse.json({ error: 'is_active must be a boolean' }, { status: 400 })
      }
    }

    updateData['updated_at'] = new Date().toISOString()

    const { data: existing, error: fetchError } = await supabase
      .from('habits')
      .select('id, user_id')
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const { data: updated, error: updateError } = await supabase
      .from('habits')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .select()
      .single()

    if (updateError) {
      console.error('PATCH item error:', updateError)
      return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
    }

    return NextResponse.json({ data: updated }, { status: 200 })
  } catch (err) {
    console.error('Unexpected PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: existing, error: fetchError } = await supabase
      .from('habits')
      .select('id, user_id')
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    if (existing.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden: you do not own this item' }, { status: 403 })
    }

    const { error: deleteCompletionsError } = await supabase
      .from('habit_completions')
      .delete()
      .eq('habit_id', params.id)

    if (deleteCompletionsError) {
      console.error('DELETE completions error:', deleteCompletionsError)
      return NextResponse.json({ error: 'Failed to delete associated completions' }, { status: 500 })
    }

    const { error: deleteError } = await supabase
      .from('habits')
      .delete()
      .eq('id', params.id)
      .eq('user_id', session.user.id)

    if (deleteError) {
      console.error('DELETE item error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Item deleted successfully' }, { status: 200 })
  } catch (err) {
    console.error('Unexpected DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}