import { useState, useEffect } from 'react'
import { getRepoFile, listRepoDir, logPath } from '../github.js'

const C = {
  bg: '#0f1117', card: '#1a1d27', border: '#2a2d3a',
  accent: '#f97316', accentSoft: 'rgba(249,115,22,0.12)',
  text: '#e8eaf0', muted: '#6b7280', input: '#12141e',
  green: '#22c55e', blue: '#3b82f6', purple: '#a855f7',
}

function DayCard({ dateKey, onClick }) {
  const date = new Date(dateKey + 'T12:00:00')
  const label = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
      marginBottom: 8, transition: 'border-color 0.2s',
    }}
      onMouseOver={e => e.currentTarget.style.borderColor = C.accent}
      onMouseOut={e => e.currentTarget.style.borderColor = C.border}
    >
      <div style={{ color: C.text, fontWeight: 600 }}>{label}</div>
      <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{dateKey}</div>
    </button>
  )
}

function MacroPill({ label, value, color }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: `${color}18`, border: `1px solid ${color}40`,
      borderRadius: 6, padding: '3px 8px', fontSize: 12,
    }}>
      <span style={{ color }}>{label}</span>
      <span style={{ color: C.text, fontWeight: 600 }}>{value}g</span>
    </div>
  )
}

export default function HistoryScreen({ token, owner, repo, dataPath, onClose }) {
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [selectedData, setSelectedData] = useState(null)
  const [loadingDay, setLoadingDay] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const files = await listRepoDir(token, owner, repo, dataPath)
        const keys = files
          .filter(f => f.name.endsWith('.json'))
          .map(f => f.name.replace('.json', ''))
          .sort()
          .reverse()
          .slice(0, 90)
        setDays(keys)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token, owner, repo, dataPath])

  const loadDay = async (dateKey) => {
    setLoadingDay(true)
    setSelected(dateKey)
    setSelectedData(null)
    try {
      const result = await getRepoFile(token, owner, repo, logPath(dateKey, dataPath))
      setSelectedData(result?.content || null)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingDay(false)
    }
  }

  const exportJSON = () => {
    if (!selectedData) return
    const blob = new Blob([JSON.stringify(selectedData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `calories-${selected}.json`
    a.click()
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
          <button onClick={() => selected ? (setSelected(null), setSelectedData(null)) : onClose()} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
            color: C.text, padding: '8px 12px', cursor: 'pointer', fontSize: 18,
          }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>
              {selected ? new Date(selected + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : 'History'}
            </div>
            <div style={{ color: C.muted, fontSize: 12 }}>
              {selected ? selected : `${days.length} days logged`}
            </div>
          </div>
          {selected && selectedData && (
            <button onClick={exportJSON} style={{
              background: C.accentSoft, border: `1px solid ${C.accent}`,
              borderRadius: 10, color: C.accent, padding: '8px 14px',
              cursor: 'pointer', fontWeight: 600, fontSize: 13,
            }}>↓ JSON</button>
          )}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>
            <div style={{ animation: 'pulse 1.5s ease infinite', fontSize: 32, marginBottom: 12 }}>📅</div>
            Loading history...
          </div>
        )}

        {!loading && !selected && (
          days.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: C.muted }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <div style={{ fontWeight: 600, color: C.text, marginBottom: 6 }}>No logs yet</div>
              <div style={{ fontSize: 14 }}>Start tracking meals and they'll appear here.</div>
            </div>
          ) : (
            days.map(d => <DayCard key={d} dateKey={d} onClick={() => loadDay(d)} />)
          )
        )}

        {selected && (
          loadingDay ? (
            <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>
              <div style={{ width: 24, height: 24, border: '2px solid #2a2d3a', borderTopColor: C.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              Loading...
            </div>
          ) : selectedData ? (
            <>
              {/* Day summary */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ color: C.muted, fontSize: 13 }}>Total calories</div>
                  <div style={{ fontFamily: 'Space Mono', fontSize: 28, fontWeight: 700, color: C.accent }}>
                    {selectedData.totalCalories} <span style={{ fontSize: 14, color: C.muted }}>kcal</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <MacroPill label="P" value={selectedData.totalProtein} color={C.green} />
                  <MacroPill label="C" value={selectedData.totalCarbs} color={C.blue} />
                  <MacroPill label="F" value={selectedData.totalFat} color={C.purple} />
                  {selectedData.totalFiber > 0 && <MacroPill label="Fiber" value={selectedData.totalFiber} color="#eab308" />}
                </div>
              </div>

              {/* Meals */}
              {selectedData.entries?.map((entry, ei) => (
                <div key={ei} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ color: C.text, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.label}
                    </div>
                    <div style={{ color: C.muted, fontSize: 12, marginLeft: 8, flexShrink: 0 }}>{entry.time}</div>
                  </div>
                  {entry.foods?.map((food, fi) => (
                    <div key={fi} style={{ background: C.input, borderRadius: 10, padding: '10px 12px', marginBottom: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ color: C.text, fontSize: 14, fontWeight: 500 }}>{food.name}</div>
                          <div style={{ color: C.muted, fontSize: 12 }}>{food.portion}</div>
                        </div>
                        <div style={{ color: C.accent, fontWeight: 700, fontFamily: 'Space Mono' }}>
                          {food.calories}
                        </div>
                      </div>
                    </div>
                  ))}
                  {entry.totalCalories && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                      <span style={{ color: C.muted, fontSize: 13 }}>Meal total</span>
                      <span style={{ color: C.accent, fontWeight: 700, fontFamily: 'Space Mono' }}>{entry.totalCalories} kcal</span>
                    </div>
                  )}
                </div>
              ))}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
              Could not load this day's log.
            </div>
          )
        )}
      </div>
    </div>
  )
}
