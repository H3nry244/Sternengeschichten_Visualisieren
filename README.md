# Sternengeschichten 3D

Eine interaktive, dreidimensionale Graph-Visualisierung aller Episoden des AstronomiePodcasts **"Sternengeschichten"**. 

# Hitergrund

Ich habe mir beim hören einer Folge, einmal die Frage gestellt, da Florian eine ältere Episode referenziert, wie oft er das macht und ob man dies irgendwie darstellen kann. So bin ich dann auf den Gedanken gekommen, ob es nicht möglich sein kann, dass alles im 3D Raum darzustellen und dadurch ist diese Webseite enstanden.

# URL der Webseite
## https://h3nry244.github.io/Sternengeschichten_Visualisieren/

# Was kann die Webseite und wie funktioniert sie

Wenn jemand nur kurz die Features anschauen will, einfach weiter scrollen.

Als aller erstes, wenn man die Webseite öffnet, sieht man das alle Folgen, wenn man über eine sogenannte "Node", wenn man dann über die Node hovert erscheint der Folgen Name und darunter die "Tags"(Auf diese komme ich später noch genau). Falls man auf eine Node drauf klickt, wird man sofort zu dieser Folge, auf https://sternengeschichten.podigee.io, geleitet und kann sich diese bei Interesse anhören. Sonst kann man auch mit der linken Maus Taste das ganze auch drehen zoomen mit dem Mausrad und verschieben mit der rechten Maustaste.

Dann zu den Buttons und Interfaces. Oben rechts ist ein Knopf zum zentrieren des ganzen "Universums", welcher die Ansicht wieder zentriert. In der Mitte kann nach einer einzelnen Folge gesucht werden, falls man bestimmte Folgen und deren zusammenhänge nachschauen will. Oben links ist dann ein Dropdown Menü, in welchen sich das Thema der dargestellten Nodes ausgewählt werden kann. Und in diesem Zuge will ich auch gleich die Farben der Nodes erklären. Und zwar sind die Nodes Farbkodiert in bestimmte Themen Gruppen, welche je nach Inhalt der Folge bestimmt werden (mit Hilfe des Primary Tags). Und zu guter Letzt und wahrscheinlich zum Interessantestem von allem, die Referenzen. Standardmäßig ist der Toggle auf direkte Referenzen eingestellt, dass bedeutet die Linien zwischen den Folgen werden nur dann erzeugt, wenn eine ältere Folge direkt referenziert wurde, also z.B "Letze Folge …" oder "In Folge 300". So lassen sich schon interessante Zusammenhänge herausfinden, wenn man jedoch den Toogle nach rechts klickt, stellt man die Linien auf die "Themen Referenzen" Ansicht um. Um diese Ansicht zu verstehen müssen wir etwas tiefer in den Prozess dahinter gehen. In dieser Ansicht werden die Folgen mit ähnlichen Folgen verknüpft, wie wissen wir wie ähnlich Folgen sind? wie rechnen und in einen 384 hohen Raum den Abstand (Winkel --> Kosinus-Ähnlichkeit) zwischen zwei Vektoren aus und erhalten so die Ähnlichkeit in einen Wert zwischen 0 und 1 (exklusive). Die Vektoren selber lassen wir uns durch ein Lokal laufendes KI-Model (paraphrase-multilingual-MiniLM-L12-v2) erstellen. So erhalten wir zwischen jeden Folgen einen Wert, welcher uns sagt wie ähnlich sich die beiden Folgen sind. Wenn wir jetzt nur alle Beziehungen anzeigen lassen würden, wäre das ein chaotisches Spektakel, daher brauchen wir einen Grenzwert (Threshold), welcher uns sagt, ab wie viel Prozent (die Zahl zwischen 0 und 1) wird die Beziehung angezeigt. Ich habe am Anfang überlegt den Threshold manuell zu setzen habe dieses setzen und rumspielen mit diesem Wert so interessant gefunden, dass ich es nicht statisch gesetzt habe, sondern einen Slider eingebaut habe, mit welchen man den Threshold selbst setzen kann. Standartmäßig ist er auf 0.75, was ein guter Wert ist, aber er kann bis 0.5 runter gesetzt werden (Achtung es kann sehr stark ruckeln) und auf bis zu 0.85 raufgesetzt werden. 

Jetzt ist noch die Frage wie werden die neuen Folgen eingefügt, mit Tags versehen und Referenzen erstellt. Fangen wir an mit dem Punkt: Wie werden die neuen Folgen hinzugefügt? Und zwar gibt es in GitHub den Actions, mit diesem lasse ich jeden Freitag um 14:00 die neuste Sternengeschichten Folge einlesen. So bleibt alles aktuell. Jetzt läuft der "Scraper" (scraper.py), dieses Programm holt Mithilfe des RSS-Feeds oder auf der Webseite: https://sternengeschichten.podigee.io/feed/mp3 alle Infos, wie Titel, URL zur Folge, Manuelle Tags/Kategorien und das Transkript. Kurz ein Einschub zu Transkripten, und zwar gibt bis ca. Folge 300 keine Transkripte, daher habe ich Florian angeschrieben, ihm dieses Projekt vorgestellt und er hat mit alle Transkripte der 300 Folgen zukommen lassen, da wollte ich mich nochmal bedanken für die Texte, da ohne diese vieles nicht so möglich wäre wie es jetzt ist, danke! Nachdem jetzt alle "Rohdaten" erfasst und eingelesen wurden, wird das Transkript vektorisiert und nach Ähnlichkeiten mit anderen Folgen geprüft. All diese Infos werden dann in die Datei episodes.json geschrieben und dann beim nächsten Aufruf der Seite angezeigt.

---

## Features

* ** Interaktiver 3D-Graph:** Erkunde Hunderte Podcast-Folgen in einem frei dreh- und zoombaren Raum (basierend auf Three.js / 3d-force-graph).
* ** KI-Vektorisierung (Sentence Transformers):** Verhindert das "Hairball-Problem" (chaotische Riesen-Klumpen), indem Themen-Zusammenhänge über einen 384-dimensionalen Vektorraum und Kosinus-Ähnlichkeit berechnet werden.
* ** Live Similarity-Threshold Slider:** Passe den Ähnlichkeits-Schwellenwert direkt auf der Webseite in Echtzeit an, um feinere oder breitere Themen Blöcke sichtbar zu machen.
* ** Vollautomatisches Update (GitHub Actions):** Läuft jeden Freitag autonom ab – zieht neue Folgen, berechnet die Vektoren neu und committet das Ergebnis ins Repository.
* ** Suche & Themen-Filter:** Schnellsuche nach Episodennummern oder Titeln inklusive automatischer Kamera-Zentrierung sowie Kategorie-Clustering.

---

## Tech Stack

* **Frontend:** JavaScript (ES6+), HTML5, CSS3, [3d-force-graph](https://github.com/vasturiano/3d-force-graph)
* **Backend & Data Processing:** Python 3.10+
  * `sentence-transformers` (`paraphrase-multilingual-MiniLM-L12-v2`)
  * `scikit-learn` (Cosine Similarity)
  * `numpy`
* **Automation:** GitHub Actions (Cronjobs)

---

## 📁 Projektstruktur

```text
.
├── .github/
│   └── workflows/
│       └── update.yml       # Wöchentlicher GitHub Action Workflow
├── episodes.json            # Episoden-Datenbank inkl. Vektor-Scores
├── scraper.py               # Scrapt neue Sternengeschichten-Folgen
├── build_topics.py          # Berechnet KI-Embeddings & Ähnlichkeiten
├── index.html               # Frontend-Struktur & Controls
├── script.js                # Graph-Logik, Kamera-Steuerung & Filter
├── style.css                # Kosmisches Neon-Styling
└── requirements.txt         # Python-Abhängigkeiten

