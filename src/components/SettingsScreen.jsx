import { useState } from 'react'
import { getApiKey, saveApiKey } from '../claude.js'

const C = {
  bg: '#0f1117', card: '#1a1d27', border: '#2a2d3a',
  accent: '#f97316', accentSoft: 'rgba(249,115,22,0.12)',
  text: '#e8eaf0', muted: '#6b7280', input: '#12141e',
  green: '#22c55e', red: '#ef4444',
}

function Field({ label, value, onChange, suffix = '', hint }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ color: C.muted, fontSize: 12, display: 'block', marginBottom: 6, letterSpacing: '0.05em' }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            flex: 1, background: C.input, border: `1px solid ${C.border}`,
            borderRadius: 10, color: C.text, padding: '11px 14px', fontSize: 15,
            outline: 'none', fontFamily: 'Space Mono', boxSizing: 'border-box',
          }}
        />
        {suffix && <span style={{ color: C.muted, fontSize: 13, minWidth: 30 }}>{suffix}</span>}
      </div>
      {hint && <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

export default function SettingsScreen({ config, onSave, onClose, user, onLogout }) {
  const [goals, setGoals] = useState({ ...config.goals })
  const [apiKey, setApiKey] = useState(getApiKey() || '')
  const [saved, setSaved] = useState(false)

  const set = (key) => (val) => setGoals(g => ({ ...g, [key]: val }))

  const handleSave = () => {
    // Save goals to localStorage so they persist across refreshes
    const updatedConfig = { ...config, goals }
    localStorage.setItem('user_config', JSON.stringify(updatedConfig))
    onSave(updatedConfig)
    if (apiKey.trim()) saveApiKey(apiKey.trim())
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 1200)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: C.bg, zIndex: 100,
      overflowY: 'auto', animation: 'slideIn 0.3s ease',
    }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 80px' }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '20px 0 16px', position: 'sticky', top: 0,
          background: C.bg, zIndex: 10,
          borderBottom: `1px solid ${C.border}`, marginBottom: 20,
        }}>
          <button onClick={onClose} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
            color: C.text, padding: '8px 12px', cursor: 'pointer', fontSize: 18,
          }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>Settings</div>
            <div style={{ color: C.muted, fontSize: 12 }}>Daily nutrition goals</div>
          </div>
          <button onClick={handleSave} style={{
            background: saved ? 'rgba(34,197,94,0.15)' : C.accentSoft,
            border: `1px solid ${saved ? C.green : C.accent}`,
            borderRadius: 10, color: saved ? C.green : C.accent,
            padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
            transition: 'all 0.3s',
          }}>
            {saved ? '✓ Saved!' : 'Save'}
          </button>
        </div>

        {/* User info */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
          padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <img src={user.avatar} alt={user.login} style={{ width: 44, height: 44, borderRadius: '50%' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{user.name || user.login}</div>
            <div style={{ color: C.muted, fontSize: 13 }}>@{user.login}</div>
          </div>
          <button onClick={onLogout} style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, color: C.red, padding: '6px 12px',
            cursor: 'pointer', fontSize: 13, fontWeight: 500,
          }}>Sign out</button>
        </div>

        {/* Goals */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginBottom: 16,
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Daily Goals</div>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>
            Tap a number to edit, then tap <strong style={{ color: C.accent }}>Save</strong> at the top.
          </div>
          <Field label="CALORIES" value={goals.calories} onChange={set('calories')} suffix="kcal" />
          <Field label="PROTEIN" value={goals.protein} onChange={set('protein')} suffix="g"
            hint="~0.8–2g per kg body weight" />
          <Field label="CARBOHYDRATES" value={goals.carbs} onChange={set('carbs')} suffix="g" />
          <Field label="FAT" value={goals.fat} onChange={set('fat')} suffix="g" />
          <Field label="FIBER" value={goals.fiber} onChange={set('fiber')} suffix="g"
            hint="Recommended: 25–38g/day" />
        </div>

        {/* API Key */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
          padding: 20, marginBottom: 16,
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>OpenAI API Key</div>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>
            Stored only in your browser. Get it from{' '}
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer"
              style={{ color: C.accent, textDecoration: 'none' }}>platform.openai.com/api-keys</a>.
          </div>
          <input
            type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
            placeholder="sk-xxxxxxxxxxxxxxxxxxxx"
            style={{
              width: '100%', background: C.input, border: `1px solid ${C.border}`,
              borderRadius: 10, color: C.text, padding: '11px 14px', fontSize: 14,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Data info */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20,
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Data Storage</div>
          <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.7 }}>
            Logs saved to your GitHub repo as:<br />
            <span style={{ fontFamily: 'monospace', color: C.text, fontSize: 12 }}>
              logs/YYYY-MM-DD.json
            </span><br /><br />
            Logs older than <strong style={{ color: C.text }}>90 days</strong> are automatically pruned.
          </div>
        </div>
      </div>
    </div>
  )
}
