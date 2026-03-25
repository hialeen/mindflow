import { supabase, signIn, signUp, signInWithGoogle, signOut, getSession, onAuthStateChange } from './supabase.js'
import * as api from './api.js'

// ─── STATE ───────────────────────────────────────────────────────
let currentUser = null
let goals = []
let tasks = []
let gratitudes = []
let goalFilter = 'all'
let gModalSteps = []
let editingGoalId = null

// ─── DATE UTILS ──────────────────────────────────────────────────
const today = new Date()
const todayKey = today.toISOString().split('T')[0]
const daysNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function fmtDate(d) {
  return `${d.getDate()} de ${monthNames[d.getMonth()]} de ${d.getFullYear()}`
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

// ─── TOAST ───────────────────────────────────────────────────────
function toast(msg) {
  const el = document.getElementById('toast')
  el.textContent = msg
  el.classList.add('show')
  setTimeout(() => el.classList.remove('show'), 2500)
}

// ─── AUTH ────────────────────────────────────────────────────────
window.showAuthTab = function(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'))
  document.querySelector(`.auth-tab[onclick*="${tab}"]`).classList.add('active')
  
  document.getElementById('login-form').style.display = tab === 'login' ? 'flex' : 'none'
  document.getElementById('signup-form').style.display = tab === 'signup' ? 'flex' : 'none'
  
  // Clear errors
  document.getElementById('login-error').textContent = ''
  document.getElementById('signup-error').textContent = ''
  document.getElementById('signup-success').textContent = ''
}

window.handleLogin = async function(e) {
  e.preventDefault()
  const email = document.getElementById('login-email').value
  const password = document.getElementById('login-password').value
  const errorEl = document.getElementById('login-error')
  
  errorEl.textContent = ''
  
  const { data, error } = await signIn(email, password)
  
  if (error) {
    errorEl.textContent = error.message === 'Invalid login credentials' 
      ? 'Email ou senha incorretos' 
      : error.message
    return
  }
  
  showApp(data.user)
}

window.handleSignup = async function(e) {
  e.preventDefault()
  const email = document.getElementById('signup-email').value
  const password = document.getElementById('signup-password').value
  const confirmPassword = document.getElementById('signup-password-confirm').value
  const errorEl = document.getElementById('signup-error')
  const successEl = document.getElementById('signup-success')
  
  errorEl.textContent = ''
  successEl.textContent = ''
  
  if (password !== confirmPassword) {
    errorEl.textContent = 'As senhas não coincidem'
    return
  }
  
  const { data, error } = await signUp(email, password)
  
  if (error) {
    errorEl.textContent = error.message
    return
  }
  
  successEl.textContent = 'Conta criada! Verifique seu email para confirmar.'
}

window.handleGoogleLogin = async function() {
  const { error } = await signInWithGoogle()
  if (error) {
    document.getElementById('login-error').textContent = error.message
  }
}

window.handleLogout = async function() {
  await signOut()
  showAuth()
}

function showAuth() {
  document.getElementById('auth-screen').style.display = 'flex'
  document.getElementById('app').style.display = 'none'
}

function showApp(user) {
  currentUser = user
  document.getElementById('auth-screen').style.display = 'none'
  document.getElementById('app').style.display = 'flex'
  
  // Update user info
  document.getElementById('user-info').textContent = user.email
  
  // Set greeting based on time
  const hour = new Date().getHours()
  let greeting = 'Bom dia'
  if (hour >= 12 && hour < 18) greeting = 'Boa tarde'
  else if (hour >= 18) greeting = 'Boa noite'
  document.getElementById('greeting').textContent = greeting + ' ✦'
  
  // Load initial data
  loadDashboard()
}

// ─── NAVIGATION ──────────────────────────────────────────────────
window.navigate = function(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'))
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))
  document.getElementById('view-' + view).classList.add('active')
  document.querySelector(`.nav-item[onclick*="${view}"]`)?.classList.add('active')
  
  if (view === 'dashboard') loadDashboard()
  if (view === 'daily') loadDaily()
  if (view === 'goals') loadGoals()
  if (view === 'gratitude') loadGratitude()
}

// ─── DASHBOARD ───────────────────────────────────────────────────
async function loadDashboard() {
  document.getElementById('todayLabel').textContent = fmtDate(today) + ' — ' + daysNames[today.getDay()]
  document.getElementById('dailyQuote').textContent = quotes[today.getDate() % quotes.length]
  
  try {
    // Load tasks for today
    tasks = await api.getTasks(todayKey)
    const done = tasks.filter(t => t.done).length
    document.getElementById('statTasksDone').textContent = `${done}/${tasks.length}`
    
    // Load goals
    goals = await api.getGoals()
    const activeGoals = goals.filter(g => calcProgress(g.goal_steps) < 100)
    document.getElementById('statGoals').textContent = activeGoals.length
    
    // Render goals progress
    renderDashGoals()
    
    // Load moods for chart
    const weekAgo = new Date(today)
    weekAgo.setDate(today.getDate() - 6)
    const moods = await api.getMoods(weekAgo.toISOString().split('T')[0], todayKey)
    renderMoodChart(moods)
    
    // Streak (simplified - just count tasks)
    document.getElementById('statStreak').textContent = tasks.length > 0 ? '1' : '0'
    
  } catch (err) {
    console.error('Error loading dashboard:', err)
  }
}

function renderDashGoals() {
  const list = document.getElementById('dashGoalsList')
  
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
  document.getElementById('dailyDateLabel').textContent = fmtDate(today)
  
  try {
    tasks = await api.getTasks(todayKey)
    renderTasks()
    
    const reflection = await api.getReflection(todayKey)
    if (reflection) {
      document.getElementById('r_morning').value = reflection.morning || ''
      document.getElementById('r_thoughts').value = reflection.thoughts || ''
      document.getElementById('r_emotions').value = reflection.emotions || ''
      document.getElementById('r_selfcare').value = reflection.selfcare || ''
      document.getElementById('r_evening').value = reflection.evening || ''
    }
    
    const note = await api.getNote(todayKey)
    if (note) {
      document.getElementById('freeNotes').value = note.content || ''
    }
  } catch (err) {
    console.error('Error loading daily:', err)
  }
}

function renderTasks() {
  const list = document.getElementById('taskList')
  
  if (tasks.length === 0) {
    list.innerHTML = '<div style="font-size:13px;color:var(--text3);padding:16px;text-align:center">Nenhuma tarefa ainda</div>'
    return
  }
  
  list.innerHTML = tasks.map(t => `
    <div class="task-item ${t.done ? 'done' : ''}" data-id="${t.id}">
      <div class="task-check" onclick="toggleTask('${t.id}')">
        ${t.done ? '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" stroke-width="2"><path d="M1.5 5l2.5 2.5 4.5-5"/></svg>' : ''}
      </div>
      <div class="task-text">${t.text}</div>
      <div class="task-tag ${t.category}">${t.category}</div>
      <div class="task-del" onclick="deleteTask('${t.id}')">✕</div>
    </div>
  `).join('')
}

window.addTask = async function() {
  const input = document.getElementById('taskInput')
  const text = input.value.trim()
  if (!text) return
  
  const category = document.getElementById('taskCat').value
  
  try {
    const task = await api.createTask({ text, category, date: todayKey })
    tasks.push(task)
    input.value = ''
    renderTasks()
    toast('Tarefa adicionada ✓')
  } catch (err) {
    console.error('Error adding task:', err)
    toast('Erro ao adicionar tarefa')
  }
}

window.toggleTask = async function(id) {
  const task = tasks.find(t => t.id === id)
  if (!task) return
  
  try {
    await api.updateTask(id, { done: !task.done })
    task.done = !task.done
    renderTasks()
  } catch (err) {
    console.error('Error toggling task:', err)
  }
}

window.deleteTask = async function(id) {
  try {
    await api.deleteTask(id)
    tasks = tasks.filter(t => t.id !== id)
    renderTasks()
    toast('Tarefa removida')
  } catch (err) {
    console.error('Error deleting task:', err)
  }
}

window.switchTab = function(name) {
  document.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'))
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'))
  event.target.classList.add('active')
  document.getElementById('tab-' + name).classList.add('active')
}

window.saveReflections = async function() {
  try {
    await api.saveReflection(todayKey, {
      morning: document.getElementById('r_morning').value,
      thoughts: document.getElementById('r_thoughts').value,
      emotions: document.getElementById('r_emotions').value,
      selfcare: document.getElementById('r_selfcare').value,
      evening: document.getElementById('r_evening').value
    })
    toast('Reflexões salvas ✓')
  } catch (err) {
    console.error('Error saving reflections:', err)
    toast('Erro ao salvar')
  }
}

window.saveFreeNotes = async function() {
  try {
    await api.saveNote(todayKey, document.getElementById('freeNotes').value)
    document.getElementById('notesStatus').textContent = 'Salvo às ' + new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})
    toast('Anotações salvas ✓')
  } catch (err) {
    console.error('Error saving notes:', err)
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
  
  if (id) {
    const goal = goals.find(g => g.id === id)
    if (goal) {
      document.getElementById('goalModalTitle').textContent = 'Editar meta'
      document.getElementById('gTitle').value = goal.title
      document.getElementById('gCat').value = goal.category
      document.getElementById('gDeadline').value = goal.deadline || ''
      document.getElementById('gWhy').value = goal.why || ''
      gModalSteps = (goal.goal_steps || []).map(s => ({...s}))
    }
  } else {
    document.getElementById('goalModalTitle').textContent = 'Nova meta'
    document.getElementById('gTitle').value = ''
    document.getElementById('gCat').value = 'pessoal'
    document.getElementById('gDeadline').value = ''
    document.getElementById('gWhy').value = ''
  }
  
  document.getElementById('gStepInput').value = ''
  renderModalSteps()
  document.getElementById('goalModal').classList.add('open')
}

window.closeGoalModal = function() {
  document.getElementById('goalModal').classList.remove('open')
  editingGoalId = null
}

function renderModalSteps() {
  const list = document.getElementById('gStepsList')
  const pct = calcProgress(gModalSteps)
  document.getElementById('gProgressLabel').textContent = pct + '%'
  
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
  const text = input.value.trim()
  if (!text) return
  
  gModalSteps.push({ text, done: false })
  input.value = ''
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
  const title = document.getElementById('gTitle').value.trim()
  if (!title) return
  
  const goalData = {
    title,
    category: document.getElementById('gCat').value,
    deadline: document.getElementById('gDeadline').value || null,
    why: document.getElementById('gWhy').value,
    steps: gModalSteps
  }
  
  try {
    if (editingGoalId) {
      await api.updateGoal(editingGoalId, goalData)
      // Update steps separately if needed
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
  const text = input.value.trim()
  if (!text) return
  
  try {
    const item = await api.createGratitude(text, todayKey)
    gratitudes.unshift(item)
    input.value = ''
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
  document.getElementById('bt-' + type).classList.add('active')
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
  
  circle.className = 'breath-circle ' + step.phase
  circle.innerHTML = step.label
  instr.textContent = step.label
  
  breathTimer = setTimeout(() => {
    const nextStep = (stepIdx + 1) % pattern.length
    if (nextStep === 0) {
      breathCycles++
      document.getElementById('cycleCount').textContent = breathCycles
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
  circle.className = 'breath-circle'
  circle.innerHTML = 'Toque para<br>iniciar'
  document.getElementById('breathInstruction').textContent = 'Respire naturalmente'
  
  if (breathCycles > 0) {
    toast(`${breathCycles} ciclos completos ✓`)
  }
}

// ─── INIT ────────────────────────────────────────────────────────
async function init() {
  // Check for existing session
  const session = await getSession()
  
  if (session?.user) {
    showApp(session.user)
  } else {
    showAuth()
  }
  
  // Listen for auth changes
  onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      showApp(session.user)
    } else if (event === 'SIGNED_OUT') {
      showAuth()
    }
  })
}

init()
