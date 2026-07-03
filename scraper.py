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

    # XML-Namespaces definieren, damit wir an die echten Shownotes (content:encoded) herankommen
    namespaces = {
        "content": "http://purl.org/rss/1.0/modules/content/",
        "itunes": "http://www.itunes.com/dtds/podcast-1.0.dtd"
    }

    root = ET.fromstring(response.content)
    items = root.findall(".//item")

    episodes = []
    all_valid_ids = set()

    print(f"Verarbeite {len(items)} gefundene Einträge...")

    for item in items:
        title_node = item.find("title")
        title_text = title_node.text if title_node is not None else ""

        url_node = item.find("link")
        url = url_node.text if url_node is not None else ""

        # Kurz-Beschreibung auslesen
        desc_node = item.find("description")
        description = desc_node.text if desc_node is not None else ""

        # DIE RETTUNG: Die vollen Shownotes inklusive aller Folgen-Referenzen auslesen!
        content_node = item.find("content:encoded", namespaces)
        content_text = content_node.text if content_node is not None else ""

        # Beide Texte kombinieren für die lückenlose Textsuche
        full_shownotes = description + " " + content_text

        # 1. Folgen-Nummer (ID) aus dem Titel extrahieren
        id_match = re.search(r"\d+", title_text)
        if not id_match:
            continue

        ep_id = int(id_match.group())
        all_valid_ids.add(ep_id)

        clean_title = re.sub(
            r"^(Sternengeschichten\s+)?(Folge\s+)?\d+[\s:\-–]+",
            "",
            title_text,
            flags=re.IGNORECASE,
        ).strip()

        # 2. Automatische Tags generieren mit Priorisierung
        tags = set()
        full_text_lower = (clean_title + " " + full_shownotes).lower()
        for keyword, tag_name in TAG_MAPPING.items():
            if keyword in full_text_lower:
                tags.add(tag_name)

        # HIER FIXEN WIR DAS PRIORITÄTS-PROBLEM:
        # Wenn "Galaxien" oder "Kosmologie" im Text vorkommen, ist das viel spezifischer
        # als das allgegenwärtige Wort "Sterne". Wir bereinigen die Tags:
        if "Galaxien" in tags or "Kosmologie" in tags or "Planeten" in tags:
            if "Sterne" in tags and len(tags) > 1:
                tags.remove("Sterne") # Entfernt den "Sterne"-Überschuss bei spezifischen Themen

        if not tags:
            tags.add("Sonstige")

        # 3. Referenzen aus den vollen Shownotes extrahieren
        # Sucht flexibel nach "Folge X" oder "Folgen X"
        ref_matches = re.findall(r"Folge(?:n)?\s+(\d+)", full_shownotes, re.IGNORECASE)
        references = list(set([int(ref) for ref in ref_matches]))

        episodes.append(
            {
                "id": ep_id,
                "title": clean_title,
                "url": url,
                "tags": list(tags),
                "raw_references": references,
            }
        )

    # Bereinigung der Referenzen
    for ep in episodes:
        ep["references"] = [
            ref for ref in ep["raw_references"] if ref in all_valid_ids and ref != ep["id"]
        ]
        del ep["raw_references"]

    episodes.sort(key=lambda x: x["id"])

    output_data = {"episodes": episodes}
    with open("episodes.json", "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print("Erfolgreich! 'episodes.json' wurde mit echten Referenzen aktualisiert.")