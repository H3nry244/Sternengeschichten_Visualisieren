let graphData = { nodes: [], links: [] };
let rawEpisodes = [];
let allTags = new Set();
let tagColors = {};
let clusterCenters = {};
let currentFilter = 'all';
let showTopicsMode = false;
let Graph;

/* ======================================================== */
/* TEST-CODE START: Globaler Test-Threshold                */
/* ======================================================== */
let currentThreshold = 0.75;
/* ======================================================== */
/* TEST-CODE END                                            */
/* ======================================================== */

// Kosmische Neon-Farbpalette
const spacePalette = [
    '255, 42, 109',  // Neon-Pink
    '5, 217, 232',   // Laser-Cyan
    '0, 254, 156',   // Aurora-Grün
    '255, 183, 3',   // Sonnen-Gelb
    '155, 93, 229',  // Kosmisches Violett
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
        
        // Alle Tags sammeln für Farb-Cluster
        rawEpisodes.forEach(ep => {
            if (ep.tags) ep.tags.forEach(tag => allTags.add(tag));
        });

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

        // Nodes mit eindeutiger interner ID erstellen
        rawEpisodes.forEach((ep, idx) => {
            const primaryTag = (ep.tags && ep.tags.length > 0) ? ep.tags[0] : 'Sonstige';
            const uniqueNodeId = `node_${idx}_ep_${ep.id}`;
            ep._graphNodeId = uniqueNodeId;

            graphData.nodes.push({
                id: uniqueNodeId,
                episodeNumber: ep.id,
                title: ep.title,
                url: ep.url,
                tags: ep.tags || [],
                primaryTag: primaryTag,
                val: 2.5
            });
        });

        // Verknüpfungen STRIKT aus dem JSON aufbauen
        graphData.links = buildDirectLinks(rawEpisodes, false);

        populateFilter(tagsArray);
        initGraph();
        initSearchAndToggle();
    })
    .catch(error => {
        console.error("Fehler beim Laden:", error);
    });

// Hilfsfunktion: JSON-Referenzen auflösen
function buildDirectLinks(episodes, useTopics) {
    const links = [];
    const linkSet = new Set();

    // Map zur schnellen Zuordnung: Episoden-Nummer (als String) -> Node-Objekte
    const epNumToNodes = {};
    graphData.nodes.forEach(node => {
        const key = String(node.episodeNumber).trim();
        if (!epNumToNodes[key]) {
            epNumToNodes[key] = [];
        }
        epNumToNodes[key].push(node);
    });

    graphData.nodes.forEach(sourceNode => {
        const ep = episodes.find(e => e._graphNodeId === sourceNode.id);
        if (!ep) return;

        const rawReferences = useTopics ? ep.topic_references : ep.references;
        const targetList = Array.isArray(rawReferences) ? rawReferences : [];

        targetList.forEach(item => {
            /* ======================================================== */
            /* TEST-LOGIK: Kompatibel mit ID-Strings UND Score-Objekten */
            /* ======================================================== */
            const isObject = typeof item === 'object' && item !== null;
            const refNum = isObject ? item.id : item;
            const score = isObject ? (item.score ?? 1.0) : 1.0;

            // Verknüpfe nur, wenn im normalen Modus ODER wenn der Score den Test-Threshold erreicht
            if (!useTopics || score >= currentThreshold) {
                const refKey = String(refNum).trim();
                const targetNodes = epNumToNodes[refKey];

                if (targetNodes && targetNodes.length > 0) {
                    targetNodes.forEach(targetNode => {
                        if (sourceNode.id !== targetNode.id) {
                            const linkKey = [sourceNode.id, targetNode.id].sort().join('---');
                            if (!linkSet.has(linkKey)) {
                                linkSet.add(linkKey);
                                links.push({
                                    source: sourceNode.id,
                                    target: targetNode.id
                                });
                            }
                        }
                    });
                }
            }
        });
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

function initSearchAndToggle() {
    const modeToggle = document.getElementById('modeToggle');
    const toggleLabel = document.getElementById('toggleLabel');

    /* ======================================================== */
    /* TEST-CODE START: Slider DOM Elemente                     */
    /* ======================================================== */
    const thresholdControl = document.getElementById('thresholdControl');
    const thresholdSlider = document.getElementById('thresholdSlider');
    const thresholdVal = document.getElementById('thresholdVal');
    /* ======================================================== */
    /* TEST-CODE END                                            */
    /* ======================================================== */

    if (modeToggle) {
        modeToggle.addEventListener('change', (e) => {
            showTopicsMode = e.target.checked;
            
            if (toggleLabel) {
                toggleLabel.textContent = showTopicsMode ? "Themen-Referenzen (topic_references)" : "Direkte Referenzen (references)";
                toggleLabel.style.color = showTopicsMode ? "#00fe9c" : "#ffffff";
            }

            /* ======================================================== */
            /* TEST-CODE START: Ein-/Ausblenden der Test-Steuerung      */
            /* ======================================================== */
            if (thresholdControl) {
                thresholdControl.style.display = showTopicsMode ? "block" : "none";
            }
            /* ======================================================== */
            /* TEST-CODE END                                            */
            /* ======================================================== */

            // Neu berechnen und Graph aktualisieren
            graphData.links = buildDirectLinks(rawEpisodes, showTopicsMode);
            Graph.graphData({
                nodes: graphData.nodes,
                links: graphData.links
            });
            Graph.d3ReheatSimulation();
        });
    }

    /* ======================================================== */
    /* TEST-CODE START: Event Listener für Live-Threshold      */
    /* ======================================================== */
    if (thresholdSlider) {
        thresholdSlider.addEventListener('input', (e) => {
            currentThreshold = parseFloat(e.target.value);
            if (thresholdVal) thresholdVal.textContent = currentThreshold.toFixed(2);

            graphData.links = buildDirectLinks(rawEpisodes, true);
            Graph.graphData({
                nodes: graphData.nodes,
                links: graphData.links
            });
            Graph.d3ReheatSimulation();
        });
    }
    /* ======================================================== */
    /* TEST-CODE END                                            */
    /* ======================================================== */

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
                searchInput.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                return;
            }

            const cleanQuery = query.replace(/^(folge|episode|s0-|\s)*/gi, '').trim();

            const foundNode = graphData.nodes.find(n => 
                String(n.episodeNumber).trim() === cleanQuery || 
                n.title.toLowerCase().includes(query)
            );

            if (foundNode && foundNode.x !== undefined) {
                searchInput.style.borderColor = '#00fe9c';

                const distance = 100;
                const hyp = Math.hypot(foundNode.x, foundNode.y, foundNode.z) || 1;
                const distRatio = 1 + distance / hyp;
                
                Graph.cameraPosition(
                    { x: foundNode.x * distRatio, y: foundNode.y * distRatio, z: foundNode.z * distRatio },
                    { x: foundNode.x, y: foundNode.y, z: foundNode.z },
                    1800
                );
            } else {
                searchInput.style.borderColor = '#ff2a6d';
            }
        });
    }
}

function initGraph() {
    Graph = ForceGraph3D()(document.getElementById('3d-graph'))
        .graphData({ nodes: graphData.nodes, links: graphData.links })
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
                    <div class="tooltip-title" style="color: rgb(${rgb})">Folge ${node.episodeNumber}: ${node.title}</div>
                    <div class="tooltip-tags">${tagsHtml}</div>
                </div>
            `;
        })
        .onNodeClick(node => {
            if (node.url) window.open(node.url, '_blank');
        })
        .linkWidth(1.5)
        .linkColor(() => 'rgba(255, 255, 255, 0.4)');

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

    const homeBtn = document.getElementById('homeBtn');
    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
            // Zoomt sanft über 1.2 Sekunden so, dass alle Nodes sichtbar sind
            Graph.zoomToFit(1200, 80);
        });
    }

    Graph.d3Force('cluster', createClusterForce());
    Graph.d3Force('charge').strength(-30);
}