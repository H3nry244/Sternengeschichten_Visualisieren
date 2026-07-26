import json
import os
import re
import xml.etree.ElementTree as ET
import requests

# Der offizielle RSS-Feed des Podcasts (enthält alle 700+ Folgen)
FEED_URL = "https://sternengeschichten.podigee.io/feed/mp3"

# Keyword-Mapping für Haupt-Kategorien
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

# Astronomische Schlüsselbegriffe für das Themen-Netzwerk (Topic Overlap)
ASTRO_KEYWORDS = [
    "andromeda", "cepheid", "supernova", "schwarzes loch", "neutronenstern",
    "pulsar", "exoplanet", "parallax", "urknall", "dunkle materie", "dunkle energie",
    "spektroskopie", "rotverschiebung", "relativitätstheorie", "gravitationswelle",
    "weißer zwerg", "roter riese", "kugelsternhaufen", "standardkerze", "kepler",
    "hubble", "james webb", "voyager", "apollo", "rosetta", "lichtjahr"
]


def find_transcript_text(ep_id):
    """Sucht im Ordner 'transcripts' nach der passenden Transkript-Datei."""
    if not os.path.exists("transcripts"):
        return ""

    # Gezielte Namensmuster prüfen (z.B. stern20.txt, 20.txt)
    candidates = [
        f"transcripts/{ep_id}.txt",
        f"transcripts/stern{ep_id}.txt",
        f"transcripts/sternengeschichten_{ep_id}.txt"
    ]

    for filepath in candidates:
        if os.path.exists(filepath):
            try:
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    return f.read()
            except Exception as e:
                print(f"Fehler beim Lesen von {filepath}: {e}")

    # Fallback: Ordner durchsuchen, falls der Dateiname anders aufgebaut ist
    for filename in os.listdir("transcripts"):
        if filename.endswith(".txt"):
            match = re.search(r"\d+", filename)
            if match and int(match.group()) == ep_id:
                try:
                    with open(os.path.join("transcripts", filename), "r", encoding="utf-8", errors="ignore") as f:
                        return f.read()
                except Exception:
                    pass
    return ""


def extract_episode_data():
    print("Lade RSS-Feed herunter...")
    response = requests.get(FEED_URL)
    if response.status_code != 200:
        print("Fehler beim Laden des Feeds!")
        return

    namespaces = {
        "content": "http://purl.org/rss/1.0/modules/content/",
        "itunes": "http://www.itunes.com/dtds/podcast-1.0.dtd"
    }

    root = ET.fromstring(response.content)
    items = root.findall(".//item")

    episodes = []
    all_valid_ids = set()
    episode_keywords = {}
    transcripts_found_count = 0

    print(f"Verarbeite {len(items)} gefundene Einträge...")

    for item in items:
        title_node = item.find("title")
        title_text = title_node.text if title_node is not None else ""

        url_node = item.find("link")
        url = url_node.text if url_node is not None else ""

        desc_node = item.find("description")
        description = desc_node.text if desc_node is not None else ""

        content_node = item.find("content:encoded", namespaces)
        content_text = content_node.text if content_node is not None else ""

        # 1. Folgen-ID bestimmen
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

        # 2. Lokales Transkript suchen & laden
        transcript = find_transcript_text(ep_id)
        has_transcript = len(transcript) > 0
        if has_transcript:
            transcripts_found_count += 1

        # Gesamter Text für die Analyse
        full_text = f"{clean_title} {description} {content_text} {transcript}"
        full_text_lower = full_text.lower()

        # 3. Tag-Generierung mit Priorisierung
        tags = set()
        for keyword, tag_name in TAG_MAPPING.items():
            if keyword in full_text_lower:
                tags.add(tag_name)

        if "Galaxien" in tags or "Kosmologie" in tags or "Planeten" in tags:
            if "Sterne" in tags and len(tags) > 1:
                tags.remove("Sterne")

        if not tags:
            tags.add("Sonstige")

        # 4. Direkte & relative Erwähnungen extrahieren
        references = set()

        # Direkte Erwähnungen ("Folge 123", "Folgen 45 und 46")
        ref_matches = re.findall(r"Folge(?:n)?\s+(\d+)", full_text, re.IGNORECASE)
        for ref in ref_matches:
            references.add(int(ref))

        # Relative Erwähnungen
        if re.search(r"(?:letzten|vorigen|vergangenen)\s+Folge", full_text, re.IGNORECASE):
            references.add(ep_id - 1)
        if re.search(r"(?:nächsten|kommenden)\s+Folge", full_text, re.IGNORECASE):
            references.add(ep_id + 1)

        # Schlüsselwörter für Themenverwandtschaften speichern
        extracted_kw = set([kw for kw in ASTRO_KEYWORDS if kw in full_text_lower])
        episode_keywords[ep_id] = extracted_kw

        episodes.append(
            {
                "id": ep_id,
                "title": clean_title,
                "url": url,
                "tags": list(tags),
                "has_transcript": has_transcript,
                "raw_references": list(references),
            }
        )

    # 5. Referenzen bereinigen & Themenverwandtschaften berechnen
    for ep in episodes:
        ep_id = ep["id"]
        
        # Nur existierende Folgen als Erwähnungs-Referenzen behalten
        ep["references"] = [
            ref for ref in ep["raw_references"] if ref in all_valid_ids and ref != ep_id
        ]
        del ep["raw_references"]

        # Themenverwandte Folgen ermitteln (gemeinsame Fachbegriffe)
        kw_self = episode_keywords.get(ep_id, set())
        topic_refs = []

        if kw_self:
            for other_ep in episodes:
                other_id = other_ep["id"]
                if other_id == ep_id:
                    continue
                kw_other = episode_keywords.get(other_id, set())
                overlap = kw_self.intersection(kw_other)
                if len(overlap) >= 2:  # Mindestens 2 gemeinsame Kernbegriffe
                    topic_refs.append(other_id)

        ep["topic_references"] = topic_refs[:8]  # Auf Top 8 beschränken

    episodes.sort(key=lambda x: x["id"])

    # JSON-Dateien ausgeben
    output_data = {"episodes": episodes}
    with open("episodes.json", "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    # Statistiken generieren
    tag_counts = {}
    reference_counts = {}
    for ep in episodes:
        for tag in ep["tags"]:
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
        for ref in ep["references"]:
            reference_counts[ref] = reference_counts.get(ref, 0) + 1

    top_referenced = sorted(reference_counts.items(), key=lambda x: x[1], reverse=True)[:5]

    stats_data = {
        "total_episodes": len(episodes),
        "transcripts_count": transcripts_found_count,
        "tag_distribution": tag_counts,
        "most_referenced_episodes": [
            {"id": item[0], "mentions": item[1]} for item in top_referenced
        ]
    }

    with open("stats.json", "w", encoding="utf-8") as f:
        json.dump(stats_data, f, ensure_ascii=False, indent=2)

    print(f"Erfolgreich! 'episodes.json' ({len(episodes)} Folgen) und 'stats.json' erstellt.")
    print(f"Es wurden {transcripts_found_count} Transkripte eingebunden.")


if __name__ == "__main__":
    extract_episode_data()