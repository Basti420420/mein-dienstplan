
import { useEffect, useRef, useState } from "react";
import Tesseract from "tesseract.js";
import { enablePush } from "./firebase";

type Shift = {
  id: string;
  date: string;
  start: string;
  end: string;
  breakIncluded: boolean;
  department: string;
  note: string;
};

const STORAGE_KEY = "mein-dienstplan-shifts";

function todayString() {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export default function App() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [date, setDate] = useState(todayString());
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [breakIncluded, setBreakIncluded] = useState(false);
  const [department, setDepartment] = useState("Ware");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setShifts(JSON.parse(saved) as Shift[]);
    } catch {
      setStatus("Gespeicherte Schichten konnten nicht geladen werden.");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shifts));
  }, [shifts]);

  function saveShift() {
    if (!date || !start || !end) {
      setStatus("Bitte Datum sowie Anfangs- und Endzeit eingeben.");
      return;
    }

    const shift: Shift = {
      id: crypto.randomUUID(),
      date,
      start,
      end,
      breakIncluded,
      department,
      note
    };

    setShifts(current =>
      [...current, shift].sort((a, b) =>
        `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`)
      )
    );

    setStatus("Schicht gespeichert.");
    setNote("");
  }

  function deleteShift(id: string) {
    setShifts(current => current.filter(shift => shift.id !== id));
    setStatus("Schicht gelöscht.");
  }

  async function readPhoto(file?: File) {
    if (!file) return;

    setBusy(true);
    setStatus("Foto wird gelesen …");

    try {
      const result = await Tesseract.recognize(file, "deu+eng");
      setOcrText(result.data.text);
      setStatus("Texterkennung abgeschlossen. Bitte Angaben prüfen.");
    } catch {
      setStatus("Das Foto konnte nicht erkannt werden.");
    } finally {
      setBusy(false);
    }
  }

  async function activatePush() {
    setStatus("Push-Berechtigung wird angefragt …");

    try {
      const token = await enablePush();

      // Der Token wird vorerst nur lokal abgelegt.
      // Für den automatischen Versand muss er sicher an ein Backend
      // übermittelt und dort einem Nutzer/Gerät zugeordnet werden.
      localStorage.setItem("mein-dienstplan-fcm-token", token);
      setStatus("Push wurde aktiviert. Der Token ist auf diesem Gerät gespeichert.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Push konnte nicht aktiviert werden."
      );
    }
  }

  return (
    <main className="app">
      <header className="hero">
        <div className="eyebrow">DEIN PERSÖNLICHER SCHICHTPLAN</div>
        <h1>Mein Dienstplan</h1>
        <p>Schichten eintragen, Fotos auslesen und den Überblick behalten.</p>
      </header>

      <section className="panel">
        <h2>Schicht hinzufügen</h2>

        <label>
          Datum
          <input
            type="date"
            value={date}
            onChange={event => setDate(event.target.value)}
          />
        </label>

        <div className="two-columns">
          <label>
            Von
            <input
              type="time"
              value={start}
              onChange={event => setStart(event.target.value)}
            />
          </label>
          <label>
            Bis
            <input
              type="time"
              value={end}
              onChange={event => setEnd(event.target.value)}
            />
          </label>
        </div>

        <label>
          Abteilung
          <select
            value={department}
            onChange={event => setDepartment(event.target.value)}
          >
            <option>Ware</option>
            <option>Kasse</option>
            <option>Getränke</option>
            <option>Backshop</option>
            <option>Sonstiges</option>
          </select>
        </label>

        <label className="check-row">
          <input
            type="checkbox"
            checked={breakIncluded}
            onChange={event => setBreakIncluded(event.target.checked)}
          />
          Ösi-Pause / Pause ist enthalten
        </label>

        <label>
          Notiz
          <input
            type="text"
            value={note}
            onChange={event => setNote(event.target.value)}
            placeholder="Optional"
          />
        </label>

        <button className="primary" onClick={saveShift}>
          Schicht speichern
        </button>
      </section>

      <section className="panel">
        <h2>Planfoto auslesen</h2>
        <p className="muted">
          Wähle ein Foto deines Dienstplans. Der erkannte Text ist ein
          Vorschlag und sollte kontrolliert werden.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={event => readPhoto(event.target.files?.[0])}
        />

        <button
          className="secondary"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? "Foto wird gelesen …" : "Foto auswählen / aufnehmen"}
        </button>

        {ocrText && (
          <label>
            Erkannter Text – bitte prüfen
            <textarea
              rows={8}
              value={ocrText}
              onChange={event => setOcrText(event.target.value)}
            />
          </label>
        )}
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Deine Schichten</h2>
          <span className="count">{shifts.length}</span>
        </div>

        {shifts.length === 0 ? (
          <p className="muted">Noch keine Schichten eingetragen.</p>
        ) : (
          <div className="shift-list">
            {shifts.map(shift => (
              <article className="shift-card" key={shift.id}>
                <div className="shift-date">
                  {new Date(`${shift.date}T12:00:00`).toLocaleDateString(
                    "de-DE",
                    { weekday: "short", day: "2-digit", month: "2-digit" }
                  )}
                </div>
                <div className="shift-info">
                  <strong>{shift.start} – {shift.end} Uhr</strong>
                  <span>{shift.department}</span>
                  <small>
                    Pause: {shift.breakIncluded ? "Ja" : "Nein"}
                    {shift.note ? ` · ${shift.note}` : ""}
                  </small>
                </div>
                <button
                  className="delete"
                  aria-label="Schicht löschen"
                  onClick={() => deleteShift(shift.id)}
                >
                  Löschen
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel push-panel">
        <h2>Push-Benachrichtigungen</h2>
        <p className="muted">
          Aktiviere Benachrichtigungen auf diesem Gerät. Der automatische
          Versand um 20:30 Uhr benötigt noch einen Firebase-Hintergrunddienst.
        </p>
        <button className="secondary" onClick={activatePush}>
          Push aktivieren
        </button>
      </section>

      {status && <p className="status" role="status">{status}</p>}

      <footer>
        Mein Dienstplan · Deine Einträge werden lokal in diesem Browser gespeichert.
      </footer>
    </main>
  );
}
