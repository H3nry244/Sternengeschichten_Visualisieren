let graphData = { nodes: [], links: [] };
let rawEpisodes = [];
let allTags = new Set();
let tagColors = {};
let clusterCenters = {};
let currentFilter = 'all';
let showTopicsMode = false;
let Graph;

// Eine leuchtende, kosmische Neon-Farbpalette (RGB für dynamische Opazität)
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
        const overlay = document.getElementById('error-overlay');
        if (overlay) overlay.style.display = 'none';

        rawEpisodes = data.episodes;
        
        // Alle einzigartigen Tags extrahieren
        rawEpisodes.forEach(ep => {
            if (ep.tags) ep.tags.forEach(tag => allTags.add(tag));
        });

        // Tags sortieren, Farben und feste Koordinaten für die Galaxien-Haufen zuweisen
        const tagsArray = Array.from(allTags).sort();
        const radius = 140;

        tagsArray.forEach((tag, index) => {
            tagColors[tag] = spacePalette[index % spacePalette.length];
            
            const angle = (index / tagsArray.length) * 2 * Math.PI;
            clusterCenters[tag] = {
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                z: (index % 2 === 0 ? 30 : -30)
            };
        });
        tagColors['Sonstige'] = '255, 255, 255';
        clusterCenters['Sonstige'] = { x: 0, y: 0, z: 0 };

        // Nodes aufbauen
        rawEpisodes.forEach(ep => {
            const primaryTag = (ep.tags && ep.tags.length > 0) ? ep.tags[0] : 'Sonstige';
            
            graphData.nodes.push({
                id: ep.id,
                title: ep.title,
                url: ep.url,
                tags: ep.tags || [],
                primaryTag: primaryTag,
                val: 2.5
            });
        });

        // Initiales Erstellen der Kanten (Standard: Direkte Erwähnungen)
        graphData.links = buildLinks(rawEpisodes, false);

        populateFilter(tagsArray);
        initGraph();
        initSearchAndToggle();
    })
    .catch(error => {
        console.error("Fehler beim Initialisieren des Universums:", error);
    });

// Hilfsfunktion: Kanten dynamisch berechnen
function buildLinks(episodes, useTopics) {
    const episodeIds = new Set(episodes.map(e => e.id));
    const links = [];

    episodes.forEach(ep => {
        const targetArray = useTopics ? ep.topic_references : ep.references;
        if (targetArray) {
            targetArray.forEach(refId => {
                if (episodeIds.has(refId)) {
                    links.push({
                        source: ep.id,
                        target: refId
                    });
                }
            });
        }
    });

    return links;
}

function populateFilter(tagsArray) {
    const select = document.getElementById('category-filter');
    if (!select) return;
    
    tagsArray.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        
        Graph.nodeColor(Graph.nodeColor());
        Graph.linkColor(Graph.linkColor());
        Graph.d3ReheatSimulation();
    });
}

// Logik für Suchleiste und Toggle-Schalter
function initSearchAndToggle() {
    const modeToggle = document.getElementById('modeToggle');
    if (modeToggle) {
        modeToggle.addEventListener('change', (e) => {
            showTopicsMode = e.target.checked;
            
            // Verknüpfungen neu bauen und 3D-Graph aktualisieren
            graphData.links = buildLinks(rawEpisodes, showTopicsMode);
            Graph.graphData(graphData);
        });
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) return;

            // Suche nach ID oder Titel
            const foundNode = graphData.nodes.find(n => 
                n.id.toString() === query || n.title.toLowerCase().includes(query)
            );

            if (foundNode && foundNode.x !== undefined) {
                // Kamera sanft auf den gesuchten Stern ausrichten
                const distance = 120;
                const hyp = Math.hypot(foundNode.x, foundNode.y, foundNode.z) || 1;
                const distRatio = 1 + distance / hyp;
                
                Graph.cameraPosition(
                    { x: foundNode.x * distRatio, y: foundNode.y * distRatio, z: foundNode.z * distRatio },
                    foundNode, // Zielpunkt
                    2000       // Dauer der Flug-Animation in ms
                );
            }
        });
    }
}

function initGraph() {
    Graph = ForceGraph3D()(document.getElementById('3d-graph'))
        .graphData(graphData)
        .backgroundColor('#020208')
        .nodeResolution(24)
        
        .nodeColor(node => {
            const rgb = tagColors[node.primaryTag] || '255, 255, 255';
            if (currentFilter === 'all') return `rgba(${rgb}, 0.85)`;
            return node.primaryTag === currentFilter ? `rgba(${rgb}, 1.0)` : `rgba(${rgb}, 0.15)`;
        })
        
        .nodeLabel(node => {
            const tagsHtml = node.tags.map(t => `<span class="tooltip-tag-badge">${t}</span>`).join('');
            const rgb = tagColors[node.primaryTag] || '255, 255, 255';
            return `
                <div class="graph-tooltip" style="border-color: rgb(${rgb})">
                    <div class="tooltip-title" style="color: rgb(${rgb})">Folge ${node.id}: ${node.title}</div>
                    <div class="tooltip-tags">${tagsHtml}</div>
                </div>
            `;
        })
        
        .onNodeClick(node => {
            if (node.url) window.open(node.url, '_blank');
        })
        
        .linkWidth(link => {
            if (currentFilter === 'all') return 1.5;
            
            const sTag = typeof link.source === 'object' ? link.source.primaryTag : (graphData.nodes.find(n => n.id === link.source) || {}).primaryTag;
            const tTag = typeof link.target === 'object' ? link.target.primaryTag : (graphData.nodes.find(n => n.id === link.target) || {}).primaryTag;
            
            return (sTag === currentFilter || tTag === currentFilter) ? 2.5 : 0.5;
        })
        .linkColor(link => {
            if (currentFilter === 'all') return 'rgba(255, 255, 255, 0.5)';
            
            const sTag = typeof link.source === 'object' ? link.source.primaryTag : (graphData.nodes.find(n => n.id === link.source) || {}).primaryTag;
            const tTag = typeof link.target === 'object' ? link.target.primaryTag : (graphData.nodes.find(n => n.id === link.target) || {}).primaryTag;
            
            return (sTag === currentFilter || tTag === currentFilter) ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.04)';
        });

    // Cluster-Kraft
    const createClusterForce = () => {
        let nodes = [];
        const force = (alpha) => {
            nodes.forEach(node => {
                let targetX, targetY, targetZ;
                let forceStrength = 0.06;

                if (currentFilter === 'all') {
                    const center = clusterCenters[node.primaryTag] || { x: 0, y: 0, z: 0 };
                    targetX = center.x; targetY = center.y; targetZ = center.z;
                } else {
                    if (node.primaryTag === currentFilter) {
                        targetX = 0; targetY = 0; targetZ = 0;
                        forceStrength = 0.2;
                    } else {
                        const center = clusterCenters[node.primaryTag] || { x: 0, y: 0, z: 0 };
                        targetX = center.x * 2.5; targetY = center.y * 2.5; targetZ = center.z * 2.5;
                    }
                }

                node.vx += (targetX - node.x) * alpha * forceStrength;
                node.vy += (targetY - node.y) * alpha * forceStrength;
                node.vz += (targetZ - node.z) * alpha * forceStrength;
            });
        };
        force.initialize = (initNodes) => { nodes = initNodes; };
        return force;
    };

    Graph.d3Force('cluster', createClusterForce());
    Graph.d3Force('charge').strength(-30);
}