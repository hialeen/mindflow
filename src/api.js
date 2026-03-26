import { supabase } from './supabase.js'

// ─── GOALS ──────────────────────────────────────────────────────

export async function getGoals() {
  const { data, error } = await supabase
    .from('goals')
    .select(`
      *,
      goal_steps (*)
    `)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function createGoal(goal) {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: user.id,
      title: goal.title,
      category: goal.category,
      deadline: goal.deadline || null,
      why: goal.why || null,
      progress: 0
    })
    .select()
    .single()
  
  if (error) throw error
  
  // Insert steps if any
  if (goal.steps && goal.steps.length > 0) {
    const steps = goal.steps.map((step, index) => ({
      goal_id: data.id,
      text: step.text,
      done: step.done || false,
      position: index
    }))
    
    await supabase.from('goal_steps').insert(steps)
  }
  
  return data
}

export async function updateGoal(id, updates) {
  const { data, error } = await supabase
    .from('goals')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function deleteGoal(id) {
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// ─── GOAL STEPS ─────────────────────────────────────────────────

export async function createGoalStep(goalId, text) {
  const { data, error } = await supabase
    .from('goal_steps')
    .insert({
      goal_id: goalId,
      text,
      done: false
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateGoalStep(id, updates) {
  const { data, error } = await supabase
    .from('goal_steps')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function deleteGoalStep(id) {
  const { error } = await supabase
    .from('goal_steps')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// ─── TASKS ──────────────────────────────────────────────────────

export async function getTasks(date) {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .order('time', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
  
  if (error) throw error
  return data
}

// Get tasks for a date range (e.g., week or month)
export async function getTasksRange(startDate, endDate) {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('time', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
  
  if (error) throw error
  return data
}

export async function createTask(task) {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      text: task.text,
      category: task.category,
      date: task.date,
      time: task.time || null,
      notes: task.notes || null,
      done: false
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateTask(id, updates) {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function deleteTask(id) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// ─── MOODS ──────────────────────────────────────────────────────

export async function getMoods(startDate, endDate) {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('moods')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate)
  
  if (error) throw error
  return data
}

export async function setMood(date, value) {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('moods')
    .upsert({
      user_id: user.id,
      date,
      value
    }, {
      onConflict: 'user_id,date'
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ─── REFLECTIONS ────────────────────────────────────────────────

export async function getReflection(date) {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('reflections')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function saveReflection(date, reflection) {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('reflections')
    .upsert({
      user_id: user.id,
      date,
      ...reflection,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,date'
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ─── NOTES ──────────────────────────────────────────────────────

export async function getNote(date) {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function saveNote(date, content) {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('notes')
    .upsert({
      user_id: user.id,
      date,
      content,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,date'
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ─── GRATITUDE ──────────────────────────────────────────────────

export async function getGratitudes() {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('gratitude')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)
  
  if (error) throw error
  return data
}

export async function createGratitude(text, date) {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('gratitude')
    .insert({
      user_id: user.id,
      text,
      date
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ─── HABITS ─────────────────────────────────────────────────────

export async function getHabits() {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', user.id)
    .order('position', { ascending: true })
  
  if (error) throw error
  return data
}

export async function createHabit(name) {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('habits')
    .insert({
      user_id: user.id,
      name
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getHabitLogs(habitIds, year, month) {
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-31`
  
  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .in('habit_id', habitIds)
    .gte('date', startDate)
    .lte('date', endDate)
  
  if (error) throw error
  return data
}

export async function toggleHabitLog(habitId, date) {
  // Check if exists
  const { data: existing } = await supabase
    .from('habit_logs')
    .select('id')
    .eq('habit_id', habitId)
    .eq('date', date)
    .single()
  
  if (existing) {
    // Delete
    await supabase.from('habit_logs').delete().eq('id', existing.id)
    return null
  } else {
    // Create
    const { data, error } = await supabase
      .from('habit_logs')
      .insert({ habit_id: habitId, date })
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}

// ─── EVENTS ─────────────────────────────────────────────────────

export async function getEvents(startDate, endDate) {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate)
  
  if (error) throw error
  return data
}

export async function createEvent(event) {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('events')
    .insert({
      user_id: user.id,
      ...event
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ─── WEEK REFLECTIONS ───────────────────────────────────────────

export async function getWeekReflection(weekStart) {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('week_reflections')
    .select('*')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function saveWeekReflection(weekStart, reflection) {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('week_reflections')
    .upsert({
      user_id: user.id,
      week_start: weekStart,
      ...reflection,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,week_start'
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ─── MONTH REFLECTIONS ──────────────────────────────────────────

export async function getMonthReflection(year, month) {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('month_reflections')
    .select('*')
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('month', month)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function saveMonthReflection(year, month, reflection) {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('month_reflections')
    .upsert({
      user_id: user.id,
      year,
      month,
      ...reflection,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,year,month'
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ─── BREATH LOGS ────────────────────────────────────────────────

export async function createBreathLog(type, notes, date) {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('breath_logs')
    .insert({
      user_id: user.id,
      type,
      notes,
      date
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}
