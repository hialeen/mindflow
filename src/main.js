import { supabase, signIn, signUp, signInWithGoogle, signOut, getSession, onAuthStateChange } from './supabase.js'
import * as api from './api.js'

// ─── STATE ───────────────────────────────────────────────────────
let currentUser = null
let goals = []
let tasks = []
let calendarTasks = []
let weekTasks = []
let gratitudes = []
let events = []
let goalFilter = 'all'
let gModalSteps = []
let editingGoalId = null

// Calendar state
let calendarDate = new Date()
let selectedDate = null

// Week state
let weekStartDate = null

// Month reflection state
let reflectionMonth = new Date()

// ─── DATE UTILS ──────────────────────────────────────────────────
const today = new Date()
const todayKey = today.toISOString().split('T')[0]
const daysNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const daysFullNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function fmtDate(d) {
  return `${d.getDate()} de ${monthNames[d.getMonth()]} de ${d.getFullYear()}`
}

function dateKey(d) {
  return d.toISOString().split('T')[0]
}

function getWeekStart(d) {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() - day)
  return date
}

function getWeekEnd(d) {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() + (6 - day))
  return date
}

function formatTime(time) {
  if (!time) return ''
  return time.substring(0, 5)
}

// ─── QUOTES ──────────────────────────────────────────────────────
const quotes = [
  "Entre estímulo e resposta há um espaço. Nesse espaço está o nosso poder de escolher.",
  "Não é o que acontece com você, mas como você responde que importa.",
  "A autoconsciência é o início de toda transformação.",
  "Seja curioso sobre seus pensamentos, não controlado por eles.",
  "Cada dia é uma nova oportunidade de agir de acordo com seus valores.",
  "A presença plena é o presente mais valioso que você pode dar a si mesmo.",
  "Organize o externo quando o interno está claro.",
  "Um pequeno passo consistente supera grandes saltos esporádicos.",
  "Observe seus padrões com gentileza, não com julgamento.",
  "O progresso não é linear — e tudo bem."
]

const moodEmojis = ['😢', '😔', '😐', '🙂', '😊']

// ─── TOAST ───────────────────────────────────────────────────────
function toast(msg) {
  const el = document.getElementById('toast')
  if (el) {
    el.textContent = msg
    el.classList.add('show')
    setTimeout(() => el.classList.remove('show'), 2500)
  }
}

// ─── MOBILE MENU ─────────────────────────────────────────────────
window.toggleMobileMenu = function() {
  document.getElementById('sidebar')?.classList.toggle('open')
  document.getElementById('mobile-overlay')?.classList.toggle('open')
}

window.closeMobileMenu = function() {
  document.getElementById('sidebar')?.classList.remove('open')
  document.getElementById('mobile-overlay')?.classList.remove('open')
}

// ─── AUTH ────────────────────────────────────────────────────────
window.showAuthTab = function(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'))
  document.querySelector(`.auth-tab[onclick*="${tab}"]`)?.classList.add('active')
  
  const loginForm = document.getElementById('login-form')
  const signupForm = document.getElementById('signup-form')
  if (loginForm) loginForm.style.display = tab === 'login' ? 'flex' : 'none'
  if (signupForm) signupForm.style.display = tab === 'signup' ? 'flex' : 'none'
  
  const loginError = document.getElementById('login-error')
  const signupError = document.getElementById('signup-error')
  const signupSuccess = document.getElementById('signup-success')
  if (loginError) loginError.textContent = ''
  if (signupError) signupError.textContent = ''
  if (signupSuccess) signupSuccess.textContent = ''
}

window.handleLogin = async function(e) {
  e.preventDefault()
  const email = document.getElementById('login-email')?.value
  const password = document.getElementById('login-password')?.value
  const errorEl = document.getElementById('login-error')
  
  if (errorEl) errorEl.textContent = ''
  
  const { data, error } = await signIn(email, password)
  
  if (error) {
    if (errorEl) {
      errorEl.textContent = error.message === 'Invalid login credentials' 
        ? 'Email ou senha incorretos' 
        : error.message
    }
    return
  }
  
  showApp(data.user)
}

window.handleSignup = async function(e) {
  e.preventDefault()
  const email = document.getElementById('signup-email')?.value
  const password = document.getElementById('signup-password')?.value
  const confirmPassword = document.getElementById('signup-password-confirm')?.value
  const errorEl = document.getElementById('signup-error')
  const successEl = document.getElementById('signup-success')
  
  if (errorEl) errorEl.textContent = ''
  if (successEl) successEl.textContent = ''
  
  if (password !== confirmPassword) {
    if (errorEl) errorEl.textContent = 'As senhas não coincidem'
    return
  }
  
  const { data, error } = await signUp(email, password)
  
  if (error) {
    if (errorEl) errorEl.textContent = error.message
    return
  }
  
  if (successEl) successEl.textContent = 'Conta criada! Verifique seu email para confirmar.'
}

window.handleGoogleLogin = async function() {
  const { error } = await signInWithGoogle()
  if (error) {
    const errorEl = document.getElementById('login-error')
    if (errorEl) errorEl.textContent = error.message
  }
}

window.handleLogout = async function() {
  await signOut()
  showAuth()
}

function showAuth() {
  const authScreen = document.getElementById('auth-screen')
  const app = document.getElementById('app')
  if (authScreen) authScreen.style.display = 'flex'
  if (app) app.style.display = 'none'
}

function showApp(user) {
  currentUser = user
  const authScreen = document.getElementById('auth-screen')
  const app = document.getElementById('app')
  if (authScreen) authScreen.style.display = 'none'
  if (app) app.style.display = 'flex'
  
  const userInfo = document.getElementById('user-info')
  if (userInfo) userInfo.textContent = user.email
  
  const hour = new Date().getHours()
  let greeting = 'Bom dia'
  if (hour >= 12 && hour < 18) greeting = 'Boa tarde'
  else if (hour >= 18) greeting = 'Boa noite'
  
  const greetingEl = document.getElementById('greeting')
  if (greetingEl) greetingEl.textContent = greeting + ' ✦'
  
  navigate('dashboard')
}

// ─── NAVIGATION ──────────────────────────────────────────────────
window.navigate = function(view) {
  closeMobileMenu()
  
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'))
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))
  
  const viewEl = document.getElementById('view-' + view)
  if (viewEl) viewEl.classList.add('active')
  
  document.querySelector(`.nav-item[onclick*="${view}"]`)?.classList.add('active')
  
  if (view === 'dashboard') loadDashboard()
  else if (view === 'daily') loadDaily()
  else if (view === 'goals') loadGoals()
  else if (view === 'gratitude') loadGratitude()
  else if (view === 'calendar') loadCalendar()
  else if (view === 'weekly') loadWeekly()
  else if (view === 'monthly') loadMonthly()
}

// ─── TASK MODAL ──────────────────────────────────────────────────
window.openTaskModal = function(presetDate = null) {
  const modal = document.getElementById('taskModal')
  const title = document.getElementById('taskModalTitle')
  const tText = document.getElementById('tText')
  const tDate = document.getElementById('tDate')
  const tTime = document.getElementById('tTime')
  const tCat = document.getElementById('tCat')
  const tNotes = document.getElementById('tNotes')
  
  if (title) title.textContent = 'Nova tarefa'
  if (tText) tText.value = ''
  if (tDate) tDate.value = presetDate || todayKey
  if (tTime) tTime.value = ''
  if (tCat) tCat.value = 'pessoal'
  if (tNotes) tNotes.value = ''
  if (modal) modal.classList.add('open')
}

window.openTaskModalForDate = function() {
  const date = selectedDate ? dateKey(selectedDate) : todayKey
  openTaskModal(date)
}

window.closeTaskModal = function() {
  document.getElementById('taskModal')?.classList.remove('open')
}

window.saveTask = async function() {
  const text = document.getElementById('tText')?.value.trim()
  if (!text) return
  
  const taskData = {
    text,
    date: document.getElementById('tDate')?.value || todayKey,
    time: document.getElementById('tTime')?.value || null,
    category: document.getElementById('tCat')?.value || 'pessoal',
    notes: document.getElementById('tNotes')?.value || null
  }
  
  try {
    await api.createTask(taskData)
    closeTaskModal()
    toast('Tarefa criada ✓')
    
    // Refresh current view
    const activeView = document.querySelector('.view.active')?.id
    if (activeView === 'view-dashboard') loadDashboard()
    else if (activeView === 'view-daily') loadDaily()
    else if (activeView === 'view-calendar') loadCalendar()
    else if (activeView === 'view-weekly') loadWeekly()
  } catch (err) {
    console.error('Error saving task:', err)
    toast('Erro ao criar tarefa')
  }
}

// ─── DASHBOARD ───────────────────────────────────────────────────
async function loadDashboard() {
  const todayLabel = document.getElementById('todayLabel')
  const dailyQuote = document.getElementById('dailyQuote')
  
  if (todayLabel) todayLabel.textContent = fmtDate(today) + ' — ' + daysNames[today.getDay()]
  if (dailyQuote) dailyQuote.textContent = quotes[today.getDate() % quotes.length]
  
  try {
    tasks = await api.getTasks(todayKey)
    const done = tasks.filter(t => t.done).length
    
    const statTasksDone = document.getElementById('statTasksDone')
    if (statTasksDone) statTasksDone.textContent = `${done}/${tasks.length}`
    
    goals = await api.getGoals()
    const activeGoals = goals.filter(g => calcProgress(g.goal_steps) < 100)
    
    const statGoals = document.getElementById('statGoals')
    if (statGoals) statGoals.textContent = activeGoals.length
    
    renderDashGoals()
    
    const weekAgo = new Date(today)
    weekAgo.setDate(today.getDate() - 6)
    const moods = await api.getMoods(weekAgo.toISOString().split('T')[0], todayKey)
    renderMoodChart(moods)
    
    const statStreak = document.getElementById('statStreak')
    if (statStreak) statStreak.textContent = tasks.length > 0 ? '1' : '0'
    
  } catch (err) {
    console.error('Error loading dashboard:', err)
  }
}

function renderDashGoals() {
  const list = document.getElementById('dashGoalsList')
  if (!list) return
  
  if (goals.length === 0) {
    list.innerHTML = '<div style="font-size:13px;color:var(--text3);padding:8px 0">Nenhuma meta ainda</div>'
    return
  }
  
  list.innerHTML = goals.slice(0, 4).map(g => {
    const pct = calcProgress(g.goal_steps)
    return `<div class="progress-item">
      <div class="progress-label">${g.title}</div>
      <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
      <div class="progress-pct">${pct}%</div>
    </div>`
  }).join('')
}

function renderMoodChart(moods) {
  const chart = document.getElementById('moodChart')
  if (!chart) return
  
  chart.innerHTML = ''
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = d.toISOString().split('T')[0]
    const mood = moods.find(m => m.date === key)
    const v = mood?.value || 0
    const h = v ? Math.round((v / 5) * 60) : 4
    const col = v ? 'var(--accent3)' : 'var(--bg4)'
    
    chart.innerHTML += `<div class="mood-bar" style="background:${col};height:${h}px;opacity:${v?1:0.4}" title="${daysNames[d.getDay()]}: ${v||'?'}"></div>`
  }
}

function calcProgress(steps) {
  if (!steps || steps.length === 0) return 0
  return Math.round((steps.filter(s => s.done).length / steps.length) * 100)
}

// ─── DAILY ───────────────────────────────────────────────────────
async function loadDaily() {
  const dailyDateLabel = document.getElementById('dailyDateLabel')
  if (dailyDateLabel) dailyDateLabel.textContent = fmtDate(today)
  
  try {
    tasks = await api.getTasks(todayKey)
    renderTasks()
    
    const reflection = await api.getReflection(todayKey)
    const r_morning = document.getElementById('r_morning')
    const r_thoughts = document.getElementById('r_thoughts')
    const r_emotions = document.getElementById('r_emotions')
    const r_selfcare = document.getElementById('r_selfcare')
    const r_evening = document.getElementById('r_evening')
    
    if (reflection) {
      if (r_morning) r_morning.value = reflection.morning || ''
      if (r_thoughts) r_thoughts.value = reflection.thoughts || ''
      if (r_emotions) r_emotions.value = reflection.emotions || ''
      if (r_selfcare) r_selfcare.value = reflection.selfcare || ''
      if (r_evening) r_evening.value = reflection.evening || ''
    } else {
      if (r_morning) r_morning.value = ''
      if (r_thoughts) r_thoughts.value = ''
      if (r_emotions) r_emotions.value = ''
      if (r_selfcare) r_selfcare.value = ''
      if (r_evening) r_evening.value = ''
    }
    
    const note = await api.getNote(todayKey)
    const freeNotes = document.getElementById('freeNotes')
    if (freeNotes) freeNotes.value = note?.content || ''
    
  } catch (err) {
    console.error('Error loading daily:', err)
  }
}

function renderTasks() {
  const list = document.getElementById('taskList')
  if (!list) return
  
  if (tasks.length === 0) {
    list.innerHTML = '<div style="font-size:13px;color:var(--text3);padding:16px;text-align:center">Nenhuma tarefa para hoje. <a href="#" onclick="openTaskModal();return false" style="color:var(--accent)">Criar uma?</a></div>'
    return
  }
  
  list.innerHTML = tasks.map(t => `
    <div class="task-item ${t.done ? 'done' : ''}" data-id="${t.id}">
      <div class="task-check" onclick="toggleTask('${t.id}')">
        ${t.done ? '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" stroke-width="2"><path d="M1.5 5l2.5 2.5 4.5-5"/></svg>' : ''}
      </div>
      <div style="flex:1;min-width:0">
        <div class="task-text">${t.text}</div>
        ${t.notes ? `<div class="task-notes">${t.notes}</div>` : ''}
      </div>
      ${t.time ? `<div class="task-time">${formatTime(t.time)}</div>` : ''}
      <div class="task-tag ${t.category}">${t.category}</div>
      <div class="task-del" onclick="deleteTask('${t.id}')">✕</div>
    </div>
  `).join('')
}

window.toggleTask = async function(id) {
  const task = tasks.find(t => t.id === id) || calendarTasks.find(t => t.id === id) || weekTasks.find(t => t.id === id)
  if (!task) return
  
  try {
    await api.updateTask(id, { done: !task.done })
    task.done = !task.done
    
    const activeView = document.querySelector('.view.active')?.id
    if (activeView === 'view-daily') renderTasks()
    else if (activeView === 'view-calendar') renderDayTasks()
    else if (activeView === 'view-weekly') renderWeekTasks()
  } catch (err) {
    console.error('Error toggling task:', err)
  }
}

window.deleteTask = async function(id) {
  try {
    await api.deleteTask(id)
    tasks = tasks.filter(t => t.id !== id)
    calendarTasks = calendarTasks.filter(t => t.id !== id)
    weekTasks = weekTasks.filter(t => t.id !== id)
    
    const activeView = document.querySelector('.view.active')?.id
    if (activeView === 'view-daily') renderTasks()
    else if (activeView === 'view-calendar') {
      renderCalendarDots()
      renderDayTasks()
    }
    else if (activeView === 'view-weekly') renderWeekTasks()
    
    toast('Tarefa removida')
  } catch (err) {
    console.error('Error deleting task:', err)
  }
}

window.switchTab = function(name) {
  document.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'))
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'))
  event.target.classList.add('active')
  document.getElementById('tab-' + name)?.classList.add('active')
}

window.saveReflections = async function() {
  try {
    await api.saveReflection(todayKey, {
      morning: document.getElementById('r_morning')?.value || '',
      thoughts: document.getElementById('r_thoughts')?.value || '',
      emotions: document.getElementById('r_emotions')?.value || '',
      selfcare: document.getElementById('r_selfcare')?.value || '',
      evening: document.getElementById('r_evening')?.value || ''
    })
    toast('Reflexões salvas ✓')
  } catch (err) {
    console.error('Error saving reflections:', err)
    toast('Erro ao salvar')
  }
}

window.saveFreeNotes = async function() {
  try {
    await api.saveNote(todayKey, document.getElementById('freeNotes')?.value || '')
    const notesStatus = document.getElementById('notesStatus')
    if (notesStatus) notesStatus.textContent = 'Salvo às ' + new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})
    toast('Anotações salvas ✓')
  } catch (err) {
    console.error('Error saving notes:', err)
    toast('Erro ao salvar')
  }
}

// ─── CALENDAR ────────────────────────────────────────────────────
async function loadCalendar() {
  selectedDate = selectedDate || new Date(today)
  renderCalendar()
  await loadCalendarData()
}

function renderCalendar() {
  const grid = document.getElementById('calendarGrid')
  const monthLabel = document.getElementById('calendarMonthLabel')
  if (!grid) return
  
  const year = calendarDate.getFullYear()
  const month = calendarDate.getMonth()
  
  if (monthLabel) monthLabel.textContent = `${monthNames[month]} de ${year}`
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDay = firstDay.getDay()
  const totalDays = lastDay.getDate()
  
  grid.innerHTML = ''
  
  const prevMonth = new Date(year, month, 0)
  for (let i = startDay - 1; i >= 0; i--) {
    const day = prevMonth.getDate() - i
    const d = new Date(year, month - 1, day)
    grid.innerHTML += createDayCell(d, true)
  }
  
  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, month, day)
    grid.innerHTML += createDayCell(d, false)
  }
  
  const remaining = 42 - grid.children.length
  for (let day = 1; day <= remaining; day++) {
    const d = new Date(year, month + 1, day)
    grid.innerHTML += createDayCell(d, true)
  }
  
  updateSelectedDayLabel()
}

function createDayCell(d, isOtherMonth) {
  const key = dateKey(d)
  const isToday = key === todayKey
  const isSelected = selectedDate && key === dateKey(selectedDate)
  
  let classes = 'calendar-day'
  if (isOtherMonth) classes += ' other-month'
  if (isToday) classes += ' today'
  if (isSelected) classes += ' selected'
  
  return `<div class="${classes}" onclick="selectDay('${key}')" data-date="${key}">
    <div class="calendar-day-num">${d.getDate()}</div>
    <div class="calendar-day-dots" id="dots-${key}"></div>
  </div>`
}

async function loadCalendarData() {
  const year = calendarDate.getFullYear()
  const month = calendarDate.getMonth()
  const startDate = new Date(year, month, 1)
  const endDate = new Date(year, month + 1, 0)
  
  try {
    calendarTasks = await api.getTasksRange(dateKey(startDate), dateKey(endDate))
    renderCalendarDots()
    renderDayTasks()
  } catch (err) {
    console.error('Error loading calendar data:', err)
  }
}

function renderCalendarDots() {
  document.querySelectorAll('.calendar-day-dots').forEach(el => el.innerHTML = '')
  
  const tasksByDate = {}
  calendarTasks.forEach(t => {
    if (!tasksByDate[t.date]) tasksByDate[t.date] = []
    tasksByDate[t.date].push(t)
  })
  
  Object.keys(tasksByDate).forEach(date => {
    const dotsEl = document.getElementById('dots-' + date)
    if (dotsEl) {
      const count = tasksByDate[date].length
      const hasPending = tasksByDate[date].some(t => !t.done)
      dotsEl.innerHTML += `<div class="calendar-dot task" style="background:${hasPending ? 'var(--blue)' : 'var(--green)'}" title="${count} tarefa${count > 1 ? 's' : ''}"></div>`
    }
  })
}

function renderDayTasks() {
  const container = document.getElementById('dayTasks')
  if (!container || !selectedDate) return
  
  const key = dateKey(selectedDate)
  const dayTasks = calendarTasks.filter(t => t.date === key)
  
  if (dayTasks.length === 0) {
    container.innerHTML = '<div class="no-events">Nenhuma tarefa neste dia</div>'
    return
  }
  
  container.innerHTML = dayTasks.map(t => `
    <div class="task-item ${t.done ? 'done' : ''}" style="margin-bottom:6px">
      <div class="task-check" onclick="toggleTask('${t.id}')">
        ${t.done ? '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" stroke-width="2"><path d="M1.5 5l2.5 2.5 4.5-5"/></svg>' : ''}
      </div>
      <div style="flex:1;min-width:0">
        <div class="task-text">${t.text}</div>
        ${t.notes ? `<div class="task-notes">${t.notes}</div>` : ''}
      </div>
      ${t.time ? `<div class="task-time">${formatTime(t.time)}</div>` : ''}
      <div class="task-del" onclick="deleteTask('${t.id}')">✕</div>
    </div>
  `).join('')
}

function updateSelectedDayLabel() {
  const label = document.getElementById('selectedDayLabel')
  if (!label || !selectedDate) return
  label.textContent = `${daysFullNames[selectedDate.getDay()]}, ${selectedDate.getDate()} de ${monthNames[selectedDate.getMonth()]}`
}

window.selectDay = function(key) {
  selectedDate = new Date(key + 'T12:00:00')
  document.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('selected'))
  document.querySelector(`[data-date="${key}"]`)?.classList.add('selected')
  updateSelectedDayLabel()
  renderDayTasks()
}

window.changeMonth = function(delta) {
  calendarDate.setMonth(calendarDate.getMonth() + delta)
  renderCalendar()
  loadCalendarData()
}

window.goToToday = function() {
  calendarDate = new Date(today)
  selectedDate = new Date(today)
  renderCalendar()
  loadCalendarData()
}

window.openEventModal = function() {
  const eventTitle = document.getElementById('eventTitle')
  const eventDate = document.getElementById('eventDate')
  const eventType = document.getElementById('eventType')
  const eventNotes = document.getElementById('eventNotes')
  const modal = document.getElementById('eventModal')
  
  if (eventTitle) eventTitle.value = ''
  if (eventDate) eventDate.value = selectedDate ? dateKey(selectedDate) : todayKey
  if (eventType) eventType.value = 'personal'
  if (eventNotes) eventNotes.value = ''
  if (modal) modal.classList.add('open')
}

window.closeEventModal = function() {
  document.getElementById('eventModal')?.classList.remove('open')
}

window.saveEvent = async function() {
  const title = document.getElementById('eventTitle')?.value.trim()
  if (!title) return
  
  const eventData = {
    title,
    date: document.getElementById('eventDate')?.value || todayKey,
    type: document.getElementById('eventType')?.value || 'personal',
    notes: document.getElementById('eventNotes')?.value || ''
  }
  
  try {
    const newEvent = await api.createEvent(eventData)
    events.push(newEvent)
    closeEventModal()
    renderCalendarDots()
    toast('Evento criado ✓')
  } catch (err) {
    console.error('Error saving event:', err)
    toast('Erro ao criar evento')
  }
}

// ─── WEEKLY ──────────────────────────────────────────────────────
async function loadWeekly() {
  if (!weekStartDate) {
    weekStartDate = getWeekStart(today)
  }
  
  const weekEnd = getWeekEnd(weekStartDate)
  const weekLabel = document.getElementById('weekLabel')
  if (weekLabel) weekLabel.textContent = `${weekStartDate.getDate()} de ${monthNames[weekStartDate.getMonth()]} — ${weekEnd.getDate()} de ${monthNames[weekEnd.getMonth()]}`
  
  try {
    const startKey = dateKey(weekStartDate)
    const endKey = dateKey(weekEnd)
    
    const [weekMoods, tasksData] = await Promise.all([
      api.getMoods(startKey, endKey),
      api.getTasksRange(startKey, endKey)
    ])
    
    weekTasks = tasksData
    
    renderWeekDays(weekMoods)
    renderWeekTasks()
    
    const weekReflection = await api.getWeekReflection(startKey)
    const weekIntention = document.getElementById('weekIntention')
    const weekReview = document.getElementById('weekReview')
    
    if (weekReflection) {
      if (weekIntention) weekIntention.value = weekReflection.intention || ''
      if (weekReview) weekReview.value = weekReflection.review || ''
    } else {
      if (weekIntention) weekIntention.value = ''
      if (weekReview) weekReview.value = ''
    }
  } catch (err) {
    console.error('Error loading weekly:', err)
  }
}

function renderWeekDays(moods) {
  const container = document.getElementById('weekDays')
  if (!container) return
  
  container.innerHTML = ''
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStartDate)
    d.setDate(weekStartDate.getDate() + i)
    const key = dateKey(d)
    const isToday = key === todayKey
    const mood = moods.find(m => m.date === key)
    const dayTasks = weekTasks.filter(t => t.date === key)
    const pending = dayTasks.filter(t => !t.done).length
    
    container.innerHTML += `
      <div class="week-day-card ${isToday ? 'today' : ''}" onclick="openTaskModal('${key}')">
        <div class="week-day-name">${daysNames[d.getDay()]}</div>
        <div class="week-day-num">${d.getDate()}</div>
        ${dayTasks.length > 0 
          ? `<div class="week-day-tasks">${pending > 0 ? pending + ' pendente' + (pending > 1 ? 's' : '') : '✓'}</div>`
          : '<div class="week-day-tasks" style="opacity:0.3">—</div>'
        }
        ${mood ? `<div class="week-day-mood">${moodEmojis[mood.value - 1]}</div>` : ''}
      </div>
    `
  }
}

function renderWeekTasks() {
  const container = document.getElementById('weekTasksList')
  if (!container) return
  
  if (weekTasks.length === 0) {
    container.innerHTML = '<div style="font-size:13px;color:var(--text3);padding:16px;text-align:center">Nenhuma tarefa esta semana. <a href="#" onclick="openTaskModal();return false" style="color:var(--accent)">Criar uma?</a></div>'
    return
  }
  
  const grouped = {}
  weekTasks.forEach(t => {
    if (!grouped[t.date]) grouped[t.date] = []
    grouped[t.date].push(t)
  })
  
  const sortedDates = Object.keys(grouped).sort()
  
  container.innerHTML = sortedDates.map(date => {
    const d = new Date(date + 'T12:00:00')
    const isToday = date === todayKey
    const dayName = isToday ? 'Hoje' : `${daysNames[d.getDay()]}, ${d.getDate()}`
    
    return `
      <div style="margin-bottom:16px">
        <div style="font-size:11px;text-transform:uppercase;color:${isToday ? 'var(--accent)' : 'var(--text3)'};margin-bottom:8px;font-weight:500">${dayName}</div>
        ${grouped[date].map(t => `
          <div class="task-item ${t.done ? 'done' : ''}" style="margin-bottom:6px">
            <div class="task-check" onclick="toggleTask('${t.id}')">
              ${t.done ? '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" stroke-width="2"><path d="M1.5 5l2.5 2.5 4.5-5"/></svg>' : ''}
            </div>
            <div style="flex:1;min-width:0">
              <div class="task-text">${t.text}</div>
              ${t.notes ? `<div class="task-notes">${t.notes}</div>` : ''}
            </div>
            ${t.time ? `<div class="task-time">${formatTime(t.time)}</div>` : ''}
            <div class="task-tag ${t.category}">${t.category}</div>
            <div class="task-del" onclick="deleteTask('${t.id}')">✕</div>
          </div>
        `).join('')}
      </div>
    `
  }).join('')
}

window.changeWeek = function(delta) {
  weekStartDate.setDate(weekStartDate.getDate() + (delta * 7))
  loadWeekly()
}

window.goToCurrentWeek = function() {
  weekStartDate = getWeekStart(today)
  loadWeekly()
}

window.saveWeekReflection = async function() {
  const startKey = dateKey(weekStartDate)
  
  try {
    await api.saveWeekReflection(startKey, {
      intention: document.getElementById('weekIntention')?.value || '',
      review: document.getElementById('weekReview')?.value || ''
    })
    toast('Reflexão semanal salva ✓')
  } catch (err) {
    console.error('Error saving week reflection:', err)
    toast('Erro ao salvar')
  }
}

// ─── MONTHLY ─────────────────────────────────────────────────────
async function loadMonthly() {
  const year = reflectionMonth.getFullYear()
  const month = reflectionMonth.getMonth()
  
  const monthLabel = document.getElementById('monthLabel')
  if (monthLabel) monthLabel.textContent = `${monthNames[month]} de ${year}`
  
  try {
    const startDate = new Date(year, month, 1)
    const endDate = new Date(year, month + 1, 0)
    const startKey = dateKey(startDate)
    const endKey = dateKey(endDate)
    
    const [monthGoals, monthMoods] = await Promise.all([
      api.getGoals(),
      api.getMoods(startKey, endKey)
    ])
    
    renderMonthStats(monthGoals, monthMoods, endDate.getDate())
    
    const monthReflection = await api.getMonthReflection(year, month + 1)
    const monthWin = document.getElementById('monthWin')
    const monthLearning = document.getElementById('monthLearning')
    
    if (monthReflection) {
      if (monthWin) monthWin.value = monthReflection.win || ''
      if (monthLearning) monthLearning.value = monthReflection.learning || ''
    } else {
      if (monthWin) monthWin.value = ''
      if (monthLearning) monthLearning.value = ''
    }
  } catch (err) {
    console.error('Error loading monthly:', err)
  }
}

function renderMonthStats(goals, moods, daysInMonth) {
  const monthStats = document.getElementById('monthStats')
  if (!monthStats) return
  
  const completedGoals = goals.filter(g => calcProgress(g.goal_steps) === 100).length
  const avgMood = moods.length > 0 
    ? (moods.reduce((sum, m) => sum + m.value, 0) / moods.length).toFixed(1)
    : '—'
  const moodDays = moods.length
  
  monthStats.innerHTML = `
    <div class="month-stat">
      <div class="month-stat-value">${goals.length}</div>
      <div class="month-stat-label">Metas ativas</div>
    </div>
    <div class="month-stat">
      <div class="month-stat-value">${completedGoals}</div>
      <div class="month-stat-label">Metas concluídas</div>
    </div>
    <div class="month-stat">
      <div class="month-stat-value">${avgMood}</div>
      <div class="month-stat-label">Humor médio</div>
    </div>
    <div class="month-stat">
      <div class="month-stat-value">${moodDays}/${daysInMonth}</div>
      <div class="month-stat-label">Dias registrados</div>
    </div>
  `
}

window.changeReflectionMonth = function(delta) {
  reflectionMonth.setMonth(reflectionMonth.getMonth() + delta)
  loadMonthly()
}

window.goToCurrentMonth = function() {
  reflectionMonth = new Date(today)
  loadMonthly()
}

window.saveMonthReflection = async function() {
  const year = reflectionMonth.getFullYear()
  const month = reflectionMonth.getMonth() + 1
  
  try {
    await api.saveMonthReflection(year, month, {
      win: document.getElementById('monthWin')?.value || '',
      learning: document.getElementById('monthLearning')?.value || ''
    })
    toast('Reflexão mensal salva ✓')
  } catch (err) {
    console.error('Error saving month reflection:', err)
    toast('Erro ao salvar')
  }
}

// ─── GOALS ───────────────────────────────────────────────────────
async function loadGoals() {
  try {
    goals = await api.getGoals()
    renderGoals()
  } catch (err) {
    console.error('Error loading goals:', err)
  }
}

function renderGoals() {
  const list = document.getElementById('goalsList')
  if (!list) return
  
  const filtered = goalFilter === 'all' ? goals : goals.filter(g => g.category === goalFilter)
  
  if (filtered.length === 0) {
    list.innerHTML = '<div style="font-size:14px;color:var(--text3);padding:32px;text-align:center;font-family:var(--serif);font-style:italic">Nenhuma meta aqui ainda</div>'
    return
  }
  
  const catColors = {pessoal:'var(--blue)', saude:'var(--green)', profissional:'var(--amber)', relacional:'var(--teal)'}
  
  list.innerHTML = filtered.map(g => {
    const steps = g.goal_steps || []
    const pct = calcProgress(steps)
    const done = steps.filter(s => s.done).length
    
    return `<div class="goal-card" onclick="openGoalDetail('${g.id}')">
      <div class="goal-header">
        <div class="goal-title">${g.title}</div>
        <div class="goal-category" style="background:rgba(0,0,0,0.06);color:${catColors[g.category]||'var(--text2)'}">${g.category}</div>
        ${g.deadline ? `<div class="goal-deadline">${g.deadline}</div>` : ''}
      </div>
      <div class="goal-progress-wrap"><div class="goal-progress-fill" style="width:${pct}%"></div></div>
      <div class="goal-footer">
        <span>${pct}% concluído</span>
        <span>${done}/${steps.length} passos</span>
      </div>
    </div>`
  }).join('')
}

window.filterGoals = function(cat) {
  goalFilter = cat
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'))
  event.target.classList.add('active')
  renderGoals()
}

window.openGoalModal = function(id = null) {
  editingGoalId = id
  gModalSteps = []
  
  const goalModalTitle = document.getElementById('goalModalTitle')
  const gTitle = document.getElementById('gTitle')
  const gCat = document.getElementById('gCat')
  const gDeadline = document.getElementById('gDeadline')
  const gWhy = document.getElementById('gWhy')
  const gStepInput = document.getElementById('gStepInput')
  const goalModal = document.getElementById('goalModal')
  
  if (id) {
    const goal = goals.find(g => g.id === id)
    if (goal) {
      if (goalModalTitle) goalModalTitle.textContent = 'Editar meta'
      if (gTitle) gTitle.value = goal.title
      if (gCat) gCat.value = goal.category
      if (gDeadline) gDeadline.value = goal.deadline || ''
      if (gWhy) gWhy.value = goal.why || ''
      gModalSteps = (goal.goal_steps || []).map(s => ({...s}))
    }
  } else {
    if (goalModalTitle) goalModalTitle.textContent = 'Nova meta'
    if (gTitle) gTitle.value = ''
    if (gCat) gCat.value = 'pessoal'
    if (gDeadline) gDeadline.value = ''
    if (gWhy) gWhy.value = ''
  }
  
  if (gStepInput) gStepInput.value = ''
  renderModalSteps()
  if (goalModal) goalModal.classList.add('open')
}

window.closeGoalModal = function() {
  document.getElementById('goalModal')?.classList.remove('open')
  editingGoalId = null
}

function renderModalSteps() {
  const list = document.getElementById('gStepsList')
  const label = document.getElementById('gProgressLabel')
  if (!list) return
  
  const pct = calcProgress(gModalSteps)
  if (label) label.textContent = pct + '%'
  
  if (gModalSteps.length === 0) {
    list.innerHTML = '<div style="font-size:12px;color:var(--text3);padding:8px 0">Nenhum passo adicionado</div>'
    return
  }
  
  list.innerHTML = gModalSteps.map((s, i) => `
    <div class="step-item ${s.done ? 'done' : ''}">
      <div class="step-check" onclick="toggleModalStep(${i})">
        ${s.done ? '<svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="white" stroke-width="2"><path d="M1 4l2 2 4-4"/></svg>' : ''}
      </div>
      <div class="step-text">${s.text}</div>
      <div class="step-del" onclick="removeModalStep(${i})">✕</div>
    </div>
  `).join('')
}

window.addGoalStep = function() {
  const input = document.getElementById('gStepInput')
  const text = input?.value.trim()
  if (!text) return
  
  gModalSteps.push({ text, done: false })
  if (input) input.value = ''
  renderModalSteps()
}

window.toggleModalStep = function(i) {
  gModalSteps[i].done = !gModalSteps[i].done
  renderModalSteps()
}

window.removeModalStep = function(i) {
  gModalSteps.splice(i, 1)
  renderModalSteps()
}

window.saveGoal = async function() {
  const title = document.getElementById('gTitle')?.value.trim()
  if (!title) return
  
  const goalData = {
    title,
    category: document.getElementById('gCat')?.value || 'pessoal',
    deadline: document.getElementById('gDeadline')?.value || null,
    why: document.getElementById('gWhy')?.value || '',
    steps: gModalSteps
  }
  
  try {
    if (editingGoalId) {
      await api.updateGoal(editingGoalId, goalData)
    } else {
      await api.createGoal(goalData)
    }
    
    closeGoalModal()
    await loadGoals()
    toast('Meta salva ✓')
  } catch (err) {
    console.error('Error saving goal:', err)
    toast('Erro ao salvar meta')
  }
}

window.openGoalDetail = function(id) {
  openGoalModal(id)
}

// ─── GRATITUDE ───────────────────────────────────────────────────
async function loadGratitude() {
  try {
    gratitudes = await api.getGratitudes()
    renderGratitude()
  } catch (err) {
    console.error('Error loading gratitude:', err)
  }
}

function renderGratitude() {
  const list = document.getElementById('gratitudeList')
  if (!list) return
  
  if (gratitudes.length === 0) {
    list.innerHTML = '<div style="font-size:13px;color:var(--text3);padding:20px;text-align:center;font-family:var(--serif);font-style:italic">Ainda não há registros de gratidão</div>'
    return
  }
  
  const icons = ['✦', '✿', '◇', '◎', '❋']
  
  list.innerHTML = gratitudes.map((item, i) => `
    <div class="gratitude-item">
      <div class="gratitude-icon">${icons[i % icons.length]}</div>
      <div class="gratitude-text">${item.text}</div>
      <div class="gratitude-date">${new Date(item.date).toLocaleDateString('pt-BR')}</div>
    </div>
  `).join('')
}

window.addGratitude = async function() {
  const input = document.getElementById('gratitudeInput')
  const text = input?.value.trim()
  if (!text) return
  
  try {
    const item = await api.createGratitude(text, todayKey)
    gratitudes.unshift(item)
    if (input) input.value = ''
    renderGratitude()
    toast('Gratidão registrada ✦')
  } catch (err) {
    console.error('Error adding gratitude:', err)
    toast('Erro ao registrar')
  }
}

// ─── BREATHING ───────────────────────────────────────────────────
let breathType = '478'
let breathActive = false
let breathTimer = null
let breathCycles = 0

const breathPatterns = {
  '478': [{label:'Inspire', dur:4000, phase:'expanding'}, {label:'Retenha', dur:7000, phase:'holding'}, {label:'Expire', dur:8000, phase:'contracting'}],
  'box': [{label:'Inspire', dur:4000, phase:'expanding'}, {label:'Retenha', dur:4000, phase:'holding'}, {label:'Expire', dur:4000, phase:'contracting'}, {label:'Retenha', dur:4000, phase:'holding'}],
  'physio': [{label:'Inspire', dur:2000, phase:'expanding'}, {label:'Expire', dur:6000, phase:'contracting'}]
}

window.selectBreath = function(type) {
  breathType = type
  document.querySelectorAll('.breath-option').forEach(el => el.classList.remove('active'))
  document.getElementById('bt-' + type)?.classList.add('active')
}

window.startBreath = function() {
  if (breathActive) return
  breathActive = true
  breathCycles = 0
  runBreathCycle(0)
}

function runBreathCycle(stepIdx) {
  if (!breathActive) return
  
  const pattern = breathPatterns[breathType]
  const step = pattern[stepIdx]
  
  const circle = document.getElementById('breathCircle')
  const instr = document.getElementById('breathInstruction')
  
  if (circle) {
    circle.className = 'breath-circle ' + step.phase
    circle.innerHTML = step.label
  }
  if (instr) instr.textContent = step.label
  
  breathTimer = setTimeout(() => {
    const nextStep = (stepIdx + 1) % pattern.length
    if (nextStep === 0) {
      breathCycles++
      const cycleCount = document.getElementById('cycleCount')
      if (cycleCount) cycleCount.textContent = breathCycles
      if (breathCycles >= 5) {
        stopBreath()
        return
      }
    }
    runBreathCycle(nextStep)
  }, step.dur)
}

window.stopBreath = function() {
  breathActive = false
  clearTimeout(breathTimer)
  
  const circle = document.getElementById('breathCircle')
  const instr = document.getElementById('breathInstruction')
  
  if (circle) {
    circle.className = 'breath-circle'
    circle.innerHTML = 'Toque para<br>iniciar'
  }
  if (instr) instr.textContent = 'Respire naturalmente'
  
  if (breathCycles > 0) {
    toast(`${breathCycles} ciclos completos ✓`)
  }
}

// ─── INIT ────────────────────────────────────────────────────────
async function init() {
  const session = await getSession()
  
  if (session?.user) {
    showApp(session.user)
  } else {
    showAuth()
  }
  
  onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      showApp(session.user)
    } else if (event === 'SIGNED_OUT') {
      showAuth()
    }
  })
}

init()
