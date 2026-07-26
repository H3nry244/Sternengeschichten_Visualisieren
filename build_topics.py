import json
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

print("Lade KI-Modell (paraphrase-multilingual)...")
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

# 1. JSON laden
with open('episodes.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

episodes = data['episodes']

# 2. Texte für Vektoren vorbereiten
texts = []
for ep in episodes:
    title = ep.get('title', '')
    desc = ep.get('description', '') or ep.get('summary', '')
    texts.append(f"{title}. {desc}".strip())

print(f"Berechne Vektoren für {len(episodes)} Episoden...")
embeddings = model.encode(texts, show_progress_bar=True)

# 3. Kosinus-Ähnlichkeiten berechnen
sim_matrix = cosine_similarity(embeddings)

print("Speichere Ähnlichkeits-Scores im JSON...")
for idx, ep in enumerate(episodes):
    scores = sim_matrix[idx]
    sorted_indices = np.argsort(scores)[::-1]
    
    topic_refs = []
    for other_idx in sorted_indices:
        if other_idx == idx:
            continue
            
        score = float(scores[other_idx])
        
        # Wir speichern alle Kandidaten mit Ähnlichkeit > 0.35 für den Live-Slider
        if score >= 0.35:
            topic_refs.append({
                "id": episodes[other_idx]['id'],
                "score": round(score, 3)
            })
            
    # Maximale Kandidaten-Anzahl pro Folge begrenzen, um JSON leicht zu halten
    ep['topic_references'] = topic_refs[:15]

# 4. JSON überschreiben
with open('episodes.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("✅ Fertig! 'episodes.json' wurde mit Vektor-Scores aktualisiert.")