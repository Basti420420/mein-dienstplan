import React, {useEffect, useMemo, useState} from "react";
import {createRoot} from "react-dom/client";
import "./styles.css";

type Shift = {
  id:string; date:string; start:string; end:string; department:string;
  pause:boolean; note:string;
};

const demo:Shift[] = [
  {id:"demo-1",date:new Date().toISOString().slice(0,10),start:"08:00",end:"16:30",department:"Ware",pause:true,note:""},
];

function App(){
  const [shifts,setShifts]=useState<Shift[]>(()=>JSON.parse(localStorage.getItem("shifts")||"null")||demo);
  const [tab,setTab]=useState<"plan"|"add">("plan");
  const [form,setForm]=useState<Shift>({id:"",date:new Date().toISOString().slice(0,10),start:"08:00",end:"16:30",department:"",pause:false,note:""});
  const [photo,setPhoto]=useState<string|null>(null);
  const [notice,setNotice]=useState("");

  useEffect(()=>localStorage.setItem("shifts",JSON.stringify(shifts)),[shifts]);

  const sorted=useMemo(()=>[...shifts].sort((a,b)=>a.date.localeCompare(b.date)),[shifts]);

  function save(){
    if(!form.date||!form.start||!form.end){setNotice("Datum und Arbeitszeit fehlen.");return}
    const item={...form,id:form.id||crypto.randomUUID()};
    setShifts(s=>[...s.filter(x=>x.id!==item.id),item]);
    setForm({id:"",date:form.date,start:"08:00",end:"16:30",department:"",pause:false,note:""});
    setTab("plan"); setNotice("Dienst gespeichert.");
  }
  function remove(id:string){setShifts(s=>s.filter(x=>x.id!==id))}
  function edit(x:Shift){setForm(x);setTab("add")}
  function exportICS(){
    const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Mein Dienstplan//DE"];
    for(const x of shifts){
      const d=x.date.replaceAll("-","");
      lines.push("BEGIN:VEVENT",`UID:${x.id}@mein-dienstplan`,`DTSTART:${d}T${x.start.replace(":","")}00`,`DTEND:${d}T${x.end.replace(":","")}00`,`SUMMARY:Dienst – ${x.department||"Arbeit"}`,`DESCRIPTION:${x.pause?"Ösi-Pause: Ja":"Ösi-Pause: Nein"}${x.note?`\\n${x.note}`:""}`,"END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    const blob=new Blob([lines.join("\r\n")],{type:"text/calendar"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="mein-dienstplan.ics";a.click();
  }
  function photoSelected(e:React.ChangeEvent<HTMLInputElement>){
    const f=e.target.files?.[0]; if(!f)return;
    setPhoto(URL.createObjectURL(f));
    setNotice("Foto übernommen. Die OCR-Erkennung wird als nächster Schritt eingebaut; Felder können bereits manuell korrigiert werden.");
  }

  return <div className="app">
    <header><div><span className="eyebrow">MEIN</span><h1>Dienstplan</h1></div><button className="icon" onClick={()=>setTab("add")}>＋</button></header>

    {notice && <div className="notice" onClick={()=>setNotice("")}>{notice}</div>}

    {tab==="plan" ? <>
      <section className="hero">
        <div><span className="muted">Meine Dienste</span><strong>{shifts.length}</strong></div>
        <button onClick={exportICS}>📅 Kalender exportieren</button>
      </section>
      <div className="cards">
        {sorted.length===0 && <div className="empty">Noch keine Dienste. Füge deinen ersten Dienst hinzu.</div>}
        {sorted.map(x=><article className="shift" key={x.id}>
          <div className="date">{new Date(x.date+"T12:00").toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"})}</div>
          <div className="time">{x.start}<span>–</span>{x.end}</div>
          <div className="meta"><b>{x.department||"Keine Abteilung"}</b><span>{x.pause?"Ösi-Pause ✓":"Ösi-Pause –"}</span></div>
          {x.note&&<p>{x.note}</p>}
          <div className="actions"><button onClick={()=>edit(x)}>Bearbeiten</button><button className="danger" onClick={()=>remove(x.id)}>Löschen</button></div>
        </article>)}
      </div>
      <button className="fab" onClick={()=>setTab("add")}>＋ Dienst hinzufügen</button>
    </> : <>
      <section className="panel">
        <h2>Dienst hinzufügen</h2>
        <label>Plan-Foto (optional)<input type="file" accept="image/*" capture="environment" onChange={photoSelected}/></label>
        {photo&&<img className="preview" src={photo}/>}
        <div className="grid">
          <label>Datum<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label>
          <label>Abteilung<input placeholder="z.B. Ware, Kasse" value={form.department} onChange={e=>setForm({...form,department:e.target.value})}/></label>
          <label>Von<input type="time" value={form.start} onChange={e=>setForm({...form,start:e.target.value})}/></label>
          <label>Bis<input type="time" value={form.end} onChange={e=>setForm({...form,end:e.target.value})}/></label>
        </div>
        <label className="check"><input type="checkbox" checked={form.pause} onChange={e=>setForm({...form,pause:e.target.checked})}/> Ösi-Pause: Ja</label>
        <label>Notiz<textarea placeholder="Optional" value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></label>
        <div className="row"><button className="secondary" onClick={()=>setTab("plan")}>Abbrechen</button><button className="primary" onClick={save}>Speichern</button></div>
      </section>
    </>}
    <nav><button className={tab==="plan"?"active":""} onClick={()=>setTab("plan")}>📋<span>Plan</span></button><button className={tab==="add"?"active":""} onClick={()=>setTab("add")}>＋<span>Hinzufügen</span></button></nav>
  </div>
}
createRoot(document.getElementById("root")!).render(<App/>);