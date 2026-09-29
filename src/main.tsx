import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createWorker } from 'tesseract.js'
import { supabase } from './supabase'
import './styles.css'

type Shift = {
  id?: string
  user_id?: string
  date: string
  start: string
  end: string
  department: string
  pause: boolean
  note: string
}

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

function isoToday() {
  const d = new Date(); const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`
}
function formatDate(s: string) {
  const d = new Date(s + 'T12:00:00')
  return d.toLocaleDateString('de-DE', {weekday:'short', day:'2-digit', month:'2-digit'})
}
function b64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - base64.length % 4) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

async function ensureAuth() {
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session.user
  const result = await supabase.auth.signInAnonymously()
  if (result.error) throw result.error
  return result.data.user
}

async function registerPush(userId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY.startsWith('DEIN_')) {
    throw new Error('Push ist noch nicht konfiguriert.')
  }
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Benachrichtigungen wurden nicht erlaubt.')
  const reg = await navigator.serviceWorker.register('./sw.js')
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: b64ToUint8Array(VAPID_PUBLIC_KEY)
  })
  const json = subscription.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: json.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin',
    enabled: true
  }, { onConflict: 'endpoint' })
  if (error) throw error
}

function parseOCR(text: string): Partial<Shift> {
  const times = [...text.matchAll(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/g)].map(m => `${m[1].padStart(2,'0')}:${m[2]}`)
  const departments = ['Ware','Kasse','Info','Backshop','Lager','Bäckerei','Getränke','Markt']
  const dep = departments.find(d => text.toLowerCase().includes(d.toLowerCase())) || ''
  const pauseMatch = text.match(/(?:ösi|oesi|pause)[^\n]{0,30}/i)
  const pause = pauseMatch ? !/(nein|no|0|ohne)/i.test(pauseMatch[0]) : false
  const dateMatch = text.match(/\b(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?\b/)
  let date = isoToday()
  if (dateMatch) {
    const y = dateMatch[3] ? (dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3]) : String(new Date().getFullYear())
    date = `${y}-${dateMatch[2].padStart(2,'0')}-${dateMatch[1].padStart(2,'0')}`
  }
  return { date, start: times[0] || '', end: times[1] || '', department: dep, pause }
}

function App() {
  const [userId, setUserId] = useState('')
  const [shifts, setShifts] = useState<Shift[]>([])
  const [tab, setTab] = useState<'plan'|'add'>('plan')
  const [form, setForm] = useState<Shift>({date:isoToday(),start:'',end:'',department:'Ware',pause:false,note:''})
  const [ocrText, setOcrText] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [reminderEnabled, setReminderEnabled] = useState(true)
  const [reminderTime, setReminderTime] = useState('20:00')
  const inputRef = useRef<HTMLInputElement>(null)

  const load = async (uid: string) => {
    const { data, error } = await supabase.from('shifts').select('*').eq('user_id',uid).order('date').order('start')
    if (error) setMessage(error.message)
    else setShifts(data || [])
  }

  const loadReminderSettings = async (uid: string) => {
    const { data, error } = await supabase.from('reminder_settings').select('enabled,reminder_time').eq('user_id',uid).maybeSingle()
    if (!error && data) { setReminderEnabled(data.enabled); setReminderTime(String(data.reminder_time).slice(0,5)) }
    else if (!data) { await supabase.from('reminder_settings').upsert({user_id:uid,enabled:true,reminder_time:'20:00',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin'}) }
  }

  useEffect(() => {
    ensureAuth().then(async u => { if (u) { setUserId(u.id); await load(u.id); await loadReminderSettings(u.id) } }).catch(e => setMessage(e.message))
  }, [])

  const save = async () => {
    if (!userId || !form.date || !form.start || !form.end) return setMessage('Datum, Beginn und Ende ausfüllen.')
    setBusy(true); setMessage('')
    const payload = {...form, user_id:userId}
    const { error } = form.id
      ? await supabase.from('shifts').update(payload).eq('id',form.id).eq('user_id',userId)
      : await supabase.from('shifts').insert(payload)
    setBusy(false)
    if (error) return setMessage(error.message)
    await load(userId); setForm({date:isoToday(),start:'',end:'',department:'Ware',pause:false,note:''}); setTab('plan')
  }

  const edit = (s: Shift) => { setForm({...s}); setTab('add') }
  const remove = async (id?: string) => {
    if (!id || !confirm('Dienst löschen?')) return
    await supabase.from('shifts').delete().eq('id',id).eq('user_id',userId)
    await load(userId)
  }

  const scan = async (file?: File) => {
    if (!file) return
    setBusy(true); setMessage('Dienstplan wird gelesen…')
    try {
      const worker = await createWorker('deu')
      const result = await worker.recognize(file)
      await worker.terminate()
      setOcrText(result.data.text)
      setForm(f => ({...f, ...parseOCR(result.data.text)}))
      setMessage('Erkannt – bitte Angaben prüfen und speichern.')
    } catch(e:any) { setMessage(e.message || 'OCR fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  const saveReminderSettings = async (enabled = reminderEnabled, time = reminderTime) => {
    if (!userId) return
    const { error } = await supabase.from('reminder_settings').upsert({user_id:userId,enabled,reminder_time:time,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin',updated_at:new Date().toISOString()})
    if (error) setMessage(error.message); else setMessage(enabled ? `Erinnerung täglich um ${time} Uhr aktiviert.` : 'Erinnerung deaktiviert.')
  }

  const exportICS = () => {
    const body = shifts.map(s => {
      const start = s.date.replaceAll('-','') + 'T' + s.start.replace(':','') + '00'
      const end = s.date.replaceAll('-','') + 'T' + s.end.replace(':','') + '00'
      return `BEGIN:VEVENT\\nUID:${s.id || crypto.randomUUID()}\\nDTSTART:${start}\\nDTEND:${end}\\nSUMMARY:Dienst – ${s.department}\\nDESCRIPTION:Ösi-Pause: ${s.pause?'Ja':'Nein'}${s.note?'\\\\n'+s.note:''}\\nEND:VEVENT`
    }).join('\\n')
    const blob = new Blob([`BEGIN:VCALENDAR\\nVERSION:2.0\\nPRODID:-//Mein Dienstplan//DE\\n${body}\\nEND:VCALENDAR`],{type:'text/calendar'})
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='mein-dienstplan.ics'; a.click()
  }

  const tomorrow = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate()+1)
    const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`
  },[])
  const next = shifts.find(s => s.date >= isoToday())

  return <main>
    <header><div><h1>Mein Dienstplan</h1><p>Supabase · 20-Uhr-Erinnerung</p></div><button className="ghost" onClick={() => registerPush(userId).then(async()=>{await saveReminderSettings(true,reminderTime);setMessage('Push und Erinnerung aktiviert.');}).catch(e=>setMessage(e.message))}>🔔 Push aktivieren</button></header>

    {message && <div className="message">{message}</div>}

    <section className="next"><small>Erinnerung am Vorabend</small><div className="grid"><label className="check"><input type="checkbox" checked={reminderEnabled} onChange={e=>{setReminderEnabled(e.target.checked); saveReminderSettings(e.target.checked,reminderTime)}}/> Jeden Tag erinnern</label><label>Uhrzeit<input type="time" value={reminderTime} onChange={e=>{setReminderTime(e.target.value); saveReminderSettings(reminderEnabled,e.target.value)}}/></label></div><span>Morgen wird der nächste Dienst angezeigt. Standard: 20:00 Uhr.</span></section>

    <nav><button className={tab==='plan'?'active':''} onClick={()=>setTab('plan')}>Plan</button><button className={tab==='add'?'active':''} onClick={()=>setTab('add')}>+ Dienst</button></nav>

    {tab==='plan' && <section>
      <div className="toolbar"><button onClick={()=>{setForm({date:tomorrow,start:'',end:'',department:'Ware',pause:false,note:''});setTab('add')}}>Morgen eintragen</button><button onClick={exportICS}>Kalender exportieren</button></div>
      {next && <div className="next"><small>Nächster Dienst</small><strong>{formatDate(next.date)} · {next.start}–{next.end}</strong><span>{next.department}{next.pause?' · Ösi-Pause':''}</span></div>}
      <div className="list">{shifts.map(s=><article key={s.id}><div><small>{formatDate(s.date)}</small><h2>{s.start}–{s.end}</h2><p>{s.department} {s.pause?'· Ösi-Pause':''}</p>{s.note&&<p>{s.note}</p>}</div><div className="actions"><button onClick={()=>edit(s)}>✏️</button><button onClick={()=>remove(s.id)}>🗑️</button></div></article>)}</div>
      {!shifts.length && <p className="empty">Noch keine Dienste. Füge einen Dienst hinzu oder fotografiere deinen Plan.</p>}
    </section>}

    {tab==='add' && <section className="form">
      <button className="scan" onClick={()=>inputRef.current?.click()} disabled={busy}>📷 Dienstplan fotografieren / auswählen</button>
      <input ref={inputRef} hidden type="file" accept="image/*" capture="environment" onChange={e=>scan(e.target.files?.[0])}/>
      {ocrText && <details><summary>OCR-Text anzeigen</summary><pre>{ocrText}</pre></details>}
      <label>Datum<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label>
      <div className="grid"><label>Von<input type="time" value={form.start} onChange={e=>setForm({...form,start:e.target.value})}/></label><label>Bis<input type="time" value={form.end} onChange={e=>setForm({...form,end:e.target.value})}/></label></div>
      <label>Abteilung<select value={form.department} onChange={e=>setForm({...form,department:e.target.value})}>{['Ware','Kasse','Info','Backshop','Lager','Bäckerei','Getränke','Markt','Sonstiges'].map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="check"><input type="checkbox" checked={form.pause} onChange={e=>setForm({...form,pause:e.target.checked})}/> Ösi-Pause</label>
      <label>Notiz<textarea value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></label>
      <button className="save" onClick={save} disabled={busy}>{form.id?'Änderungen speichern':'Dienst speichern'}</button>
    </section>}
  </main>
}

createRoot(document.getElementById('root')!).render(<App />)
