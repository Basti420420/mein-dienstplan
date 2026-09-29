import webpush from "npm:web-push"
import { createClient } from "npm:@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY")!
const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY")!
const supabase = createClient(supabaseUrl, serviceKey)

webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com", vapidPublic, vapidPrivate)

function localParts(timezone: string) {
  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: false
  }).formatToParts(new Date())
  const h = Number(parts.find(p => p.type === "hour")?.value || 0)
  const m = Number(parts.find(p => p.type === "minute")?.value || 0)
  return { h, m }
}

function tomorrowFor(timezone: string) {
  const now = new Date()
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year:"numeric", month:"2-digit", day:"2-digit"
  })
  const parts = fmt.formatToParts(now)
  const y = Number(parts.find(p=>p.type==="year")?.value)
  const mo = Number(parts.find(p=>p.type==="month")?.value)
  const d = Number(parts.find(p=>p.type==="day")?.value)
  const local = new Date(Date.UTC(y,mo-1,d+1))
  return local.toISOString().slice(0,10)
}

Deno.serve(async () => {
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth,timezone")
    .eq("enabled", true)
  if (error) return Response.json({error:error.message},{status:500})

  let sent = 0
  for (const sub of subs || []) {
    const timezone = sub.timezone || "Europe/Berlin"
    const { data: settings } = await supabase
      .from("reminder_settings")
      .select("enabled,reminder_time,timezone")
      .eq("user_id", sub.user_id)
      .maybeSingle()

    if (settings && settings.enabled === false) continue

    const effectiveTimezone = settings?.timezone || timezone
    const {h,m} = localParts(effectiveTimezone)
    const configured = String(settings?.reminder_time || "20:00").slice(0,5)
    const [targetH, targetM] = configured.split(":").map(Number)
    if (h !== targetH || m !== targetM) continue

    const tomorrow = tomorrowFor(effectiveTimezone)
    const { data: shifts } = await supabase.from("shifts")
      .select("start,end,department,pause")
      .eq("user_id",sub.user_id).eq("date",tomorrow).order("start")

    if (!shifts?.length) continue
    // Skip if this user already received the reminder for this shift date.
    const { data: alreadySent } = await supabase.from("reminder_log")
      .select("user_id").eq("user_id", sub.user_id).eq("shift_date", tomorrow).maybeSingle()
    if (alreadySent) continue
    const body = shifts.map(s => `${s.start}–${s.end} ${s.department}${s.pause ? " · Ösi-Pause" : ""}`).join(" | ")
    try {
      await webpush.sendNotification(
        {endpoint:sub.endpoint, keys:{p256dh:sub.p256dh, auth:sub.auth}},
        JSON.stringify({title:"Mein Dienstplan",body:`Morgen: ${body}`})
      )
      const { error: logged } = await supabase.from("reminder_log").insert({
        user_id: sub.user_id,
        shift_date: tomorrow,
      })
      if (!logged) sent++
    } catch (e) {
      const msg = String(e)
      if (msg.includes("404") || msg.includes("410")) {
        await supabase.from("push_subscriptions").delete().eq("id",sub.id)
      }
    }
  }
  return Response.json({ok:true,sent})
})
