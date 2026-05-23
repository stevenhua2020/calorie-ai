import { useState } from 'react'

const C = {
  bg: '#0f1117', card: '#1a1d27', border: '#2a2d3a',
  accent: '#f97316', accentSoft: 'rgba(249,115,22,0.12)',
  text: '#e8eaf0', muted: '#6b7280', input: '#12141e',
}

export default function LoginScreen({ onLogin }) {
  const [pat, setPat] = useState('')
  const [repo, setRepo] = useState('calorie-ai')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [step, setStep] = useState(1) // 1=PAT, 2=repo

  const handleLogin = async () => {
    if (!pat.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: { Authorization: `token ${pat.trim()}`, Accept: 'application/vnd.github.v3+json' }
      })
      if (!res.ok) throw new Error('Invalid token — make sure it has repo scope')
      const user = await res.json()
      localStorage.setItem('gh_token', pat.trim())
      localStorage.setItem('gh_user', JSON.stringify({ login: user.login, name: user.name, avatar: user.avatar_url }))
      localStorage.setItem('gh_repo', repo.trim() || 'calorie-ai')
      onLogin(user)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: C.bg, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, animation: 'fadeIn 0.4s ease',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20, background: C.accentSoft,
          border: `1px solid rgba(249,115,22,0.3)`, display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: 36,
          margin: '0 auto 16px',
        }}>🔥</div>
        <div style={{ fontFamily: 'Space Mono', fontSize: 26, fontWeight: 700, color: C.text }}>CalorieAI</div>
        <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>powered by Claude · saved to GitHub</div>
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 400, background: C.card,
        border: `1px solid ${C.border}`, borderRadius: 20, padding: 28,
      }}>
        {step === 1 ? (
          <>
            <div style={{ color: C.text, fontWeight: 700, fontSize: 17, marginBottom: 6 }}>
              Connect your GitHub
            </div>
            <div style={{ color: C.muted, fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
              Create a Personal Access Token with <strong style={{ color: C.text }}>repo</strong> scope at{' '}
              <a href="https://github.com/settings/tokens/new" target="_blank" rel="noreferrer"
                style={{ color: C.accent, textDecoration: 'none' }}>
                github.com/settings/tokens
              </a>
              . Your logs will be stored privately in your repo.
            </div>

            <label style={{ color: C.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>
              PERSONAL ACCESS TOKEN
            </label>
            <input
              type="password"
              value={pat}
              onChange={e => setPat(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              onKeyDown={e => e.key === 'Enter' && pat.trim() && setStep(2)}
              style={{
                width: '100%', background: C.input, border: `1px solid ${C.border}`,
                borderRadius: 10, color: C.text, padding: '12px 14px', fontSize: 14,
                outline: 'none', marginBottom: 16,
              }}
            />

            <button
              onClick={() => pat.trim() && setStep(2)}
              disabled={!pat.trim()}
              style={{
                width: '100%', padding: 14, borderRadius: 12, border: 'none',
                background: pat.trim() ? 'linear-gradient(135deg,#f97316,#ea580c)' : C.border,
                color: pat.trim() ? 'white' : C.muted,
                fontWeight: 700, fontSize: 15, cursor: pat.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Next →
            </button>
          </>
        ) : (
          <>
            <div style={{ color: C.text, fontWeight: 700, fontSize: 17, marginBottom: 6 }}>
              Data repository
            </div>
            <div style={{ color: C.muted, fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
              Your food logs will be saved as JSON files in this GitHub repo. Create it at{' '}
              <a href="https://github.com/new" target="_blank" rel="noreferrer"
                style={{ color: C.accent, textDecoration: 'none' }}>
                github.com/new
              </a>{' '}
              (can be private).
            </div>

            <label style={{ color: C.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>
              REPO NAME
            </label>
            <input
              type="text"
              value={repo}
              onChange={e => setRepo(e.target.value)}
              placeholder="calorie-ai"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{
                width: '100%', background: C.input, border: `1px solid ${C.border}`,
                borderRadius: 10, color: C.text, padding: '12px 14px', fontSize: 14,
                outline: 'none', marginBottom: 8,
              }}
            />
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>
              Logs saved to: <span style={{ color: C.text, fontFamily: 'monospace' }}>data/logs/YYYY-MM-DD.json</span>
            </div>

            {error && (
              <div style={{
                padding: '10px 12px', background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8,
                color: '#ef4444', fontSize: 13, marginBottom: 12,
              }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(1)} style={{
                padding: '14px 20px', borderRadius: 12, border: `1px solid ${C.border}`,
                background: 'none', color: C.muted, fontWeight: 600, fontSize: 15, cursor: 'pointer',
              }}>← Back</button>
              <button onClick={handleLogin} disabled={loading} style={{
                flex: 1, padding: 14, borderRadius: 12, border: 'none',
                background: loading ? C.border : 'linear-gradient(135deg,#f97316,#ea580c)',
                color: loading ? C.muted : 'white',
                fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {loading ? (
                  <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Connecting...</>
                ) : '🔒 Sign In'}
              </button>
            </div>
          </>
        )}
      </div>

      <div style={{ color: C.muted, fontSize: 12, marginTop: 20, textAlign: 'center', lineHeight: 1.6 }}>
        Your token is stored only in this browser's localStorage.<br />
        Food logs are saved privately to your GitHub repo.
      </div>
    </div>
  )
}
