import { useState, useEffect, useRef, useCallback } from 'react'
import LoginScreen from './components/LoginScreen.jsx'
import SettingsScreen from './components/SettingsScreen.jsx'
import HistoryScreen from './components/HistoryScreen.jsx'
import { analyzeFood } from './claude.js'
import { getRepoFile, putRepoFile, todayKey, logPath } from './github.js'

const C = {
  bg: '#0f1117', card: '#1a1d27', border: '#2a2d3a',
  accent: '#f97316', accentSoft: 'rgba(249,115,22,0.12)',
  text: '#e8eaf0', muted: '#6b7280', input: '#12141e',
  green: '#22c55e', blue: '#3b82f6', purple: '#a855f7', yellow: '#eab308',
}

const DEFAULT_CONFIG = {
  goals: { calories: 2000, protein: 150, carbs: 200, fat: 65, fiber: 30 },
  app: { logRetentionDays: 90 },
  github: { dataPath: 'data/logs' },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function MacroBar({ label, value, goal, color }) {
  const pct = goal > 0 ? Math.min((value / goal) * 100, 100) : 0
  const over = value > goal
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: C.muted, fontSize: 12, fontFamily: 'monospace' }}>{label}</span>
        <span style={{ color: over ? '#ef4444' : C.text, fontSize: 12, fontWeight: 600 }}>
          {value}g <span style={{ color: C.muted, fontWeight: 400 }}>/ {goal}g</span>
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: C.border, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: over ? '#ef4444' : color,
          borderRadius: 3, transition: 'width 0.8s cubic-bezier(.4,0,.2,1)',
        }} />
      </div>
    </div>
  )
}

const PORTION_PRESETS = [
  { label: '¼', value: 0.25 },
  { label: '⅓', value: 0.333 },
  { label: '½', value: 0.5 },
  { label: '¾', value: 0.75 },
  { label: '1×', value: 1 },
  { label: '1½', value: 1.5 },
  { label: '2×', value: 2 },
]

function FoodItem({ food, index, onChange }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ ...food })
  const [multiplier, setMultiplier] = useState(1)

  // Apply a portion multiplier relative to the original food values
  const applyMultiplier = (m) => {
    setMultiplier(m)
    setDraft({
      ...draft,
      calories: Math.round(food.calories * m),
      protein: Math.round(food.protein * m * 10) / 10,
      carbs: Math.round(food.carbs * m * 10) / 10,
      fat: Math.round(food.fat * m * 10) / 10,
      fiber: Math.round((food.fiber || 0) * m * 10) / 10,
      portion: m === 1 ? food.portion : `${food.portion} × ${m === Math.round(m) ? m : m.toFixed(2)}`,
    })
  }

  const setField = (key, val) => {
    const num = parseFloat(val)
    setDraft(d => ({ ...d, [key]: isNaN(num) ? val : num }))
  }

  const save = () => {
    onChange({ ...food, ...draft })
    setEditing(false)
  }

  const cancel = () => {
    setDraft({ ...food })
    setMultiplier(1)
    setEditing(false)
  }

  const displayed = editing ? draft : food

  return (
    <div style={{
      background: C.input, border: `1px solid ${editing ? C.accent : C.border}`,
      borderRadius: 10, padding: '12px 14px', marginBottom: 8,
      animation: `slideIn 0.3s ease ${index * 0.07}s both`,
      transition: 'border-color 0.2s',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          {editing ? (
            <input value={draft.name} onChange={e => setField('name', e.target.value)}
              style={{
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
                color: C.text, padding: '4px 8px', fontSize: 14, fontWeight: 600,
                outline: 'none', width: '100%', marginBottom: 4,
              }} />
          ) : (
            <div style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{displayed.name}</div>
          )}
          {editing ? (
            <input value={draft.portion} onChange={e => setField('portion', e.target.value)}
              style={{
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
                color: C.muted, padding: '3px 8px', fontSize: 12,
                outline: 'none', width: '100%',
              }} />
          ) : (
            <div style={{ color: C.muted, fontSize: 12 }}>{displayed.portion}</div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 10 }}>
          {editing ? (
            <div style={{ textAlign: 'right' }}>
              <input value={draft.calories} onChange={e => setField('calories', e.target.value)}
                type="number" style={{
                  background: C.card, border: `1px solid ${C.accent}`, borderRadius: 6,
                  color: C.accent, padding: '4px 6px', fontSize: 18, fontWeight: 700,
                  fontFamily: 'Space Mono', outline: 'none', width: 72, textAlign: 'right',
                }} />
              <div style={{ color: C.muted, fontSize: 11, textAlign: 'right' }}>kcal</div>
            </div>
          ) : (
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: C.accent, fontWeight: 700, fontSize: 18, fontFamily: 'Space Mono', lineHeight: 1 }}>{displayed.calories}</div>
              <div style={{ color: C.muted, fontSize: 11 }}>kcal</div>
            </div>
          )}
          <button onClick={() => editing ? save() : setEditing(true)} style={{
            background: editing ? C.accent : C.card,
            border: `1px solid ${editing ? C.accent : C.border}`,
            borderRadius: 6, color: editing ? 'white' : C.muted,
            padding: '5px 8px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            transition: 'all 0.2s', flexShrink: 0,
          }}>{editing ? '✓' : '✏️'}</button>
        </div>
      </div>

      {/* Portion quick-select (always visible) */}
      {!editing && (
        <div style={{ display: 'flex', gap: 5, marginTop: 10, flexWrap: 'wrap' }}>
          {PORTION_PRESETS.map(p => (
            <button key={p.label} onClick={() => { applyMultiplier(p.value); onChange({ ...food, ...draft, calories: Math.round(food.calories * p.value), protein: Math.round(food.protein * p.value * 10) / 10, carbs: Math.round(food.carbs * p.value * 10) / 10, fat: Math.round(food.fat * p.value * 10) / 10, fiber: Math.round((food.fiber || 0) * p.value * 10) / 10, portion: p.value === 1 ? food.portion : `${food.portion} ×${p.label}` }) }}
              style={{
                padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: `1px solid ${multiplier === p.value ? C.accent : C.border}`,
                background: multiplier === p.value ? C.accentSoft : 'none',
                color: multiplier === p.value ? C.accent : C.muted,
                transition: 'all 0.15s',
              }}>{p.label}</button>
          ))}
        </div>
      )}

      {/* Macro row */}
      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {editing ? (
          [['P', 'protein', C.green], ['C', 'carbs', C.blue], ['F', 'fat', C.purple]].map(([l, k, c]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />
              <span style={{ color: C.muted, fontSize: 12 }}>{l}:</span>
              <input value={draft[k]} onChange={e => setField(k, e.target.value)} type="number"
                style={{
                  background: C.card, border: `1px solid ${C.border}`, borderRadius: 4,
                  color: C.text, padding: '2px 5px', fontSize: 12, fontWeight: 600,
                  outline: 'none', width: 46,
                }} />
              <span style={{ color: C.muted, fontSize: 11 }}>g</span>
            </div>
          ))
        ) : (
          [['P', displayed.protein, C.green], ['C', displayed.carbs, C.blue], ['F', displayed.fat, C.purple]].map(([l, v, c]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />
              <span style={{ color: C.muted, fontSize: 12 }}>{l}: </span>
              <span style={{ color: C.text, fontSize: 12, fontWeight: 600 }}>{v}g</span>
            </div>
          ))
        )}

        {!editing && (
          <span style={{
            marginLeft: 'auto', fontSize: 10, padding: '2px 6px', borderRadius: 4,
            background: food.confidence === 'high' ? 'rgba(34,197,94,0.12)' : food.confidence === 'medium' ? 'rgba(249,115,22,0.12)' : 'rgba(239,68,68,0.12)',
            color: food.confidence === 'high' ? C.green : food.confidence === 'medium' ? C.accent : '#ef4444',
          }}>{food.confidence}</span>
        )}

        {editing && (
          <button onClick={cancel} style={{
            marginLeft: 'auto', background: 'none', border: `1px solid ${C.border}`,
            borderRadius: 6, color: C.muted, padding: '3px 10px',
            cursor: 'pointer', fontSize: 12,
          }}>Cancel</button>
        )}
      </div>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gh_user')) } catch { return null }
  })
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [screen, setScreen] = useState('main') // main | settings | history
  const [tab, setTab] = useState('note') // note | photo

  // Today's log state
  const [todayEntries, setTodayEntries] = useState([])
  const [logLoading, setLogLoading] = useState(false)
  const [logSaving, setLogSaving] = useState(false)

  // Input state
  const [note, setNote] = useState('')
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState(null)

  const fileRef = useRef()
  const token = localStorage.getItem('gh_token')
  const repo = localStorage.getItem('gh_repo') || 'calorie-ai'

  // Load config from public/config.json
  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'config.json')
      .then(r => r.json())
      .then(c => setConfig(c))
      .catch(() => {})
  }, [])

  // Load today's log from GitHub
  useEffect(() => {
    if (!user || !token) return
    setLogLoading(true)
    const path = logPath(todayKey(), config.github?.dataPath || 'data/logs')
    getRepoFile(token, user.login, repo, path)
      .then(result => {
        if (result) {
          setTodayEntries(result.content.entries || [])
        }
      })
      .catch(console.error)
      .finally(() => setLogLoading(false))
  }, [user, token, repo])

  const saveLog = async (entries) => {
    if (!user || !token) return
    setLogSaving(true)
    const path = logPath(todayKey(), config.github?.dataPath || 'data/logs')
    const totalCalories = entries.reduce((s, e) => s + e.totalCalories, 0)
    const totalProtein = entries.reduce((s, e) => s + e.totalProtein, 0)
    const totalCarbs = entries.reduce((s, e) => s + e.totalCarbs, 0)
    const totalFat = entries.reduce((s, e) => s + e.totalFat, 0)
    const totalFiber = entries.reduce((s, e) => s + (e.totalFiber || 0), 0)
    const content = {
      date: todayKey(), entries,
      totalCalories, totalProtein, totalCarbs, totalFat, totalFiber,
      savedAt: new Date().toISOString(),
    }
    try {
      await putRepoFile(token, user.login, repo, path, content, null, `Log ${todayKey()}`)
    } catch (e) {
      console.error('Save failed:', e)
    } finally {
      setLogSaving(false)
    }
  }

  const handleImage = useCallback((file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target.result)
      setImage({ data: e.target.result.split(',')[1], type: file.type })
    }
    reader.readAsDataURL(file)
  }, [])

  const analyze = async () => {
    if (!note.trim() && !image) return
    setAnalyzing(true)
    setError(null)
    try {
      const result = await analyzeFood({
        text: note.trim(),
        imageBase64: image?.data,
        imageType: image?.type,
      })
      const entry = {
        ...result,
        label: tab === 'photo' ? '📷 Photo analysis' : note.substring(0, 50),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        id: Date.now(),
      }
      const updated = [entry, ...todayEntries]
      setTodayEntries(updated)
      await saveLog(updated)
      setNote('')
      setImage(null)
      setImagePreview(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const removeEntry = async (id) => {
    const updated = todayEntries.filter(e => e.id !== id)
    setTodayEntries(updated)
    await saveLog(updated)
  }

  const handleLogout = () => {
    localStorage.removeItem('gh_token')
    localStorage.removeItem('gh_user')
    localStorage.removeItem('gh_repo')
    setUser(null)
  }

  const handleLogin = (ghUser) => {
    setUser({ login: ghUser.login, name: ghUser.name, avatar: ghUser.avatar_url })
    localStorage.setItem('gh_user', JSON.stringify({ login: ghUser.login, name: ghUser.name, avatar: ghUser.avatar_url }))
  }

  if (!user) return <LoginScreen onLogin={handleLogin} />
  if (screen === 'settings') return (
    <SettingsScreen
      config={config} user={user}
      onSave={(c) => { setConfig(c); setScreen('main') }}
      onClose={() => setScreen('main')}
      onLogout={() => { handleLogout(); setScreen('main') }}
    />
  )
  if (screen === 'history') return (
    <HistoryScreen
      token={token} owner={user.login} repo={repo}
      dataPath={config.github?.dataPath || 'data/logs'}
      onClose={() => setScreen('main')}
    />
  )

  const goals = config.goals || DEFAULT_CONFIG.goals
  const totalCal = todayEntries.reduce((s, e) => s + e.totalCalories, 0)
  const totalPro = todayEntries.reduce((s, e) => s + e.totalProtein, 0)
  const totalCarb = todayEntries.reduce((s, e) => s + e.totalCarbs, 0)
  const totalFat = todayEntries.reduce((s, e) => s + e.totalFat, 0)
  const totalFib = todayEntries.reduce((s, e) => s + (e.totalFiber || 0), 0)
  const calPct = Math.min((totalCal / goals.calories) * 100, 100)
  const calOver = totalCal > goals.calories

  return (
    <div style={{ minHeight: '100vh', background: C.bg, maxWidth: 480, margin: '0 auto', paddingBottom: 100 }}>
      {/* ── Header ── */}
      <div style={{
        padding: '16px 16px 12px', position: 'sticky', top: 0,
        background: C.bg, zIndex: 10, borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, background: C.accentSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>🔥</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'Space Mono' }}>CalorieAI</div>
            <div style={{ color: C.muted, fontSize: 11 }}>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {logSaving && (
              <div style={{ width: 14, height: 14, border: '2px solid #2a2d3a', borderTopColor: C.green, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            )}
            <button onClick={() => setScreen('history')} style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
              color: C.text, padding: '6px 10px', cursor: 'pointer', fontSize: 14,
            }} title="History">📅</button>
            <button onClick={() => setScreen('settings')} style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
              color: C.text, padding: '6px 10px', cursor: 'pointer', fontSize: 14,
            }} title="Settings">⚙️</button>
            <img src={user.avatar} alt="" style={{ width: 30, height: 30, borderRadius: '50%', border: `2px solid ${C.border}` }} />
          </div>
        </div>

        {/* Calorie ring + number */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
          <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
            <svg width="56" height="56" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="28" cy="28" r="22" fill="none" stroke={C.border} strokeWidth="5" />
              <circle cx="28" cy="28" r="22" fill="none"
                stroke={calOver ? '#ef4444' : C.accent} strokeWidth="5"
                strokeDasharray={`${2 * Math.PI * 22}`}
                strokeDashoffset={`${2 * Math.PI * 22 * (1 - calPct / 100)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontFamily: 'Space Mono', color: calOver ? '#ef4444' : C.accent,
              fontWeight: 700,
            }}>
              {Math.round(calPct)}%
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: 'Space Mono', fontWeight: 700, fontSize: 28, color: calOver ? '#ef4444' : C.text, lineHeight: 1 }}>{totalCal}</span>
              <span style={{ color: C.muted, fontSize: 13 }}>/ {goals.calories} kcal</span>
            </div>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
              {calOver ? `${totalCal - goals.calories} kcal over goal` : `${goals.calories - totalCal} kcal remaining`}
            </div>
          </div>
        </div>

        {/* Macro bars */}
        <MacroBar label="Protein" value={totalPro} goal={goals.protein} color={C.green} />
        <MacroBar label="Carbs" value={totalCarb} goal={goals.carbs} color={C.blue} />
        <MacroBar label="Fat" value={totalFat} goal={goals.fat} color={C.purple} />
        <MacroBar label="Fiber" value={totalFib} goal={goals.fiber} color={C.yellow} />
      </div>

      {/* ── Input card ── */}
      <div style={{ margin: '16px 16px 0', background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
          {['note', 'photo'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '11px', background: 'none', border: 'none', cursor: 'pointer',
              color: tab === t ? C.accent : C.muted, fontWeight: tab === t ? 600 : 400, fontSize: 14,
              borderBottom: tab === t ? `2px solid ${C.accent}` : '2px solid transparent',
              transition: 'all 0.2s',
            }}>
              {t === 'note' ? '✏️ Describe' : '📷 Photo'}
            </button>
          ))}
        </div>

        <div style={{ padding: 14 }}>
          {tab === 'note' ? (
            <textarea
              value={note} onChange={e => setNote(e.target.value)}
              placeholder="e.g. grilled chicken breast 200g with steamed broccoli and rice..."
              rows={3}
              style={{
                width: '100%', background: C.input, border: `1px solid ${C.border}`,
                borderRadius: 10, color: C.text, padding: '11px 13px', fontSize: 14,
                outline: 'none', lineHeight: 1.5, boxSizing: 'border-box',
              }}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) analyze() }}
            />
          ) : (
            <div>
              <input ref={fileRef} type="file" accept="image/*" capture="environment"
                style={{ display: 'none' }} onChange={e => handleImage(e.target.files[0])} />
              {imagePreview ? (
                <div style={{ position: 'relative' }}>
                  <img src={imagePreview} alt="Food" style={{ width: '100%', borderRadius: 10, maxHeight: 180, objectFit: 'cover' }} />
                  <button onClick={() => { setImage(null); setImagePreview(null) }} style={{
                    position: 'absolute', top: 8, right: 8, width: 26, height: 26,
                    borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none',
                    color: 'white', cursor: 'pointer', fontSize: 14,
                  }}>×</button>
                </div>
              ) : (
                <div onClick={() => fileRef.current.click()} style={{
                  border: `2px dashed ${C.border}`, borderRadius: 10, padding: '28px 16px',
                  textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s',
                }}
                  onMouseOver={e => e.currentTarget.style.borderColor = C.accent}
                  onMouseOut={e => e.currentTarget.style.borderColor = C.border}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>📸</div>
                  <div style={{ color: C.muted, fontSize: 13 }}>Tap to take photo or upload</div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div style={{ marginTop: 10, padding: '9px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: 13 }}>
              ⚠️ {error}
            </div>
          )}

          <button onClick={analyze} disabled={analyzing || (!note.trim() && !image)} style={{
            width: '100%', marginTop: 12, padding: '13px', borderRadius: 12, border: 'none',
            background: analyzing || (!note.trim() && !image) ? C.border : 'linear-gradient(135deg,#f97316,#ea580c)',
            color: analyzing || (!note.trim() && !image) ? C.muted : 'white',
            fontWeight: 700, fontSize: 15, cursor: analyzing || (!note.trim() && !image) ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s',
          }}>
            {analyzing ? (
              <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Analyzing...</>
            ) : '🔍 Analyze Calories'}
          </button>
        </div>
      </div>

      {/* ── Today's log ── */}
      <div style={{ margin: '20px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ color: C.muted, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Today's Log
          </div>
          {logLoading && <div style={{ color: C.muted, fontSize: 12 }}>Loading...</div>}
        </div>

        {todayEntries.length === 0 && !logLoading && (
          <div style={{ textAlign: 'center', padding: '40px 24px', color: C.muted }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🥗</div>
            <div style={{ fontWeight: 600, color: C.text, marginBottom: 6 }}>No meals logged yet</div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>Describe your meal or snap a photo above to get started.</div>
          </div>
        )}

        {todayEntries.map((entry, ei) => (
          <div key={entry.id || ei} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
            padding: 16, marginBottom: 12, animation: 'slideIn 0.4s ease both',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' }}>
              <div style={{ color: C.text, fontSize: 13, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <div style={{ color: C.muted, fontSize: 11 }}>{entry.time}</div>
                <button onClick={() => removeEntry(entry.id)} style={{
                  background: 'none', border: 'none', color: C.muted, cursor: 'pointer',
                  fontSize: 16, padding: '0 2px', lineHeight: 1,
                }}>×</button>
              </div>
            </div>

            {entry.foods?.map((food, fi) => (
              <FoodItem key={fi} food={food} index={fi} onChange={(updatedFood) => {
                const updatedFoods = entry.foods.map((f, i) => i === fi ? updatedFood : f)
                const updatedEntry = {
                  ...entry,
                  foods: updatedFoods,
                  totalCalories: updatedFoods.reduce((s, f) => s + (f.calories || 0), 0),
                  totalProtein: Math.round(updatedFoods.reduce((s, f) => s + (f.protein || 0), 0) * 10) / 10,
                  totalCarbs: Math.round(updatedFoods.reduce((s, f) => s + (f.carbs || 0), 0) * 10) / 10,
                  totalFat: Math.round(updatedFoods.reduce((s, f) => s + (f.fat || 0), 0) * 10) / 10,
                  totalFiber: Math.round(updatedFoods.reduce((s, f) => s + (f.fiber || 0), 0) * 10) / 10,
                }
                const updated = todayEntries.map(e => e.id === entry.id ? updatedEntry : e)
                setTodayEntries(updated)
                saveLog(updated)
              }} />
            ))}

            {entry.foods?.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                <span style={{ color: C.muted, fontSize: 13 }}>Meal total</span>
                <span style={{ color: C.accent, fontWeight: 700, fontFamily: 'Space Mono' }}>{entry.totalCalories} kcal</span>
              </div>
            )}

            {entry.notes && (
              <div style={{ color: C.muted, fontSize: 12, marginTop: 8, fontStyle: 'italic' }}>
                💡 {entry.notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
