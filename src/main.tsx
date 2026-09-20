import { useState, useEffect, useMemo } from 'react'

type Shift = {
  id: string
  date: string      // YYYY-MM-DD
  start: string     // HH:MM
  end: string       // HH:MM
  note: string
  type: string      // Früh, Spät, Nacht, etc.
}

const SHIFT_TYPES = ['Früh', 'Spät', 'Nacht', 'Tag', 'Frei', 'Urlaub', 'Krank']

function calcHours(start: string, end: string): number {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let mins = eh * 60 + em - (sh * 60 + sm)
  if (mins < 0) mins += 24 * 60 // Nachtschicht
  return Math.round((mins / 60) * 100) / 100
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function monthKey(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

function todayISO(): string {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

export default function App() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [tab, setTab] = useState<'list' | 'stats' | 'add'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)

  const [form, setForm] = useState<Omit<Shift, 'id'>>({
    date: todayISO(),
    start: '08:00',
    end: '16:00',
    note: '',
    type: 'Früh',
  })

  // Laden
  useEffect(() => {
    try {
      const raw = localStorage.getItem('dienstplan')
      if (raw) setShifts(JSON.parse(raw))
    } catch (e) {
      console.error('Ladefehler:', e)
    }
  }, [])

  // Speichern
  useEffect(() => {
    localStorage.setItem('dienstplan', JSON.stringify(shifts))
  }, [shifts])

  const sortedShifts = useMemo(
    () => [...shifts].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [shifts]
  )

  const grouped = useMemo(() => {
    const g: Record<string, Shift[]> = {}
    for (const s of sortedShifts) {
      const k = monthKey(s.date)
      if (!g[k]) g[k] = []
      g[k].push(s)
    }
    return g
  }, [sortedShifts])

  const stats = useMemo(() => {
    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    let totalAll = 0
    let totalMonth = 0
    let countMonth = 0
    for (const s of shifts) {
      const h = calcHours(s.start, s.end)
      totalAll += h
      if (s.date.startsWith(thisMonth)) {
        totalMonth += h
        countMonth++
      }
    }
    return {
      totalAll: Math.round(totalAll * 100) / 100,
      totalMonth: Math.round(totalMonth * 100) / 100,
      countMonth,
      countAll: shifts.length,
    }
  }, [shifts])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.date || !form.start || !form.end) return

    if (editingId) {
      setShifts(prev => prev.map(s => (s.id === editingId ? { ...form, id: editingId } : s)))
      setEditingId(null)
    } else {
      setShifts(prev => [...prev, { ...form, id: crypto.randomUUID() }])
    }

    setForm({
      date: todayISO(),
      start: '08:00',
      end: '16:00',
      note: '',
      type: 'Früh',
    })
    setTab('list')
  }

  function startEdit(s: Shift) {
    setForm({ date: s.date, start: s.start, end: s.end, note: s.note, type: s.type })
    setEditingId(s.id)
    setTab('add')
  }

  function remove(id: string) {
    if (!confirm('Diesen Eintrag wirklich löschen?')) return
    setShifts(prev => prev.filter(s => s.id !== id))
  }

  function cancelEdit() {
    setEditingId(null)
    setForm({
      date: todayISO(),
      start: '08:00',
      end: '16:00',
      note: '',
      type: 'Früh',
    })
    setTab('list')
  }

  return (
    <div className="app">
      <header>
        <div>
          <small>Mein Dienstplan</small>
          <h1>{tab === 'list' ? 'Übersicht' : tab === 'stats' ? 'Statistik' : editingId ? 'Bearbeiten' : 'Neuer Eintrag'}</h1>
        </div>
      </header>

      <div className="tabs">
        <button className={tab === 'list' ? 'active' : ''} onClick={() => setTab('list')}>Liste</button>
        <button className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}>Statistik</button>
        <button className={tab === 'add' ? 'active' : ''} onClick={() => setTab('add')}>Hinzufügen</button>
      </div>

      {tab === 'list' && (
        <>
          {sortedShifts.length === 0 && (
            <div className="empty">Noch keine Einträge.<br />Tippe auf „Hinzufügen".</div>
          )}
          {Object.entries(grouped).map(([month, list]) => (
            <div key={month}>
              <div className="month-header">{month}</div>
              {list.map(s => {
                const h = calcHours(s.start, s.end)
                return (
                  <div key={s.id} className="shift">
                    <div className="info">
                      <div className="date">{formatDate(s.date)} · {s.type}</div>
                      <div className="time">{s.start} – {s.end}</div>
                      {s.note && <div className="note">{s.note}</div>}
                    </div>
                    <div className="hours">{h.toFixed(2)} h</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <button className="btn secondary" style={{ padding: '6px 10px', fontSize: 12, width: 'auto' }} onClick={() => startEdit(s)}>✎</button>
                      <button className="btn danger" onClick={() => remove(s.id)}>✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </>
      )}

      {tab === 'stats' && (
        <>
          <div className="stats">
            <div className="stat">
              <div className="value">{stats.totalMonth}</div>
              <div className="label">Stunden (Monat)</div>
            </div>
            <div className="stat">
              <div className="value">{stats.countMonth}</div>
              <div className="label">Dienste (Monat)</div>
            </div>
            <div className="stat">
              <div className="value">{stats.totalAll}</div>
              <div className="label">Stunden gesamt</div>
            </div>
            <div className="stat">
              <div className="value">{stats.countAll}</div>
              <div className="label">Einträge gesamt</div>
            </div>
          </div>

          <div className="card">
            <h2>Monatsübersicht</h2>
            {Object.entries(grouped).map(([month, list]) => {
              const sum = list.reduce((a, s) => a + calcHours(s.start, s.end), 0)
              return (
                <div key={month} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>{month}</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                    {Math.round(sum * 100) / 100} h · {list.length} Dienste
                  </span>
                </div>
              )
            })}
            {Object.keys(grouped).length === 0 && <div className="empty">Keine Daten</div>}
          </div>
        </>
      )}

      {tab === 'add' && (
        <form onSubmit={handleSubmit} className="card">
          <div className="form-row full">
            <div>
              <label>Datum</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row full">
            <div>
              <label>Art</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {SHIFT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div>
              <label>Beginn</label>
              <input
                type="time"
                value={form.start}
                onChange={e => setForm({ ...form, start: e.target.value })}
                required
              />
            </div>
            <div>
              <label>Ende</label>
              <input
                type="time"
                value={form.end}
                onChange={e => setForm({ ...form, end: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row full">
            <div>
              <label>Notiz (optional)</label>
              <input
                type="text"
                value={form.note}
                placeholder="z. B. Spätschicht Filiale 3"
                onChange={e => setForm({ ...form, note: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="submit" className="btn">
              {editingId ? 'Änderung speichern' : 'Eintrag speichern'}
            </button>
            {editingId && (
              <button type="button" className="btn secondary" onClick={cancelEdit}>
                Abbrechen
              </button>
            )}
          </div>
        </form>
      )}

      {tab === 'list' && (
        <button className="fab" onClick={() => setTab('add')} aria-label="Neuer Eintrag">+</button>
      )}
    </div>
  )
}