# Sternengeschichten 3D

Eine interaktive, dreidimensionale Graph-Visualisierung aller Episoden des Astronomie-Podcasts **"Sternengeschichten"**.

# Hintergrund

Beim Hören einer Folge habe ich mir einmal die Frage gestellt – da Florian oft auf ältere Episoden referenziert –, wie häufig er das eigentlich tut und ob man diese Verknüpfungen visualisieren kann. So entstand der Gedanke, das Ganze im 3D-Raum darzustellen, woraus schließlich diese Webseite hervorgegangen ist.

# URL der Webseite
## https://h3nry244.github.io/Sternengeschichten_Visualisieren/

# Funktionalität und Funktionsweise

*Wer sich nur schnell die Features anschauen möchte, kann einfach weiter nach unten scrollen.*

Beim Öffnen der Webseite sieht man alle Folgen als sogenannte „Nodes“ (Knotenpunkte). Hovert man über eine Node, erscheinen der Titel der Folge sowie die zugehörigen Tags (auf diese gehe ich später genauer ein). Ein Klick auf eine Node leitet direkt zur jeweiligen Episode auf [sternengeschichten.podigee.io](https://sternengeschichten.podigee.io) weiter. Die Steuerung der Ansicht ist intuitiv: Mit der linken Maustaste lässt sich der Raum drehen, mit dem Mausrad zoomen und mit der rechten Maustaste verschieben.

### Steuerung & Interfaces

* **Zentrieren:** Oben rechts befindet sich ein Button, um das gesamte „Universum“ wieder in der Bildmitte auszurichten.
* **Suche:** In der Mitte kann gezielt nach einzelnen Folgen gesucht werden, um deren Zusammenhänge zu analysieren.
* **Themen-Filter & Farbcodierung:** Oben links bietet ein Dropdown-Menü die Möglichkeit, das Thema der dargestellten Nodes auszuwählen. Die Nodes sind farblich nach Themengruppen codiert, welche auf Basis des primären Tags bestimmt werden.
* **Referenzen & Ähnlichkeiten:** Das Kernstück des Projekts. Standardmäßig zeigt der Schalter die *direkten Referenzen* an – das bedeutet, dass Verbindungslinien nur gezogen werden, wenn eine ältere Folge explizit erwähnt wurde (z. B. „wie in Folge 300 erwähnt“). 

Klickt man den Schalter nach rechts, wechselt die Ansicht zu den **Themen-Referenzen**:
In dieser Ansicht werden Folgen mit ähnlichen Inhalten verknüpft. Um zu bestimmen, wie ähnlich sich zwei Folgen sind, berechnen wir in einem 384-dimensionalen Vektorraum den Abstand (Winkel via Kosinus-Ähnlichkeit) zwischen zwei Vektoren. Das Ergebnis ist ein Ähnlichkeitswert zwischen 0 und 1. Die Vektoren selbst werden über ein lokal laufendes KI-Modell (`paraphrase-multilingual-MiniLM-L12-v2`) generiert.

Da das Anzeigen aller Verbindungen in einem unübersichtlichen Chaos enden würde, kommt ein Grenzwert (**Threshold**) zum Einsatz: Dieser bestimmt, ab welchem Ähnlichkeitswert eine Linie gezeichnet wird. Anstatt diesen Wert fest vorzugeben, habe ich einen **Slider** eingebaut, mit dem sich der Threshold dynamisch anpassen lässt. Standardmäßig liegt er bei **0,75**. Er kann auf bis zu **0,5** gesenkt werden (Achtung: führt zu hoher Rechenlast/Ruckeln) oder auf **0,85** angehoben werden.

### Daten-Pipeline & Automatisierung

Wie werden neue Folgen hinzugefügt, klassifiziert und verknüpft?

1. **Automatisches Einlesen:** Über **GitHub Actions** wird jeden Freitag um 14:00 Uhr automatisch die neueste Episode erfasst.
2. **Scraping (`scraper.py`):** Das Python-Skript holt über den RSS-Feed ([sternengeschichten.podigee.io/feed/mp3](https://sternengeschichten.podigee.io/feed/mp3)) alle Metadaten wie Titel, URL, manuelle Tags und das Transkript.
   * *Hinweis zu den Transkripten:* Bis etwa Folge 300 gab es keine öffentlichen Transkripte. Auf Nachfrage hat mir Florian freundlicherweise die Texte der ersten 300 Folgen zur Verfügung gestellt. An dieser Stelle noch einmal ein herzliches Dankeschön dafür – ohne diese Daten wäre das Projekt in dieser Form nicht möglich gewesen!
3. **Vektorisierung (`build_topics.py`):** Sobald die Rohdaten vorliegen, wird das Transkript vektorisiert und auf Ähnlichkeiten zu allen anderen Folgen geprüft.
4. **Bereitstellung:** Alle Ergebnisse werden in die `episodes.json` geschrieben, welche vom Frontend geladen wird.

---

## Features

* **Interaktiver 3D-Graph:** Erkunde Hunderte Podcast-Folgen in einem frei dreh- und zoombaren Raum (basierend auf *Three.js* / *3d-force-graph*).
* **KI-Vektorisierung (Sentence Transformers):** Verhindert das „Hairball-Problem“ (chaotische Riesen-Klumpen), indem Themen-Zusammenhänge über einen 384-dimensionalen Vektorraum und Kosinus-Ähnlichkeit berechnet werden.
* **Live Similarity-Threshold Slider:** Passe den Ähnlichkeits-Schwellenwert direkt auf der Webseite in Echtzeit an, um feinere oder breitere Themenblöcke sichtbar zu machen.
* **Vollautomatisches Update (GitHub Actions):** Läuft jeden Freitag autonom ab – zieht neue Folgen, berechnet die Vektoren neu und committet das Ergebnis ins Repository.
* **Suche & Themen-Filter:** Schnellsuche nach Episodennummern oder Titeln inklusive automatischer Kamera-Zentrierung sowie Kategorie-Clustering.

---

## Tech Stack

* **Frontend:** JavaScript (ES6+), HTML5, CSS3, [3d-force-graph](https://github.com/vasturiano/3d-force-graph)
* **Backend & Data Processing:** Python 3.10+
  * `sentence-transformers` (`paraphrase-multilingual-MiniLM-L12-v2`)
  * `scikit-learn` (Cosine Similarity)
  * `numpy`
* **Automation:** GitHub Actions (Cronjobs)

---

## Projektstruktur

```text
.
├── .github/
│   └── workflows/
│       └── update.yml        # Wöchentlicher GitHub Action Workflow
├── episodes.json             # Episoden-Datenbank inkl. Vektor-Scores
├── scraper.py                # Scrapt neue Sternengeschichten-Folgen
├── build_topics.py          # Berechnet KI-Embeddings & Ähnlichkeiten
├── index.html                # Frontend-Struktur & Controls
├── script.js                 # Graph-Logik, Kamera-Steuerung & Filter
├── style.css                 # Kosmisches Neon-Styling
└── requirements.txt          # Python-Abhängigkeiten
