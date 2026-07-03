import json
import re
import xml.etree.ElementTree as ET
import requests
from bs4 import BeautifulSoup

# Der offizielle RSS-Feed des Podcasts (enthält alle 700+ Folgen)
FEED_URL = "https://sternengeschichten.podigee.io/feed/mp3"

# Einfaches Keyword-Mapping für automatische Kategorisierung anhand des Titels
TAG_MAPPING = {
    "planet": "Planeten",
    "exoplanet": "Planeten",
    "erde": "Planeten",
    "mars": "Planeten",
    "jupiter": "Planeten",
    "stern": "Sterne",
    "sonne": "Sterne",
    "zwerg": "Sterne",
    "riese": "Sterne",
    "galax": "Galaxien",
    "milchstraße": "Galaxien",
    "neb": "Galaxien",
    "kosmo": "Kosmologie",
    "urknall": "Kosmologie",
    "dunkle materie": "Kosmologie",
    "energie": "Kosmologie",
    "teleskop": "Sonnensystem",
    "asteroid": "Sonnensystem",
    "komet": "Sonnensystem",
    "mond": "Sonnensystem",
}


def extract_episode_data():
    print("Lade RSS-Feed herunter...")
    response = requests.get(FEED_URL)
    if response.status_code != 200:
        print("Fehler beim Laden des Feeds!")
        return

    # XML parsen (wir nutzen BeautifulSoup wegen der oft unsauberen iTunes-Namespaces im XML)
    soup = BeautifulSoup(response.content, features="xml")
    items = soup.find_all("item")

    episodes = []
    all_valid_ids = set()

    print(f"Verarbeite {len(items)} gefundene Einträge...")

    for item in items:
        title_text = item.title.text if item.title else ""
        url = item.link.text if item.link else ""
        description = item.description.text if item.description else ""

        # 1. Folgen-Nummer (ID) aus dem Titel extrahieren
        # Sucht nach der ersten Zahl im Titel (z.B. "709 - Der Grabstichel...")
        id_match = re.search(r"\d+", title_text)
        if not id_match:
            continue  # Keine Nummer gefunden? Wahrscheinlich ein Trailer, überspringen.

        ep_id = int(id_match.group())
        all_valid_ids.add(ep_id)

        # Titel sauber bereinigen (Präfixe wie "Folge 709:" wegschneiden, falls vorhanden)
        clean_title = re.sub(
            r"^(Sternengeschichten\s+)?(Folge\s+)?\d+[\s:\-–]+",
            "",
            title_text,
            flags=re.IGNORECASE,
        ).strip()

        # 2. Automatische Tags generieren anhand von Schlüsselwörtern im Titel/Beschreibung
        tags = set()
        full_text_lower = (clean_title + " " + description).lower()
        for keyword, tag_name in TAG_MAPPING.items():
            if keyword in full_text_lower:
                tags.add(tag_name)

        if not tags:
            tags.add("Sonstige")

        # 3. Referenzen auf andere Folgen im Beschreibungstext finden
        # Sucht nach Mustern wie "Folge 45" oder "Folge 123"
        ref_matches = re.findall(r"Folge\s+(\d+)", description, re.IGNORECASE)
        # In Integers umwandeln
        references = list(set([int(ref) for ref in ref_matches]))

        episodes.append(
            {
                "id": ep_id,
                "title": clean_title,
                "url": url,
                "tags": list(tags),
                "raw_references": references,  # Filtern wir im nächsten Schritt
            }
        )

    # Bereinigung: Nur Referenzen behalten, deren Ziel-ID es im Podcast auch wirklich gibt
    # (Verhindert, dass Tippfehler in den Shownotes den Graphen crashen)
    for ep in episodes:
        ep["references"] = [
            ref for ref in ep["raw_references"] if ref in all_valid_ids
        ]
        del ep["raw_references"]  # Temporäres Feld löschen

    # Nach ID aufsteigend sortieren
    episodes.sort(key=lambda x: x["id"])

    # In JSON-Datei schreiben
    output_data = {"episodes": episodes}
    with open("episodes.json", "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print("Erfolgreich! 'episodes.json' wurde mit allen Daten befüllt.")


if __name__ == "__main__":
    extract_episode_data()