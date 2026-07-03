let graphData = { nodes: [], links: [] };
let allTags = new Set();
let tagColors = {};
let clusterCenters = {};
let currentFilter = 'all';
let Graph;

// Eine leuchtende, kosmische Neon-Farbpalette (gespeichert als RGB für dynamische Opazität)
const spacePalette = [
    '255, 42, 109',  // Neon-Pink (z.B. Galaxien)
    '5, 217, 232',   // Laser-Cyan (z.B. Planeten)
    '0, 254, 156',   // Aurora-Grün (z.B. Sterne)
    '255, 183, 3',   // Sonnen-Gelb
    '155, 93, 229',  // Kosmisches Violett (z.B. Kosmologie)
    '255, 87, 34',   // Mars-Orange
    '224, 102, 255', // Nebel-Orchidee
    '58, 134, 255'   // Hyperraum-Blau
];

// 1. Daten laden
fetch('episodes.json')
    .then(response => {
        if (!response.ok) throw new Error("JSON-Datei konnte nicht geladen werden.");
        return response.json();
    })
    .then(data => {
        // Eventuelles Fehler-Overlay ausblenden
        const overlay = document.getElementById('error-overlay');
        if (overlay) overlay.style.display = 'none';
        
        // Alle einzigartigen Tags extrahieren
        data.episodes.forEach(ep => {
            if (ep.tags) ep.tags.forEach(tag => allTags.add(tag));
        });

        // Tags sortieren, Farben und feste Koordinaten für die Galaxien-Haufen zuweisen
        const tagsArray = Array.from(allTags).sort();
        const radius = 140; // Abstand der Haufen vom Zentrum

        tagsArray.forEach((tag, index) => {
            tagColors[tag] = spacePalette[index % spacePalette.length];
            
            // Verteile die Cluster-Zentren kreisförmig im Raum
            const angle = (index / tagsArray.length) * 2 * Math.PI;
            clusterCenters[tag] = {
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                z: (index % 2 === 0 ? 30 : -30)
            };
        });
        tagColors['Sonstige'] = '255, 255, 255';
        clusterCenters['Sonstige'] = { x: 0, y: 0, z: 0 };

        // Set für schnellen Existenz-Check der verlinkten IDs
        const episodeIds = new Set(data.episodes.map(e => e.id));

        // Nodes & Links befüllen
        data.episodes.forEach(ep => {
            const primaryTag = (ep.tags && ep.tags.length > 0) ? ep.tags[0] : 'Sonstige';
            
            graphData.nodes.push({
                id: ep.id,
                title: ep.title,
                url: ep.url,
                tags: ep.tags || [],
                primaryTag: primaryTag,
                val: 2.5 // Größe der Sterne
            });

            if (ep.references) {
                ep.references.forEach(refId => {
                    // Nur verlinken, wenn die Ziel-Episode auch im Datensatz existiert
                    if (episodeIds.has(refId)) {
                        graphData.links.push({
                            source: ep.id,
                            target: refId
                        });
                    }
                });
            }
        });

        populateFilter(tagsArray);
        initGraph();
    })
    .catch(error => {
        console.error("Fehler beim Initialisieren des Universums:", error);
    });

function populateFilter(tagsArray) {
    const select = document.getElementById('category-filter');
    
    tagsArray.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        
        // Aktualisiert die Knotengestaltung und Linien farblich (inkl. Deckkraft)
        Graph.nodeColor(Graph.nodeColor());
        Graph.linkColor(Graph.linkColor());
        
        // Schiebt die Physik-Engine an, damit die Sterne fließend ihre Positionen wechseln
        Graph.d3ReheatSimulation();
    });
}

function initGraph() {
    Graph = ForceGraph3D()(document.getElementById('3d-graph'))
        .graphData(graphData)
        .backgroundColor('#020208')
        .nodeResolution(24)
        
        // Dynamische Farbe & Opazität über RGBA geregelt (Kein Absturz durch .nodeOpacity!)
        .nodeColor(node => {
            const rgb = tagColors[node.primaryTag];
            if (currentFilter === 'all') return `rgba(${rgb}, 0.85)`;
            // Wenn fokussiert -> voll leuchtend, andere Gruppen -> stark abgeblendet (0.15)
            return node.primaryTag === currentFilter ? `rgba(${rgb}, 1.0)` : `rgba(${rgb}, 0.15)`;
        })
        
        // Schicker info-Tooltip beim Hovern
        .nodeLabel(node => {
            const tagsHtml = node.tags.map(t => `<span class="tooltip-tag-badge">${t}</span>`).join('');
            const rgb = tagColors[node.primaryTag];
            return `
                <div class="graph-tooltip" style="border-color: rgb(${rgb})">
                    <div class="tooltip-title" style="color: rgb(${rgb})">Folge ${node.id}: ${node.title}</div>
                    <div class="tooltip-tags">${tagsHtml}</div>
                </div>
            `;
        })
        
        // Klick öffnet den Link im neuen Tab
        .onNodeClick(node => {
            if (node.url) window.open(node.url, '_blank');
        })
        
        // Verbindungslinien (Links) deutlich sichtbarer stylen
        .linkWidth(link => {
            if (currentFilter === 'all') return 1.5; // Viel dickere Linien im Normalzustand (vorher 0.7)
            
            const sTag = typeof link.source === 'object' ? link.source.primaryTag : (graphData.nodes.find(n => n.id === link.source) || {}).primaryTag;
            const tTag = typeof link.target === 'object' ? link.target.primaryTag : (graphData.nodes.find(n => n.id === link.target) || {}).primaryTag;
            
            // Wenn gefiltert: Fokus-Verbindungen werden extra fett (2.5), der Rest wird dünner (0.5)
            return (sTag === currentFilter || tTag === currentFilter) ? 2.5 : 0.5;
        })
        .linkColor(link => {
            if (currentFilter === 'all') return 'rgba(255, 255, 255, 0.5)'; // Höhere Deckkraft im Normalzustand (vorher 0.15)
            
            const sTag = typeof link.source === 'object' ? link.source.primaryTag : (graphData.nodes.find(n => n.id === link.source) || {}).primaryTag;
            const tTag = typeof link.target === 'object' ? link.target.primaryTag : (graphData.nodes.find(n => n.id === link.target) || {}).primaryTag;
            
            // Linien der ausgewählten Fokusgruppe leuchten extrem stark (0.9), der Rest verblasst im Hintergrund
            return (sTag === currentFilter || tTag === currentFilter) ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.04)';
        });

    // --- DIE ABSTURZSICHERE CLUSTER-KRAFT ---
    const createClusterForce = () => {
        let nodes = [];
        const force = (alpha) => {
            nodes.forEach(node => {
                let targetX, targetY, targetZ;
                let forceStrength = 0.06;

                if (currentFilter === 'all') {
                    // Normalzustand: Jede Gruppe bildet im Orbit ihren eigenen Haufen
                    const center = clusterCenters[node.primaryTag] || { x: 0, y: 0, z: 0 };
                    targetX = center.x; targetY = center.y; targetZ = center.z;
                } else {
                    // Filter aktiv: Fokusgruppe fliegt ins Zentrum, der Rest weicht nach außen aus
                    if (node.primaryTag === currentFilter) {
                        targetX = 0; targetY = 0; targetZ = 0;
                        forceStrength = 0.2; // Schnellerer Einflug
                    } else {
                        const center = clusterCenters[node.primaryTag] || { x: 0, y: 0, z: 0 };
                        targetX = center.x * 2.5; targetY = center.y * 2.5; targetZ = center.z * 2.5;
                    }
                }

                // Geschwindigkeitsvektoren der Physik-Engine updaten
                node.vx += (targetX - node.x) * alpha * forceStrength;
                node.vy += (targetY - node.y) * alpha * forceStrength;
                node.vz += (targetZ - node.z) * alpha * forceStrength;
            });
        };
        force.initialize = (initNodes) => { nodes = initNodes; };
        return force;
    };

    // Kraft sicher an die Engine übergeben
    Graph.d3Force('cluster', createClusterForce());
    
    // Standard-Kräfte justieren, damit die Sterne nicht kollidieren
    Graph.d3Force('charge').strength(-30);
}