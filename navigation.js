// ============================================
// NAVIGATION.JS - Sektionen wechseln, Tooltips,
// Settings-Anzeige
// ============================================

// ========== NAVIGATION ==========
function showSection(section) {
  // ── COMBAT LOCK ──────────────────────────────────────────────────────────
  // Während der Spieler in einer Zone/Karte ist (nicht in der Stadt),
  // sind Charakter, Inventar, Passivbaum, Skills und Stadt gesperrt.
  const ZONE_LOCKED = ['char', 'inventory', 'tree', 'skills', 'town'];
  if (state && !state.inTown && ZONE_LOCKED.includes(section)) {
    // Visuelles Feedback: kurzer Shake auf dem Nav-Button
    _shakeNavButton(section);
    addToLog('🔒 Nicht verfügbar im Gebiet – kehre zuerst zur Stadt zurück!', 'error');
    return; // hard block
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Hide all main sections
  document.querySelectorAll('[id^="section-"]').forEach(s => s.classList.add('hidden'));

  // Show selected section
  const target = el(`section-${section}`);
  if (target) target.classList.remove('hidden');

  // PoE-style inventory: also render character + equipment alongside the item grid
  if (section === 'inventory') {
    const charSec = el('section-char');
    if (charSec) charSec.classList.remove('hidden');
  }

  // Show/hide nav bar based on whether we have a character
  const navBar = el('nav-bar');
  if (navBar) {
    if (state && section !== 'char-select') {
      navBar.classList.remove('hidden');
      navBar.style.display = 'flex';
    } else {
      navBar.classList.add('hidden');
      navBar.style.display = 'none';
    }
  }

  // Grey out nav items during active combat (zone not cleared yet)
  updateNavCombatState();

  // Update content
  if (state) {
    switch(section) {
      case 'char': renderCharacter(); break;
      case 'inventory': renderInventory(); break;
      case 'stash': renderStash(); break;
      case 'tree': renderTree(); break;
      case 'skills': renderSkills(); break;
      case 'map': renderMap(); break;
      case 'town': renderTown(); break;
      case 'settings': renderSettings(); break;
    }
  } else if (section === 'char-select') {
    renderClassSelection();
  }
}

function showCharTab(tab) {
  currentCharTab = tab;

  // Hide all char tabs
  document.querySelectorAll('[id^="char-tab-"]').forEach(t => t.classList.add('hidden'));

  // Show selected tab
  el(`char-tab-${tab}`).classList.remove('hidden');

  // Update tab buttons - find the clicked tab by matching text
  document.querySelectorAll('#section-char .tab').forEach(t => {
    t.classList.remove('active');
    if ((tab === 'stats' && t.textContent.includes('Attribute')) ||
        (tab === 'defense' && t.textContent.includes('Verteidigung')) ||
        (tab === 'offense' && t.textContent.includes('Offensiv'))) {
      t.classList.add('active');
    }
  });
}

function showTownTab(tab) {
  currentTownTab = tab;

  // Hide all town tabs
  document.querySelectorAll('[id^="town-tab-"]').forEach(t => t.classList.add('hidden'));

  // Show selected tab
  el(`town-tab-${tab}`).classList.remove('hidden');

  // Update tab buttons
  document.querySelectorAll('#section-town .tab').forEach(t => {
    t.classList.remove('active');
    if ((tab === 'stash' && t.textContent.includes('Lagertruhe')) ||
        (tab === 'vendor' && t.textContent.includes('Händler')) ||
        (tab === 'crafting' && t.textContent.includes('Schmied'))) {
      t.classList.add('active');
    }
  });

  // Render content
  if (tab === 'stash') renderStash();
  else if (tab === 'vendor') { renderVendor(); showVendorSubTab('buy'); }
  else if (tab === 'crafting') renderCrafting();
}

// ========== TOOLTIP SYSTEM ==========
let tooltipTimeout = null;

function showTooltip(element, content, type = 'item') {
  if (tooltipTimeout) clearTimeout(tooltipTimeout);

  const tooltip = el(`${type}-tooltip`);
  tooltip.innerHTML = content;
  tooltip.style.display = 'block';

  // Position tooltip
  const rect = element.getBoundingClientRect();
  tooltip.style.left = `${rect.left + window.scrollX}px`;
  tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;

  // Hide when mouse leaves
  element.onmouseleave = () => {
    tooltipTimeout = setTimeout(() => {
      tooltip.style.display = 'none';
    }, 100);
  };
}

function hideTooltip(type = 'item') {
  if (tooltipTimeout) clearTimeout(tooltipTimeout);
  el(`${type}-tooltip`).style.display = 'none';
}

function createItemTooltip(item) {
  if (!item) return '';

  const rarityColor = RARITY[item.rarity] ? RARITY[item.rarity].color : '#888';
  const icon = getItemIcon(item);

  let html = `<h4 style="color:${rarityColor};margin:0 0 8px 0;">${icon} ${item.name}</h4>`;

  if (item.base && item.name !== item.base) {
    html += `<p style="color:#aaa;margin:0 0 8px 0;">${item.base}</p>`;
  }

  if (item.identified === false) {
    html += `<p style="color:#ff6666;margin:0 0 8px 0;">❔ Unidentifiziert</p>`;
  }

  if (item.rarity === 'Unique') {
    html += `<p style="color:#ffd700;margin:0 0 8px 0;font-style:italic;">${item.description || ''}</p>`;
  }

  html += `<p style="color:#aaa;margin:0 0 8px 0;">${item.type === 'currency' ? 'Währung' : item.type === 'gem' ? 'Skill-Gem' : item.type === 'map' ? 'Karte' : 'Item'}</p>`;

  if (item.type === 'map') {
    html += `<p style="color:#aaa;margin:0 0 8px 0;">Tier: ${item.tier}</p>`;
  }

  if (item.rarity !== 'Normal') {
    html += `<p style="color:#aaa;margin:0 0 8px 0;">Rarität: ${RARITY[item.rarity] ? RARITY[item.rarity].name : item.rarity}</p>`;
  }

  if (item.type === 'gem') {
    html += `<p style="color:#aaa;margin:0 0 8px 0;">Typ: ${item.gemType === 'active' ? 'Aktiv' : 'Support'}</p>`;
    html += `<p style="color:#aaa;margin:0 0 8px 0;">Level: ${item.level}</p>`;
    if (item.mana) html += `<p style="color:#aaa;margin:0 0 8px 0;">Mana-Kosten: ${item.mana}</p>`;
    if (item.damage) html += `<p style="color:#aaa;margin:0 0 8px 0;">Schaden: ${item.damage}</p>`;
    if (item.speed) html += `<p style="color:#aaa;margin:0 0 8px 0;">Geschwindigkeit: ${(item.speed * 100).toFixed(0)}%</p>`;
    if (item.crit) html += `<p style="color:#aaa;margin:0 0 8px 0;">Crit Chance: +${item.crit}%</p>`;
    if (item.description) html += `<p style="color:#aaa;margin:0 0 8px 0;font-size:12px;">${item.description}</p>`;
  } else if (item.type !== 'currency') {
    // Item mods (hidden until identified, PoE-style)
    if (item.identified === false) {
      html += `<div style="margin-top:8px;border-top:1px solid #333;padding-top:8px;">`;
      html += `<p style="color:#ff6666;margin:0;font-style:italic;">Modifikatoren erst nach Identifikation sichtbar.</p>`;
      html += `<p style="color:#aaa;margin:4px 0 0 0;font-size:11px;">Benutze ein Scroll of Wisdom.</p>`;
      html += `</div>`;
    } else if (item.affixes && item.affixes.length > 0) {
      html += `<div style="margin-top:8px;border-top:1px solid #333;padding-top:8px;">`;
      html += `<p style="color:#aaa;margin:0 0 4px 0;">Modifikatoren:</p>`;
      item.affixes.forEach(affix => {
        const sign = affix.value >= 0 ? '+' : '';
        html += `<p class="mod positive" style="margin:0;">${affix.label}: ${sign}${affix.value}</p>`;
      });
      html += `</div>`;
    }

    // Socket + link info
    if (item.sockets && item.sockets.length > 0) {
      const groups = getSocketLinkGroups(item);
      html += `<div style="margin-top:8px;border-top:1px solid #333;padding-top:8px;">`;
      const linkStr = (item.links && item.links.length) ? item.links.join('-') : String(item.sockets.length);
      html += `<p style="color:#aaa;margin:0 0 4px 0;">Sockel (${item.sockets.length}) · Links: ${linkStr}</p>`;
      html += renderSocketLinks(item);
      item.sockets.forEach((socket, index) => {
        const gemName = socket.gem ? `${socket.gem.icon || ''} ${socket.gem.name}` : 'Leer';
        const col = socket.color === 'red' ? '#ff6666' : socket.color === 'green' ? '#66ff66' : socket.color === 'blue' ? '#6699ff' : '#ffffff';
        html += `<p style="margin:0;font-size:11px;color:${col};">${index + 1}. [${socket.color.toUpperCase()}] G${groups[index]+1} - ${gemName}</p>`;
      });
      // Per active gem: show linked supports and resulting stats
      item.sockets.forEach((socket, index) => {
        if (!socket.gem || socket.gem.gemType !== 'active') return;
        const linked = getLinkedSupports(item, index);
        const eff = calcEffectiveSkill(socket.gem, linked);
        html += `<div style="margin-top:6px;padding-top:6px;border-top:1px dashed #333;">`;
        html += `<p style="margin:0;color:var(--gold);font-size:11px;">${socket.gem.icon || ''} ${socket.gem.name} (verlinkt)</p>`;
        if (linked.length === 0) {
          html += `<p style="margin:0;color:#888;font-size:11px;">Keine verlinkten Support Gems</p>`;
        } else {
          linked.forEach(sup => {
            const sd = SKILL_GEMS[sup.name] || {};
            const ok = supportCompatible(socket.gem, sd);
            html += `<p style="margin:0;color:${ok?'#66ff66':'#888'};font-size:11px;">↳ ${sup.icon || ''} ${sup.name} ${ok?'':'(inkompatibel)'}</p>`;
          });
        }
        html += `<p style="margin:2px 0 0 0;font-size:11px;color:#ccc;">💙${eff.mana} ⚔️${eff.damage}${eff.projCount>1?` ×${eff.projCount}`:''}${eff.chains?` · Chains ${eff.chains}`:''}${eff.pierces?` · Pierce ${eff.pierces}`:''}${eff.leech?` · Leech ${(eff.leech*100).toFixed(1)}%`:''}</p>`;
        html += `</div>`;
      });
      html += `</div>`;
    }
  }

  if (item.slot) {
    html += `<p style="color:#aaa;margin:8px 0 0 0;font-size:12px;">Slot: ${getSlotName(item.slot)}</p>`;
  }

  return html;
}

function createPassiveTooltip(nodeId) {
  const node = PASSIVE_TREE[nodeId];
  if (!node) return '';

  let html = `<h4 style="color:var(--gold);margin:0 0 8px 0;">${node.icon} ${node.name}</h4>`;
  html += `<p style="color:#aaa;margin:0 0 8px 0;">Typ: ${node.type === 'start' ? 'Startknoten' : node.type === 'notable' ? 'Bemerkenswerter Knoten' : node.type === 'keystone' ? 'Keystone' : 'Normaler Knoten'}</p>`;

  if (node.description) {
    html += `<p style="color:#aaa;margin:0 0 8px 0;">${node.description}</p>`;
  }

  if (node.attrs) {
    html += `<div style="margin-top:8px;border-top:1px solid #333;padding-top:8px;">`;
    html += `<p style="color:#aaa;margin:0 0 4px 0;">Boni:</p>`;
    Object.entries(node.attrs).forEach(([stat, value]) => {
      const sign = value >= 0 ? '+' : '';
      const label = getStatLabel(stat);
      html += `<p class="mod positive" style="margin:0;">${label}: ${sign}${value}</p>`;
    });
    html += `</div>`;
  }

  // Check if allocated
  if (state && state.allocatedPassives.includes(nodeId)) {
    html += `<p style="color:#44ff44;margin:8px 0 0 0;">✓ Allokiert</p>`;
  } else if (canAllocatePassive(nodeId)) {
    html += `<p style="color:#ffd700;margin:8px 0 0 0;">Klicken zum Allokieren</p>`;
  } else {
    html += `<p style="color:#ff6666;margin:8px 0 0 0;">Nicht verfügbar</p>`;
  }

  return html;
}

function getItemIcon(item) {
  if (item.type === 'currency') return ICONS.currency;
  if (item.type === 'gem') return item.icon || ICONS.gem;
  if (item.type === 'map') return ICONS.map;

  const slotIcons = {
    weapon: ICONS.weapon,
    armour: ICONS.armour,
    accessory: ICONS.accessory
  };

  return slotIcons[item.slot] || ICONS.weapon;
}

function getSlotName(slot) {
  const names = {
    weapon: 'Waffe',
    armour: 'Rüstung',
    accessory: 'Accessoire'
  };
  return names[slot] || slot;
}

function getStatLabel(stat) {
  const labels = {
    str: "Stärke",
    dex: "Geschick",
    int: "Intelligenz",
    life: "Leben",
    mana: "Mana",
    es: "Energieschild",
    armour: "Rüstung",
    evasion: "Ausweichen",
    allDamage: "Globaler Schaden",
    fireDamage: "Feuerschaden",
    coldDamage: "Kälteschaden",
    lightningDamage: "Blitzschaden",
    chaosDamage: "Chaosschaden",
    physicalDamage: "Physischer Schaden",
    incPhys: "Erhöhter physischer Schaden",
    attackSpeed: "Angriffsgeschwindigkeit",
    castSpeed: "Zaubergeschwindigkeit",
    critChance: "Kritische Trefferchance",
    critMulti: "Kritischer Multiplikator",
    lifeRegen: "Lebensregeneration",
    manaRegen: "Manaregeneration",
    lifePct: "Leben %",
    manaPct: "Mana %",
    fireRes: "Feuerresistenz",
    coldRes: "Kälteresistenz",
    lightningRes: "Blitzresistenz",
    chaosRes: "Chaosresistenz",
    allRes: "Alle Resistenzen",
    moveSpeed: "Bewegungsgeschwindigkeit",
    itemRarity: "Item Rarity",
    itemQuantity: "Item Quantity",
    projectileDamage: "Projektilschaden",
    spellDamage: "Zauberschaden",
    minionDamage: "Dienerschaden",
    elementalDamage: "Elementarschaden"
  };

  return labels[stat] || stat;
}


function renderSettings() {
  if (!state) return;

  el('auto-combat-toggle').checked = state.autoMode;
  el('idle-mode-toggle').checked = state.idleMode;
}


// ========== NAV COMBAT GREYING ==========
// Sections die im Gebiet gesperrt sind (showSection blockt diese bereits hart).
// updateNavCombatState() macht die Buttons zusätzlich visuell ausgegraut.
const COMBAT_LOCKED_SECTIONS = ['char', 'inventory', 'tree', 'skills', 'town'];

function _ensureNavStyles() {
  if (document.getElementById('nav-combat-styles')) return;
  const style = document.createElement('style');
  style.id = 'nav-combat-styles';
  style.textContent = `
    @keyframes navShake {
      0%,100%{transform:translateX(0);}
      20%{transform:translateX(-5px);}
      40%{transform:translateX(5px);}
      60%{transform:translateX(-4px);}
      80%{transform:translateX(4px);}
    }
    #nav-bar button.combat-locked,
    #nav-bar a.combat-locked {
      opacity: 0.30 !important;
      filter: grayscale(1) brightness(0.55) !important;
      cursor: not-allowed !important;
      position: relative;
      transition: opacity 0.35s ease, filter 0.35s ease;
    }
    #nav-bar button.combat-locked::after,
    #nav-bar a.combat-locked::after {
      content: '🔒';
      position: absolute;
      top: 1px;
      right: 2px;
      font-size: 8px;
      pointer-events: none;
    }
    #nav-bar button:not(.combat-locked),
    #nav-bar a:not(.combat-locked) {
      transition: opacity 0.35s ease, filter 0.35s ease;
    }
    .nav-shake {
      animation: navShake 0.4s ease !important;
    }
  `;
  document.head.appendChild(style);
}

function _shakeNavButton(section) {
  _ensureNavStyles();
  // Alle Buttons im nav-bar durchsuchen und den passenden schütteln
  document.querySelectorAll('#nav-bar button, #nav-bar a').forEach(btn => {
    const oc = btn.getAttribute('onclick') || '';
    if (oc.includes("'" + section + "'") || oc.includes('"' + section + '"')) {
      btn.classList.remove('nav-shake');
      void btn.offsetWidth; // reflow
      btn.classList.add('nav-shake');
      setTimeout(() => btn.classList.remove('nav-shake'), 450);
    }
  });
}

function updateNavCombatState() {
  if (!state) return;
  _ensureNavStyles();
  const inZone = !state.inTown; // Gesperrt sobald nicht in Stadt

  document.querySelectorAll('#nav-bar button, #nav-bar a').forEach(btn => {
    const oc = btn.getAttribute('onclick') || btn.getAttribute('href') || '';
    const isLockable = COMBAT_LOCKED_SECTIONS.some(sec =>
      oc.includes("'" + sec + "'") || oc.includes('"' + sec + '"')
    );
    if (!isLockable) return;

    if (inZone) {
      btn.classList.add('combat-locked');
      btn.setAttribute('data-orig-title', btn.title || '');
      btn.title = '⚔️ Erst nach Rückkehr zur Stadt verfügbar';
    } else {
      btn.classList.remove('combat-locked');
      btn.title = btn.getAttribute('data-orig-title') || '';
    }
  });
}
