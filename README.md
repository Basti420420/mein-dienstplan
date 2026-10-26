# Mein Dienstplan

Kostenlose mobile Web-App für Kollegen: Wochenplan fotografieren oder hochladen, eigene Mitarbeiterzeilen markieren, Arbeitszeiten per OCR lesen, überprüfen, lokal speichern und als iPhone-/Android-Kalenderdatei exportieren.

## Bereitstellen

1. Alle Dateien einschließlich `.github/workflows/deploy.yml` in den Branch `main` des GitHub-Repositories kopieren.
2. Repository → **Settings → Pages → Source: GitHub Actions**.
3. Workflow **Deploy GitHub Pages** ausführen lassen.
4. Anschließend `https://basti420420.github.io/mein-dienstplan/` öffnen und auf dem Smartphone zum Home-Bildschirm hinzufügen.

## Verwendung

1. Dienstplan als Foto aufnehmen oder Bild hochladen.
2. Auf dem Foto die gesamte Mitarbeitergruppe (Name, Funktion, Uhrzeiten) vertikal markieren. Linke und rechte Begrenzung der Wochentag-Spalten bei Bedarf anpassen.
3. Wochenbeginn (Montag) wählen und **Meine Woche erkennen** drücken.
4. Erkannte Zeiten, Pausen, Abteilungen und Freitage prüfen und korrigieren.
5. Woche speichern und `.ics` exportieren. Die Kalenderdatei enthält Erinnerungen für Arbeitstage.

## Hinweise und Grenzen

- Alle Fotos werden **lokal im Browser** verarbeitet, nicht an einen eigenen Server hochgeladen. Beim ersten Start lädt Tesseract.js das OCR-Modell aus dem Internet.
- OCR ist experimentell: Perspektive, Knicke und kleine Schrift können zu Fehlern führen. **Alle Ergebnisse vor dem Speichern prüfen.**
- Die Position der Mitarbeitergruppe kann wiederverwendet werden, aber Fotos sollten ähnlich ausgerichtet sein.
- Die Schichten bleiben im Browser-LocalStorage auf dem jeweiligen Gerät. Bei Browserdatenlöschung gehen sie verloren.
- `.ics` ist ein Import, keine laufende bidirektionale Kalendersynchronisierung. Für spätere Änderungen die neuen Termine prüfen, um Duplikate zu vermeiden.
- Die `VALARM`-Einträge in der `.ics`-Datei werden je nach Kalender-App unterschiedlich unterstützt. Für verlässliche 20:30-Erinnerungen bei **jedem** Dienst ist eventuell eine eigene Kalendereinstellung oder ein Push-Dienst nötig.
- Keine gemeinsame Ablage, keine Anmeldung, keine Kosten für den Betrieb auf GitHub Pages.
