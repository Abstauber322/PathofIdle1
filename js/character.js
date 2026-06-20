// ============================================
// CHARACTER.JS - Charaktererstellung, Stats,
// Leveling, Passiv-Baum, Charakter-Anzeige
// ============================================

// ========== CHARACTER SELECTION ==========
const CLASS_GEM_CHOICES = {
  Marauder: ['Cleave', 'Cyclone', 'Arc'],
  Witch:    ['Fireball', 'IceSpear', 'SummonSkeletons'],
  Ranger:   ['LightningArrow', 'PoisonStrike', 'IceSpear'],
  Shadow:   ['PoisonStrike', 'IceSpear', 'Arc'],
  Templar:  ['Arc', 'Fireball', 'Cleave'],
  Duelist:  ['Cleave', 'Cyclone', 'LightningArrow'],
  Scion:    ['IceSpear', 'Cleave', 'Fireball']
};
let selectedGem = null;

function renderGemChoices() {
  const grid = el('gem-choice-grid');
  if (!grid) return;
  const choices = CLASS_GEM_CHOICES[selectedClass] || [CLASSES[selectedClass]?.gem].filter(Boolean);
  if (!selectedGem || !choices.includes(selectedGem)) selectedGem = choices[0];
  grid.innerHTML = '';
  choices.forEach(name => {
    const gd = SKILL_GEMS[name]; if (!gd) return;
    const card = document.createElement('div');
    card.className = 'item-card';
    card.style.cursor = 'pointer';
    card.style.borderColor = name === selectedGem ? 'var(--gold)' : '#444';
    card.innerHTML = `
      <h3 style="font-size:14px;">${gd.icon || '💎'} ${name}</h3>
      <p style="font-size:11px;color:#aaa;margin:4px 0;">${(gd.tags||[]).join(', ')}</p>
      <p style="font-size:11px;">💙 ${gd.mana||0} Mana · ⚔️ ${gd.damage||0} Schaden</p>
      <p style="font-size:11px;color:#aaa;margin-top:6px;">${gd.description||''}</p>`;
    card.onclick = () => { selectedGem = name; renderGemChoices(); };
    grid.appendChild(card);
  });
}

function renderClassSelection() {
  const container = el('class-grid');
  container.innerHTML = '';

  Object.entries(CLASSES).forEach(([key, cls]) => {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.id = `class-card-${key}`;
    card.style.cursor = 'pointer';
    card.style.borderColor = key === selectedClass ? 'var(--gold)' : '#444';

    card.innerHTML = `
      <h3>${cls.icon} ${cls.name}</h3>
      <div style="margin:8px 0;">
        <p><strong>Attribute:</strong></p>
        <p>💪 Stärke: ${cls.attr.str}</p>
        <p>🏹 Geschick: ${cls.attr.dex}</p>
        <p>🧠 Intelligenz: ${cls.attr.int}</p>
      </div>
      <div style="margin:8px 0;">
        <p><strong>Ascendancy:</strong> ${cls.ascend.join(', ')}</p>
      </div>
      <p style="font-size:12px;color:#aaa;margin-top:8px;">${cls.description}</p>
    `;

    card.onclick = () => {
      selectedClass = key;
      selectedGem = null;
      document.querySelectorAll('#class-grid .item-card').forEach(c => c.style.borderColor = '#444');
      card.style.borderColor = 'var(--gold)';
      renderGemChoices();
    };

    card.onmouseenter = () => {
      showTooltip(card, `
        <h4>${cls.icon} ${cls.name}</h4>
        <p><strong>Attribute:</strong></p>
        <p>💪 Stärke: ${cls.attr.str}</p>
        <p>🏹 Geschick: ${cls.attr.dex}</p>
        <p>🧠 Intelligenz: ${cls.attr.int}</p>
        <p style="margin-top:8px;">${cls.description}</p>
      `, 'item');
    };

    card.onmouseleave = () => hideTooltip('item');

    container.appendChild(card);
  });
  renderGemChoices();
}

function createCharacter() {
  if (!selectedClass || !CLASSES[selectedClass]) {
    alert("Bitte wähle zuerst eine Klasse aus!");
    return;
  }

  const name = el('charNameInput').value.trim() || `Exile_${Date.now().toString(36).slice(-4)}`;

  state = createBlankState(selectedClass, name);
  saveGame();

  // Show nav bar
  const navBar = el('nav-bar');
  if (navBar) { navBar.classList.remove('hidden'); navBar.style.display = 'flex'; }

  // Hide class selection, show character
  el('section-char-select').classList.add('hidden');
  showSection('char');

  // Initialize game
  renderCharacter();
  renderInventory();
  renderTree();
  renderSkills();
  renderSkillBar();
  renderFlasks();
  renderMap();

  addToLog(`Willkommen, ${name} (${selectedClass})!`, 'system');

  // Auto-enter first zone of Act 1 with a cinematic delay
  setTimeout(() => {
    if (!state) return;
    const firstZone = ZONES.find(z => z.act === 1);
    if (firstZone) {
      state.currentZone = firstZone.name;
      state.inTown = false;
      // Show the map section with a zone-entry animation
      showSection('map');
      // Brief banner before waves start
      const field = document.getElementById('enemy-field');
      if (field) {
        field.innerHTML = '';
        const intro = document.createElement('div');
        // Ensure zone-complete animations are available
        if (typeof ensureZoneCompleteStyles === 'function') ensureZoneCompleteStyles();
        else if (!document.getElementById('zone-complete-styles')) {
          const s=document.createElement('style'); s.id='zone-complete-styles';
          s.textContent='@keyframes overlayFadeIn{from{opacity:0;}to{opacity:1;}} @keyframes zoneCompleteGlow{0%,100%{text-shadow:0 0 20px #c8a84b,0 0 40px #c8a84b88;}50%{text-shadow:0 0 40px #ffd700,0 0 80px #ffd70088;}}';
          document.head.appendChild(s);
        }
        intro.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);z-index:10;animation:overlayFadeIn 0.5s ease-out;border-radius:8px;';
        const actInfo = ACT_INFO[1] || {icon:'⚔️', name:'Akt 1', color:'#c8a84b'};
        intro.innerHTML = `
          <div style="font-size:48px;margin-bottom:12px;animation:zoneCompleteGlow 2s ease-in-out infinite;">${actInfo.icon}</div>
          <div style="color:#888;font-size:11px;letter-spacing:4px;text-transform:uppercase;margin-bottom:6px;">DEIN ABENTEUER BEGINNT</div>
          <div style="color:#e8d48b;font-size:22px;font-family:'Palatino Linotype',serif;letter-spacing:2px;">${actInfo.name}</div>
          <div style="color:#aaa;font-size:13px;margin-top:8px;">${firstZone.name}</div>
        `;
        field.style.position = 'relative';
        field.appendChild(intro);
        setTimeout(() => { intro.remove(); startWaves(1); }, 2000);
      } else {
        startWaves(1);
      }
      addToLog(`🚪 Betritt ${firstZone.icon || ''} ${firstZone.name} – Viel Erfolg, Exile!`, 'system');
      if (typeof updateNavCombatState === 'function') updateNavCombatState();
      saveGame();
    }
  }, 400);
}


// ========== GAME STATE MANAGEMENT ==========
function createBlankState(cls, name) {
  const classData = CLASSES[cls];
  const attrs = {...classData.attr};

  // Create starter equipment
  const equipment = {};
  EQUIPMENT_SLOTS.forEach(slot => {
    if (slot.id === 'weapon') {
      equipment[slot.id] = createItem({
        base: "Rustic Sword",
        rarity: 'Normal',
        level: 1,
        slot: slot.slot
      });
    } else if (slot.id === 'chest') {
      const chest = createItem({
        base: "Leather Vest",
        rarity: 'Normal',
        level: 1,
        slot: slot.slot
      });
      chest.sockets = createSockets(3, attrs);
      chest.links = createLinks(chest.sockets.length);
      equipment[slot.id] = chest;
    } else {
      equipment[slot.id] = null;
    }
  });

  // Create starter gems
  const startGemName = (typeof selectedGem === 'string' && SKILL_GEMS[selectedGem]) ? selectedGem : classData.gem;
  const mainGem = createGem(startGemName, 'active');
  const supportName = getBestSupportGem(startGemName);
  const supportGem = createGem(supportName, 'support');

  // Socket gems into chest
  if (equipment.chest && equipment.chest.sockets && equipment.chest.sockets.length >= 2) {
    equipment.chest.sockets[0].gem = mainGem;
    equipment.chest.sockets[1].gem = supportGem;
  }

  // Initialize boss splinters
  const bossSplinters = {};
  Object.keys(BOSSES).forEach(boss => {
    bossSplinters[BOSSES[boss].splinter] = 0;
  });

  // Initialize quests
  const quests = QUESTS.map(q => ({...q}));

  return {
    version: 3,
    name: name,
    className: cls,
    classIcon: classData.icon,
    level: 1,
    xp: 0,
    xpThresholds: generateXPThresholds(),
    gold: 100,
    act: 1,
    unlockedAct: 1,
    attrs: attrs,
    stats: calculateBaseStats(attrs, 1),
    passivePoints: 1,
    allocatedPassives: [classData.startNode],
    equipment: equipment,
    inventory: [
      createCurrency('Scroll of Wisdom', 10),
      createCurrency('Portal Scroll', 5),
      createCurrency('Transmutation Orb', 3),
      createCurrency('Augmentation Orb', 2),
      createCurrency('Alchemy Orb', 1)
    ],
    stash: [],
    activeSkills: [],
    maps: [],
    bossSplinters: bossSplinters,
    completedBosses: [],
    currentZone: ZONES[0].name,
    inTown: true,
    portalOpen: false,
    completedZones: [],
    kills: 0,
    deaths: 0,
    autoMode: false,
    idleMode: false,
    currentMap: null,
    quests: quests,
    currentMana: calculateBaseStats(attrs, 1).maxMana,
    flasks: {
      life: { charges: 3, maxCharges: 3, chargePerKill: 1, recoverPct: 0.40, duration: 4000 },
      mana: { charges: 3, maxCharges: 3, chargePerKill: 1, recoverPct: 0.35, duration: 4000 }
    },
    lastSave: new Date().toISOString()
  };
}

function generateXPThresholds() {
  const thresholds = [0];
  for (let i = 1; i <= MAX_LEVEL; i++) {
    thresholds.push(Math.floor(100 * Math.pow(1.8, i - 1)));
  }
  return thresholds;
}

function calculateBaseStats(attrs, level) {
  return {
    maxLife: Math.floor(100 + level * 12 + attrs.str * 2.2),
    life: Math.floor(100 + level * 12 + attrs.str * 2.2),
    maxMana: Math.floor(45 + level * 5 + attrs.int * 1.6),
    mana: Math.floor(45 + level * 5 + attrs.int * 1.6),
    maxES: Math.floor(attrs.int * 0.8),
    es: Math.floor(attrs.int * 0.8),
    armour: Math.floor(attrs.str * 2),
    evasion: Math.floor(attrs.dex * 2),
    allDamage: 0,
    fireDamage: 0,
    coldDamage: 0,
    lightningDamage: 0,
    chaosDamage: 0,
    physicalDamage: 0,
    attackSpeed: 0,
    castSpeed: 0,
    critChance: 5,
    critMulti: 1.5,
    lifeRegen: 0,
    manaRegen: 0,
    lifePct: 0,
    manaPct: 0,
    fireRes: 0,
    coldRes: 0,
    lightningRes: 0,
    chaosRes: 0,
    moveSpeed: 0,
    itemRarity: 0,
    itemQuantity: 0
  };
}


// ========== POE-STYLE RADIAL PASSIVE TREE ==========
let treeViewport = {x: 0, y: 0, scale: 1};
let treeDragging = false;
let treeDragStart = {x: 0, y: 0};
let treeNodePositions = {}; // id -> {cx, cy}
let treeLayoutCache = null; // {key, positions} - cached so collision relaxation doesn't re-run every pan/zoom frame

// Node circle radius used both for drawing and for collision spacing - must match the
// sizes used in the node-drawing loop further down in renderTree().
function treeNodeRadius(node) {
  if (node.type === 'start') return 22;
  if (node.type === 'keystone') return 18;
  if (node.type === 'notable') return 13;
  return 8;
}

// Computes node positions for the given container size, then runs an iterative
// relaxation pass that pushes any overlapping nodes apart until every pair of
// nodes has at least MIN_GAP pixels of empty space between their circles.
// Results are cached per container size since this is somewhat expensive and
// renderTree() can be called many times per second while panning/zooming.
function computeTreeLayout(W, H) {
  const key = `${W}x${H}`;
  if (treeLayoutCache && treeLayoutCache.key === key) return treeLayoutCache.positions;

  const CLASS_ANGLES = {
    Marauder:  210, // bottom-left (strength)
    Witch:     270, // bottom (int)
    Ranger:    330, // bottom-right (dex)
    Shadow:    30,  // right hybrid
    Templar:   90,  // top-right
    Duelist:   150, // top-left
    Scion:     0    // center right
  };

  // How wide (in degrees, +/- from the class's base angle) each class's
  // branches are allowed to fan out. Pure attribute classes get more room;
  // hybrid classes sit closer to their neighbours so they stay narrower.
  const CLASS_HALF_SPREAD = {
    Marauder: 42, Witch: 42, Ranger: 42,
    Templar: 38, Duelist: 38, Shadow: 28,
    Scion: 0
  };

  const CX = W / 2, CY = H / 2;
  const BASE_R = Math.min(W, H) * 0.34;
  const DEG = Math.PI / 180;

  // Ring -> radius lookup. ring 0 = start nodes, ring 5 = deepest keystones.
  const RING_R = [0, 0.30, 0.46, 0.64, 0.82, 1.02].map(f => f * BASE_R);
  const START_R = BASE_R * 0.22;
  const ringRadius = (ring) => RING_R[Math.min(ring, RING_R.length - 1)] || 0;

  // Initial (idealized) placement - nodes can still overlap at this stage,
  // especially where a hybrid class's spread crosses a neighbour's, or where
  // the central hub ring shares a radius with a class's inner ring.
  const positions = {};
  Object.entries(PASSIVE_TREE).forEach(([id, node]) => {
    const cls = node.class;

    if (node.type === 'start') {
      const angleDeg = CLASS_ANGLES[cls] !== undefined ? CLASS_ANGLES[cls] : 0;
      const isScion = cls === 'Scion';
      const r = isScion ? 0 : START_R;
      const ax = angleDeg * DEG;
      positions[id] = { cx: CX + r * Math.cos(ax), cy: CY + r * Math.sin(ax) };
      return;
    }

    const r = ringRadius(node.ring || 1);

    if (cls === 'all') {
      // Hub nodes scatter around the full circle; node.t is a 0..1 angle fraction.
      const a = (node.t || 0) * 2 * Math.PI;
      positions[id] = { cx: CX + r * Math.cos(a), cy: CY + r * Math.sin(a) };
    } else {
      // Class-sector nodes; node.t is -1..1 across the class's angular spread.
      const baseAngle = (CLASS_ANGLES[cls] !== undefined ? CLASS_ANGLES[cls] : 0) * DEG;
      const halfSpread = (CLASS_HALF_SPREAD[cls] !== undefined ? CLASS_HALF_SPREAD[cls] : 38) * DEG;
      const a = baseAngle + (node.t || 0) * halfSpread;
      positions[id] = { cx: CX + r * Math.cos(a), cy: CY + r * Math.sin(a) };
    }
  });

  // --- Collision relaxation pass -----------------------------------------
  // Every node (including start nodes) is free to move during relaxation -
  // start nodes begin close together relative to their size, so they need
  // to be able to spread out too. Repeatedly push apart any pair of nodes
  // whose circles - plus a 20px buffer - overlap, until nothing overlaps.
  const MIN_GAP = 20;
  const ids = Object.keys(positions);
  const radii = {};
  ids.forEach(id => { radii[id] = treeNodeRadius(PASSIVE_TREE[id]); });

  const MAX_ITER = 600;
  const DAMPING = 0.55; // resolve overlaps gradually so the layout settles instead of jittering
  for (let iter = 0; iter < MAX_ITER; iter++) {
    let anyOverlap = false;
    for (let i = 0; i < ids.length; i++) {
      const a = ids[i];
      const pa = positions[a];
      for (let j = i + 1; j < ids.length; j++) {
        const b = ids[j];
        const pb = positions[b];
        const minDist = radii[a] + radii[b] + MIN_GAP;
        let dx = pb.cx - pa.cx, dy = pb.cy - pa.cy;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          anyOverlap = true;
          if (dist < 0.01) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; dist = 0.01; }
          const ux = dx / dist, uy = dy / dist;
          const push = (minDist - dist) * DAMPING;
          pa.cx -= ux * push / 2; pa.cy -= uy * push / 2;
          pb.cx += ux * push / 2; pb.cy += uy * push / 2;
        }
      }
    }
    if (!anyOverlap) break;
  }

  treeLayoutCache = { key, positions };
  return positions;
}

function renderTree() {
  if (!state) return;

  const svg = document.getElementById('tree-svg-canvas');
  const container = document.getElementById('tree-container');
  if (!svg || !container) return;

  const W = container.clientWidth || 900;
  const H = container.clientHeight || 620;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);

  const filter = document.getElementById('tree-filter').value;
  const pointsEl = document.getElementById('tree-points');
  if (pointsEl) pointsEl.textContent = `(${state.passivePoints} Punkte verfügbar)`;

  // Class wheel angles - kept here too since the class-label overlay below needs them.
  const CLASS_ANGLES = {
    Marauder:  210, Witch: 270, Ranger: 330,
    Shadow:    30,  Templar: 90, Duelist: 150,
    Scion:     0
  };
  const CX = W / 2, CY = H / 2;
  const BASE_R = Math.min(W, H) * 0.34;
  const DEG = Math.PI / 180;
  const RING_R = [0, 0.30, 0.46, 0.64, 0.82, 1.02].map(f => f * BASE_R);
  const INNER_R = RING_R[1];
  const MID_R = RING_R[3];
  const OUTER_R = RING_R[5];

  // Map each node to a position (cached + collision-resolved so nodes never touch)
  treeNodePositions = computeTreeLayout(W, H);

  // Apply viewport transform
  const vx = treeViewport.x, vy = treeViewport.y, vs = treeViewport.scale;

  // Determine what to show
  const activeFilter = filter;
  function nodeVisible(id, node) {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'notable' && node.type === 'notable') return true;
    if (activeFilter === 'keystone' && node.type === 'keystone') return true;
    if (activeFilter === node.class) return true;
    if (node.class === 'all') return true;
    return false;
  }

  // Build SVG content
  let svgContent = `<g transform="translate(${vx},${vy}) scale(${vs})">`;

  // Draw orbit rings (decorative)
  RING_R.slice(1).forEach((rr, i) => {
    svgContent += `<circle cx="${CX}" cy="${CY}" r="${rr}" fill="none" stroke="#1e2030" stroke-width="1" stroke-dasharray="4,${8 + i * 2}"/>`;
  });

  // Draw class sector lines
  Object.values(CLASS_ANGLES).forEach(angleDeg => {
    const a = angleDeg * DEG;
    svgContent += `<line x1="${CX}" y1="${CY}" x2="${CX + OUTER_R * Math.cos(a)}" y2="${CY + OUTER_R * Math.sin(a)}" stroke="#1e2535" stroke-width="1"/>`;
  });

  // Draw connections
  PASSIVE_TREE_CONNECTIONS.forEach(conn => {
    const from = treeNodePositions[conn.from];
    const to = treeNodePositions[conn.to];
    if (!from || !to) return;
    const fromNode = PASSIVE_TREE[conn.from];
    const toNode = PASSIVE_TREE[conn.to];
    if (!fromNode || !toNode) return;
    if (!nodeVisible(conn.from, fromNode) && !nodeVisible(conn.to, toNode)) return;

    const allocated = state.allocatedPassives.includes(conn.from) && state.allocatedPassives.includes(conn.to);
    const partAllocated = state.allocatedPassives.includes(conn.from) || state.allocatedPassives.includes(conn.to);
    const color = allocated ? '#c8a951' : partAllocated ? '#6e5c30' : '#2a3045';
    const width = allocated ? 3 : 2;
    svgContent += `<line x1="${from.cx}" y1="${from.cy}" x2="${to.cx}" y2="${to.cy}" stroke="${color}" stroke-width="${width}" stroke-opacity="0.85"/>`;
  });

  // Draw nodes
  Object.entries(PASSIVE_TREE).forEach(([id, node]) => {
    if (!nodeVisible(id, node)) return;
    const pos = treeNodePositions[id];
    if (!pos) return;

    const allocated = state.allocatedPassives.includes(id);
    const canAlloc = canAllocatePassive(id);

    let r, fillColor, strokeColor, strokeWidth, glowColor;

    if (node.type === 'start') {
      r = 22;
      fillColor = allocated ? '#3a2800' : '#1a1a2a';
      strokeColor = '#c8a951';
      strokeWidth = 3;
      glowColor = '#c8a951';
    } else if (node.type === 'keystone') {
      r = 18;
      fillColor = allocated ? '#2a1540' : '#1a1020';
      strokeColor = allocated ? '#ff8800' : '#6a3080';
      strokeWidth = allocated ? 3 : 2;
      glowColor = '#ff8800';
    } else if (node.type === 'notable') {
      r = 13;
      fillColor = allocated ? '#1e2800' : '#141828';
      strokeColor = allocated ? '#8bc34a' : '#4a5868';
      strokeWidth = allocated ? 2.5 : 2;
      glowColor = '#8bc34a';
    } else {
      r = 8;
      fillColor = allocated ? '#1a2a1a' : '#111820';
      strokeColor = allocated ? '#4a8a4a' : '#3a4050';
      strokeWidth = allocated ? 2 : 1.5;
      glowColor = '#4a8a4a';
    }

    // Glow effect if allocated
    if (allocated) {
      svgContent += `<circle cx="${pos.cx}" cy="${pos.cy}" r="${r+6}" fill="${glowColor}" opacity="0.12"/>`;
      svgContent += `<circle cx="${pos.cx}" cy="${pos.cy}" r="${r+3}" fill="${glowColor}" opacity="0.18"/>`;
    } else if (canAlloc) {
      svgContent += `<circle cx="${pos.cx}" cy="${pos.cy}" r="${r+4}" fill="#c8a951" opacity="0.08"/>`;
    }

    // Node background
    svgContent += `<circle cx="${pos.cx}" cy="${pos.cy}" r="${r}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" data-node="${id}" style="cursor:${canAlloc || allocated ? 'pointer' : 'default'}"/>`;

    // Inner decorative circle for larger nodes
    if (node.type !== 'normal') {
      const innerR = r * 0.55;
      const innerColor = node.type === 'keystone' ? (allocated ? '#ff880044' : '#33113344') :
                         node.type === 'notable' ? (allocated ? '#8bc34a44' : '#2a3a2a44') : '#33333344';
      svgContent += `<circle cx="${pos.cx}" cy="${pos.cy}" r="${innerR}" fill="${innerColor}" pointer-events="none"/>`;
    }

    // Start node class icon - render as text emoji
    if (node.type === 'start') {
      svgContent += `<text x="${pos.cx}" y="${pos.cy + 1}" text-anchor="middle" dominant-baseline="middle" font-size="14" pointer-events="none">${node.icon}</text>`;
    } else if (node.type === 'keystone') {
      svgContent += `<text x="${pos.cx}" y="${pos.cy + 1}" text-anchor="middle" dominant-baseline="middle" font-size="11" pointer-events="none">${node.icon}</text>`;
    } else if (node.type === 'notable') {
      svgContent += `<text x="${pos.cx}" y="${pos.cy + 1}" text-anchor="middle" dominant-baseline="middle" font-size="9" pointer-events="none">${node.icon}</text>`;
    }

    // Hitarea (transparent, larger for small nodes)
    svgContent += `<circle cx="${pos.cx}" cy="${pos.cy}" r="${Math.max(r + 4, 12)}" fill="transparent" data-node="${id}" style="cursor:${canAlloc || allocated ? 'pointer' : 'default'}"/>`;
  });

  // Class label overlays
  Object.entries(CLASS_ANGLES).forEach(([cls, angleDeg]) => {
    const a = angleDeg * DEG;
    const lr = OUTER_R + 18;
    const lx = CX + lr * Math.cos(a);
    const ly = CY + lr * Math.sin(a);
    const classColors = { Marauder:'#c43c3c', Witch:'#9b59b6', Ranger:'#27ae60', Shadow:'#2980b9', Templar:'#f39c12', Duelist:'#e67e22', Scion:'#bdc3c7' };
    const cc = classColors[cls] || '#888';
    const classData = CLASSES[cls];
    if (classData) {
      svgContent += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="${cc}" font-weight="bold" opacity="0.7" pointer-events="none">${classData.icon}${cls}</text>`;
    }
  });

  svgContent += `</g>`;
  svg.innerHTML = svgContent;

  // Attach event listeners
  svg.querySelectorAll('[data-node]').forEach(el => {
    const nodeId = el.getAttribute('data-node');
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!treeDragging) allocatePassive(nodeId);
    });
    el.addEventListener('mousemove', (e) => {
      showPoeTreeTooltip(nodeId, e.clientX, e.clientY);
    });
    el.addEventListener('mouseleave', () => hidePoeTreeTooltip());
  });

  // Drag to pan
  setupTreeDrag(svg, container);
}

function setupTreeDrag(svg, container) {
  let isDragging = false;
  let startX = 0, startY = 0;
  let moved = false;

  container.onmousedown = (e) => {
    if (e.target.getAttribute && e.target.getAttribute('data-node')) {
      isDragging = false; return;
    }
    isDragging = true;
    moved = false;
    startX = e.clientX - treeViewport.x;
    startY = e.clientY - treeViewport.y;
    treeDragging = false;
  };
  document.onmousemove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx - treeViewport.x) > 5 || Math.abs(dy - treeViewport.y) > 5) {
      treeDragging = true;
      moved = true;
    }
    treeViewport.x = dx;
    treeViewport.y = dy;
    if (moved) renderTree();
  };
  document.onmouseup = () => {
    isDragging = false;
    setTimeout(() => { treeDragging = false; }, 100);
  };

  container.onwheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.3, Math.min(3, treeViewport.scale * delta));

    // Zoom toward mouse position
    const rect = container.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    treeViewport.x = mx - (mx - treeViewport.x) * (newScale / treeViewport.scale);
    treeViewport.y = my - (my - treeViewport.y) * (newScale / treeViewport.scale);
    treeViewport.scale = newScale;
    renderTree();
  };
}

function showPoeTreeTooltip(nodeId, mx, my) {
  const node = PASSIVE_TREE[nodeId];
  if (!node) return;

  const tooltip = document.getElementById('poe-tree-tooltip');
  if (!tooltip) return;

  const typeLabel = node.type === 'start' ? 'Startknoten' :
                    node.type === 'notable' ? '⭐ Bemerkenswerter Knoten' :
                    node.type === 'keystone' ? '💎 Keystone' : 'Normaler Knoten';

  let html = `<h4>${node.icon} ${node.name}</h4>`;
  html += `<p class="tt-type">${typeLabel}</p>`;
  if (node.description) html += `<p class="tt-desc">${node.description}</p>`;
  if (node.attrs) {
    Object.entries(node.attrs).forEach(([stat, val]) => {
      if (typeof val === 'boolean') {
        html += `<p class="tt-stat">✓ ${getStatLabel(stat)}</p>`;
      } else {
        html += `<p class="tt-stat">+${val} ${getStatLabel(stat)}</p>`;
      }
    });
  }
  if (state.allocatedPassives.includes(nodeId)) {
    html += `<p class="tt-avail">✓ Allokiert</p>`;
  } else if (canAllocatePassive(nodeId)) {
    html += `<p class="tt-avail">Klicken zum Allokieren (${state.passivePoints} Punkt${state.passivePoints !== 1 ? 'e' : ''} verfügbar)</p>`;
  } else {
    html += `<p class="tt-unavail">Nicht erreichbar</p>`;
  }

  tooltip.innerHTML = html;
  tooltip.style.display = 'block';
  // Position near cursor, avoid overflow
  const tx = Math.min(mx + 12, window.innerWidth - 280);
  const ty = Math.min(my + 12, window.innerHeight - 200);
  tooltip.style.left = tx + 'px';
  tooltip.style.top = ty + 'px';
}


function hidePoeTreeTooltip() {
  const t = document.getElementById('poe-tree-tooltip');
  if (t) t.style.display = 'none';
}

function drawTreeConnections() {
  // Legacy function - kept for compatibility, actual drawing now in renderTree SVG
}

function canAllocatePassive(nodeId) {
  if (!state) return false;

  // Check if already allocated
  if (state.allocatedPassives.includes(nodeId)) return false;

  // Check if we have points
  if (state.passivePoints <= 0) return false;

  // Check if connected to allocated node
  const node = PASSIVE_TREE[nodeId];
  if (!node) return false;

  // Find connections to this node
  const connections = PASSIVE_TREE_CONNECTIONS.filter(c => c.to === nodeId || c.from === nodeId);

  for (const conn of connections) {
    const connectedId = conn.from === nodeId ? conn.to : conn.from;
    if (state.allocatedPassives.includes(connectedId)) {
      return true;
    }
  }

  // Check if it's the start node
  const classData = CLASSES[state.className];
  if (nodeId === classData.startNode) return true;

  return false;
}

function allocatePassive(nodeId) {
  if (!state || !canAllocatePassive(nodeId)) return;

  const node = PASSIVE_TREE[nodeId];
  if (!node) return;

  state.allocatedPassives.push(nodeId);
  state.passivePoints--;

  // Apply node stats
  if (node.attrs) {
    Object.entries(node.attrs).forEach(([stat, value]) => {
      applyPassiveStat(stat, value);
    });
  }

  saveGame();
  renderTree();
  renderCharacter();
  addToLog(`Passivpunkt investiert: ${node.name}`, 'system');
}

function deallocatePassive(nodeId) {
  if (!state || !state.allocatedPassives.includes(nodeId)) return;

  const node = PASSIVE_TREE[nodeId];
  if (!node) return;

  // Remove from allocated
  state.allocatedPassives = state.allocatedPassives.filter(id => id !== nodeId);
  state.passivePoints++;

  // Remove node stats
  if (node.attrs) {
    Object.entries(node.attrs).forEach(([stat, value]) => {
      applyPassiveStat(stat, -value);
    });
  }

  saveGame();
  renderTree();
  renderCharacter();
  addToLog(`Passivpunkt zurückgesetzt: ${node.name}`, 'system');
}

function resetTree() {
  if (!state) return;

  // Reset all passive points
  const classData = CLASSES[state.className];
  state.allocatedPassives = [classData.startNode];
  state.passivePoints = state.level; // Give back all points

  // Recalculate stats from scratch
  state.attrs = {...classData.attr};
  state.stats = calculateBaseStats(state.attrs, state.level);

  // Re-apply equipment stats
  applyEquipmentStats();

  saveGame();
  renderTree();
  renderCharacter();
  addToLog("Passivbaum zurückgesetzt!", 'system');
}

function applyPassiveStat(stat, value) {
  if (!state) return;

  if (stat === 'str' || stat === 'dex' || stat === 'int') {
    state.attrs[stat] = (state.attrs[stat] || 0) + value;
  } else if (stat === 'life' || stat === 'mana') {
    state.stats[`max${stat.charAt(0).toUpperCase() + stat.slice(1)}`] = (state.stats[`max${stat.charAt(0).toUpperCase() + stat.slice(1)}`] || 0) + value;
    state.stats[stat] = (state.stats[stat] || 0) + value;
  } else if (stat === 'lifePct' || stat === 'manaPct') {
    const base = stat === 'lifePct' ? 100 + state.level * 12 + state.attrs.str * 2.2 : 45 + state.level * 5 + state.attrs.int * 1.6;
    const increase = Math.floor(base * value / 100);
    state.stats[`max${stat === 'lifePct' ? 'Life' : 'Mana'}`] = (state.stats[`max${stat === 'lifePct' ? 'Life' : 'Mana'}`] || 0) + increase;
    state.stats[stat === 'lifePct' ? 'life' : 'mana'] = (state.stats[stat === 'lifePct' ? 'life' : 'mana'] || 0) + increase;
  } else if (stat === 'allRes') {
    state.stats.fireRes = (state.stats.fireRes || 0) + value;
    state.stats.coldRes = (state.stats.coldRes || 0) + value;
    state.stats.lightningRes = (state.stats.lightningRes || 0) + value;
  } else {
    state.stats[stat] = (state.stats[stat] || 0) + value;
  }
}


// ========== RENDER FUNCTIONS ==========
function renderCharacter() {
  if (!state) return;

  // Update character info
  el('char-name').textContent = state.name;
  el('char-class').textContent = `${state.classIcon} ${state.className}`;
  el('char-level').textContent = `Level ${state.level}`;

  // Render stats
  renderStats();
  renderEquipment();
}

function renderStats() {
  if (!state) return;

  const stats = state.stats;
  const attrs = state.attrs;

  // Attribute stats
  el('stats-container').innerHTML = `
    <div class="stat">
      <span><span class="icon icon-str"></span> Stärke</span>
      <strong>${attrs.str}</strong>
    </div>
    <div class="stat">
      <span><span class="icon icon-dex"></span> Geschick</span>
      <strong>${attrs.dex}</strong>
    </div>
    <div class="stat">
      <span><span class="icon icon-int"></span> Intelligenz</span>
      <strong>${attrs.int}</strong>
    </div>
    <div class="stat">
      <span><span class="icon icon-life"></span> Leben</span>
      <div class="bar life"><span style="width:${Math.min(100, stats.life / (stats.maxLife || 1) * 100)}%"></span></div>
      <strong>${stats.life} / ${stats.maxLife || stats.life}</strong>
    </div>
    <div class="stat">
      <span><span class="icon icon-mana"></span> Mana</span>
      <div class="bar mana"><span style="width:${Math.min(100, ((state.currentMana ?? stats.mana) / (stats.maxMana || stats.mana || 1)) * 100)}%"></span></div>
      <strong>${Math.floor(state.currentMana ?? stats.mana)} / ${stats.maxMana || stats.mana}</strong>
    </div>
    <div class="stat">
      <span><span class="icon"></span> Energieschild</span>
      <strong>${stats.es || 0} / ${stats.maxES || 0}</strong>
    </div>
  `;

  // Defense stats
  el('defense-container').innerHTML = `
    <div class="stat">
      <span><span class="icon"></span> Rüstung</span>
      <strong>${stats.armour || 0}</strong>
    </div>
    <div class="stat">
      <span><span class="icon"></span> Ausweichen</span>
      <strong>${stats.evasion || 0}%</strong>
    </div>
    <div class="stat">
      <span><span class="icon icon-fire"></span> Feuerresistenz</span>
      <strong>${stats.fireRes || 0}%</strong>
    </div>
    <div class="stat">
      <span><span class="icon icon-cold"></span> Kälteresistenz</span>
      <strong>${stats.coldRes || 0}%</strong>
    </div>
    <div class="stat">
      <span><span class="icon icon-lightning"></span> Blitzresistenz</span>
      <strong>${stats.lightningRes || 0}%</strong>
    </div>
    <div class="stat">
      <span><span class="icon icon-chaos"></span> Chaosresistenz</span>
      <strong>${stats.chaosRes || 0}%</strong>
    </div>
  `;

  // Offensive stats
  el('offense-container').innerHTML = `
    <div class="stat">
      <span><span class="icon"></span> Phys. Schaden</span>
      <strong>${stats.physicalDamage || 0}%</strong>
    </div>
    <div class="stat">
      <span><span class="icon icon-fire"></span> Feuerschaden</span>
      <strong>${stats.fireDamage || 0}%</strong>
    </div>
    <div class="stat">
      <span><span class="icon icon-cold"></span> Kälteschaden</span>
      <strong>${stats.coldDamage || 0}%</strong>
    </div>
    <div class="stat">
      <span><span class="icon icon-lightning"></span> Blitzschaden</span>
      <strong>${stats.lightningDamage || 0}%</strong>
    </div>
    <div class="stat">
      <span><span class="icon icon-chaos"></span> Chaosschaden</span>
      <strong>${stats.chaosDamage || 0}%</strong>
    </div>
    <div class="stat">
      <span><span class="icon"></span> Angriffsgeschwindigkeit</span>
      <strong>${stats.attackSpeed || 0}%</strong>
    </div>
    <div class="stat">
      <span><span class="icon"></span> Zaubergeschwindigkeit</span>
      <strong>${stats.castSpeed || 0}%</strong>
    </div>
    <div class="stat">
      <span><span class="icon"></span> Kritische Chance</span>
      <strong>${stats.critChance || 0}%</strong>
    </div>
    <div class="stat">
      <span><span class="icon"></span> Krit. Multiplikator</span>
      <strong>${(stats.critMulti || 1.5).toFixed(1)}x</strong>
    </div>
    <div class="stat">
      <span><span class="icon"></span> Item Rarity</span>
      <strong>${stats.itemRarity || 0}%</strong>
    </div>
    <div class="stat">
      <span><span class="icon"></span> Item Quantity</span>
      <strong>${stats.itemQuantity || 0}%</strong>
    </div>
  `;
}

function renderEquipment() {
  if (!state) return;

  const container = el('equipment-grid');
  container.innerHTML = '';

  EQUIPMENT_SLOTS.forEach(slot => {
    const slotDiv = document.createElement('div');

    if (state.equipment[slot.id]) {
      const item = state.equipment[slot.id];
      slotDiv.className = 'item-card';
      slotDiv.style.borderColor = RARITY[item.rarity] ? RARITY[item.rarity].color : '#888';

      slotDiv.innerHTML = createItemHTML(item, true);

      slotDiv.onclick = () => unequipItem(slot.id);
      slotDiv.onmouseenter = () => {
        showTooltip(slotDiv, createItemTooltip(item), 'item');
      };
      slotDiv.onmouseleave = () => hideTooltip('item');
    } else {
      slotDiv.className = 'item-card empty';
      slotDiv.innerHTML = `${slot.icon} ${slot.name}`;
      slotDiv.onclick = () => {
        addToLog(`Klicke auf ein Item im Inventar, um es in den ${slot.name} Slot zu legen.`, 'system');
      };
    }

    container.appendChild(slotDiv);
  });
}

