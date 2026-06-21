// ============================================
// TOWN.JS - Stadt: Händler, Gem-Vendor, Verkauf,
// Crafting, Quests, Stash-Verwaltung
// ============================================

// ========== TOWN FUNCTIONS ==========
function renderTown() {
  if (!state) return;

  ensureTownEndgameBar();
  renderStash();
  renderVendor();
  renderQuestLog();
  renderCrafting();

  // Ensure buy subtab is active when opening town
  showVendorSubTab('buy');

  // Update stats
  el('town-kills').textContent = state.kills;
  el('town-deaths').textContent = state.deaths;
  el('town-level').textContent = state.level;
  el('town-gold').textContent = state.gold;
}

// ========== ENDGAME: Karten & Bosse (Stadt) ==========
function ensureTownEndgameBar() {
  const sec = el('section-town');
  if (!sec) return;
  let bar = document.getElementById('town-endgame-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'town-endgame-bar';
    bar.style.cssText = 'display:flex;gap:10px;margin-bottom:14px;';
    sec.insertBefore(bar, sec.firstChild);
  }
  const ready = typeof isCampaignComplete === 'function' && isCampaignComplete();
  const mapCount = (state.maps || []).length;
  bar.innerHTML = `
    <button id="town-map-btn" onclick="openMapMenu()" ${ready ? '' : 'disabled'} style="flex:1;border-color:var(--gold);color:var(--gold);padding:10px;" title="${ready ? '' : `Ab Akt ${CAMPAIGN_COMPLETE_ACT} verfügbar`}">🗺️ Karten (${mapCount})</button>
    <button id="town-boss-btn" onclick="openBossMenu()" ${ready ? '' : 'disabled'} style="flex:1;border-color:var(--gold);color:var(--gold);padding:10px;" title="${ready ? '' : `Ab Akt ${CAMPAIGN_COMPLETE_ACT} verfügbar`}">👑 Bosse</button>
  `;
}

function renderStash() {
  if (!state) return;

  const stash = state.stash || [];
  el('stash-count').textContent = `${stash.length}/${STASH_CAP}`;
  el('town-stash-count').textContent = `${stash.length}/${STASH_CAP}`;

  const container = el('stash-grid');
  const townContainer = el('town-stash-grid');
  container.innerHTML = '';
  townContainer.innerHTML = '';

  stash.forEach(item => {
    const itemDiv = createItemDiv(item, true);
    container.appendChild(itemDiv);

    const townItemDiv = createItemDiv(item, true);
    townContainer.appendChild(townItemDiv);
  });
}

function showVendorSubTab(tab) {
  ['buy','gems','sell'].forEach(t => {
    const content = el(`vendor-sub-${t}`);
    const tabEl = el(`vtab-${t}`);
    if (content) content.classList.add('hidden');
    if (tabEl) tabEl.classList.remove('active');
  });
  const active = el(`vendor-sub-${tab}`);
  const activeTab = el(`vtab-${tab}`);
  if (active) active.classList.remove('hidden');
  if (activeTab) activeTab.classList.add('active');

  if (tab === 'sell') renderSellInventory();
  else if (tab === 'gems') renderGemVendor();
}

function renderVendor() {
  const container = el('currency-vendor');
  if (!container) return;
  container.innerHTML = '';

  CURRENCY_TYPES.forEach(currency => {
    const currencyDiv = document.createElement('div');
    currencyDiv.className = 'item-card';
    currencyDiv.innerHTML = `
      <strong>${ICONS.currency} ${currency.name}</strong>
      <p>Kosten: ${currency.cost} ${ICONS.gold}</p>
      <button onclick="buyCurrency('${currency.name.replace(/'/g, "\\'")}', ${currency.cost})">Kaufen</button>
    `;
    container.appendChild(currencyDiv);
  });

  const itemContainer = el('item-vendor');
  if (!itemContainer) return;
  itemContainer.innerHTML = '';

  for (let i = 0; i < 6; i++) {
    const slot = pick(EQUIP_SLOT_KEYS);
    const rarity = pickWeighted([
      {value: 'normal', weight: 60},
      {value: 'magic', weight: 25},
      {value: 'rare', weight: 10}
    ]);

    const item = createItem({
      slot: slot,
      level: Math.max(1, state.level - 5),
      rarity: rarity
    });

    const cost = Math.floor(item.itemLevel * 3 + (rarity === 'magic' ? 10 : rarity === 'rare' ? 25 : 0));

    const itemDiv = document.createElement('div');
    itemDiv.className = 'item-card';
    itemDiv.style.borderColor = RARITY[item.rarity] ? RARITY[item.rarity].color : '#888';

    itemDiv.innerHTML = `
      <div class="item-title">
        <strong style="color:${RARITY[item.rarity] ? RARITY[item.rarity].color : '#888'}">${getItemIcon(item)} ${item.name}</strong>
      </div>
      <p style="color:#aaa;font-size:12px;">${item.base}</p>
      ${item.affixes.length > 0 ? `<div class="item-mods">${item.affixes.map(a => `${a.label}: +${a.value}`).join('<br>')}</div>` : ''}
      <div class="item-actions">
        <button onclick="buyVendorItem('${item.id}', ${cost})">Kaufen (${cost} ${ICONS.gold})</button>
      </div>
    `;

    itemDiv.onmouseenter = () => { showTooltip(itemDiv, createItemTooltip(item), 'item'); };
    itemDiv.onmouseleave = () => hideTooltip('item');

    itemContainer.appendChild(itemDiv);
  }
}

// ========== GEM VENDOR ==========
function renderGemVendor() {
  const skillContainer = el('skill-gem-vendor');
  const supportContainer = el('support-gem-vendor');
  if (!skillContainer || !supportContainer) return;

  skillContainer.innerHTML = '';
  supportContainer.innerHTML = '';

  // Gem prices
  const GEM_PRICES = {
    Cleave: 15, Fireball: 20, LightningArrow: 18, IceSpear: 22, PoisonStrike: 17, Arc: 20, Cyclone: 25, SummonSkeletons: 28
  };
  const SUPPORT_PRICES = {
    AddedFireDamage: 12, FasterAttacks: 14, FasterCasting: 14, MultipleProjectiles: 18,
    IncreasedCriticalStrikes: 16, Chain: 20, Pierce: 15, MinionDamage: 18, LifeLeech: 22, ManaLeech: 18
  };

  const GEM_DESCRIPTIONS = {
    Cleave: 'Klasse: Krieger', Fireball: 'Klasse: Hexe', LightningArrow: 'Klasse: Ranger',
    IceSpear: 'Klasse: Hexe', PoisonStrike: 'Klasse: Shadow', Arc: 'Klasse: Templar',
    Cyclone: 'Klasse: Krieger', SummonSkeletons: 'Klasse: Hexe'
  };

  Object.entries(SKILL_GEMS).forEach(([name, gem]) => {
    if (gem.type !== 'active') return;
    const cost = GEM_PRICES[name] || 20;
    const colorClass = gem.color === 'red' ? 'red-gem' : gem.color === 'green' ? 'green-gem' : 'blue-gem';
    const colorHex = gem.color === 'red' ? '#9e3a3a' : gem.color === 'green' ? '#3a9e3a' : '#3a3a9e';

    const div = document.createElement('div');
    div.className = `item-card ${colorClass}`;
    div.innerHTML = `
      <div class="item-title">
        <strong style="color:${colorHex}">${gem.icon} ${name}</strong>
        <span style="color:#666;font-size:11px;">Aktiv</span>
      </div>
      <p style="color:#aaa;font-size:11px;margin:3px 0;">${gem.description}</p>
      <p style="color:#888;font-size:11px;margin:2px 0;">${GEM_DESCRIPTIONS[name] || ''}</p>
      <p style="color:#aaa;font-size:11px;">Mana: ${gem.mana} | Schaden: ${gem.damage} | Crit: +${gem.crit}%</p>
      <div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap;">
        ${gem.tags.map(t => `<span style="background:#1a1a30;border:1px solid #333;border-radius:3px;padding:1px 5px;font-size:10px;color:#888;">${t}</span>`).join('')}
      </div>
      <div class="item-actions" style="margin-top:6px;">
        <button onclick="buyGem('${name}','active')" style="color:${colorHex};border-color:${colorHex};">Kaufen (${cost} 💰)</button>
      </div>
    `;
    skillContainer.appendChild(div);
  });

  Object.entries(SKILL_GEMS).forEach(([name, gem]) => {
    if (gem.type !== 'support') return;
    const cost = SUPPORT_PRICES[name] || 15;
    const colorClass = gem.color === 'red' ? 'red-gem' : gem.color === 'green' ? 'green-gem' : 'blue-gem';
    const colorHex = gem.color === 'red' ? '#9e3a3a' : gem.color === 'green' ? '#3a9e3a' : '#3a3a9e';

    const div = document.createElement('div');
    div.className = `item-card ${colorClass}`;
    div.innerHTML = `
      <div class="item-title">
        <strong style="color:${colorHex}">${gem.icon} ${name}</strong>
        <span style="color:#666;font-size:11px;">Support</span>
      </div>
      <p style="color:#aaa;font-size:11px;margin:3px 0;">${gem.description}</p>
      <div style="margin:4px 0;display:flex;gap:4px;flex-wrap:wrap;">
        ${gem.tags.map(t => `<span style="background:#1a1a30;border:1px solid #333;border-radius:3px;padding:1px 5px;font-size:10px;color:#888;">${t}</span>`).join('')}
      </div>
      <div class="item-actions" style="margin-top:6px;">
        <button onclick="buyGem('${name}','support')" style="color:${colorHex};border-color:${colorHex};">Kaufen (${cost} 💰)</button>
      </div>
    `;
    supportContainer.appendChild(div);
  });
}

function buyGem(gemName, gemType) {
  if (!state) return;

  const GEM_PRICES = {
    Cleave:15, Fireball:20, LightningArrow:18, IceSpear:22, PoisonStrike:17, Arc:20, Cyclone:25, SummonSkeletons:28,
    AddedFireDamage:12, FasterAttacks:14, FasterCasting:14, MultipleProjectiles:18,
    IncreasedCriticalStrikes:16, Chain:20, Pierce:15, MinionDamage:18, LifeLeech:22, ManaLeech:18
  };
  const cost = GEM_PRICES[gemName] || 20;

  if (state.gold < cost) {
    addToLog(`❌ Nicht genug Gold! Benötige ${cost} 💰, habe ${state.gold}`, 'error');
    return;
  }

  if (state.inventory.length >= INVENTORY_CAP) {
    addToLog("❌ Inventar ist voll!", 'error');
    return;
  }

  const gem = createGem(gemName, gemType);
  if (!gem) { addToLog("❌ Gem nicht gefunden!", 'error'); return; }

  state.gold -= cost;
  state.inventory.push(gem);

  const typeLabel = gemType === 'active' ? 'Skill Gem' : 'Support Gem';
  addToLog(`💎 Gekauft: ${gemName} (${typeLabel}) für ${cost} 💰`, 'system');
  saveGame();
  renderInventory();
  renderSkills();
  updateGoldDisplay();
}

// ========== SELL INVENTORY ==========
let sellSelectedIds = new Set();

function renderSellInventory() {
  if (!state) return;
  sellSelectedIds = new Set();
  updateSellTotal();

  const container = el('sell-inventory-grid');
  if (!container) return;
  container.innerHTML = '';

  const sellableItems = state.inventory.filter(i => i.type === 'item');

  if (sellableItems.length === 0) {
    container.innerHTML = '<p style="color:#666;grid-column:1/-1;padding:10px;">Keine verkäuflichen Items im Inventar.</p>';
    return;
  }

  sellableItems.forEach(item => {
    const sellPrice = getSellPrice(item);
    const rarityColor = RARITY[item.rarity] ? RARITY[item.rarity].color : '#888';

    const div = document.createElement('div');
    div.className = 'sell-item';
    div.id = `sell-item-${item.id}`;
    div.style.borderColor = rarityColor;
    div.innerHTML = `
      <div style="color:${rarityColor};font-size:12px;font-weight:bold;">${getItemIcon(item)} ${item.name}</div>
      <div style="color:#666;font-size:10px;">${item.base || ''} · ${RARITY[item.rarity]?.name || item.rarity}</div>
      <div class="sell-price">💰 ${sellPrice} Gold</div>
    `;
    div.onclick = () => toggleSellItem(item.id, sellPrice, div);
    div.onmouseenter = () => showTooltip(div, createItemTooltip(item), 'item');
    div.onmouseleave = () => hideTooltip('item');
    container.appendChild(div);
  });
}

function getSellPrice(item) {
  if (!item) return 1;
  const rarityMult = item.rarity === 'unique' ? 8 : item.rarity === 'rare' ? 4 : item.rarity === 'magic' ? 2 : 1;
  const levelMult = Math.max(1, (item.itemLevel || item.level || 1));
  return Math.floor(levelMult * rarityMult * 0.8 + 1);
}

function toggleSellItem(itemId, price, divEl) {
  if (sellSelectedIds.has(itemId)) {
    sellSelectedIds.delete(itemId);
    divEl.classList.remove('selected');
  } else {
    sellSelectedIds.add(itemId);
    divEl.classList.add('selected');
  }
  updateSellTotal();
}

function updateSellTotal() {
  let total = 0;
  if (state) {
    sellSelectedIds.forEach(id => {
      const item = state.inventory.find(i => i.id === id);
      if (item) total += getSellPrice(item);
    });
  }
  const totalEl = el('sell-total');
  if (totalEl) totalEl.textContent = total;
  const sellBtn = el('sell-selected-btn');
  if (sellBtn) sellBtn.disabled = sellSelectedIds.size === 0;
}

function sellSelectedItems() {
  if (!state || sellSelectedIds.size === 0) return;

  let totalGold = 0;
  let soldCount = 0;

  sellSelectedIds.forEach(id => {
    const idx = state.inventory.findIndex(i => i.id === id);
    if (idx !== -1) {
      const item = state.inventory[idx];
      const price = getSellPrice(item);
      totalGold += price;
      state.inventory.splice(idx, 1);
      soldCount++;
    }
  });

  state.gold += totalGold;
  sellSelectedIds.clear();

  addToLog(`💰 ${soldCount} Item${soldCount !== 1 ? 's' : ''} verkauft für ${totalGold} Gold!`, 'system');
  saveGame();
  updateGoldDisplay();
  renderInventory();
  renderSellInventory();
}

function selectAllSellItems() {
  if (!state) return;
  state.inventory.filter(i => i.type === 'item').forEach(item => {
    const price = getSellPrice(item);
    sellSelectedIds.add(item.id);
    const div = document.getElementById(`sell-item-${item.id}`);
    if (div) div.classList.add('selected');
  });
  updateSellTotal();
}

function deselectAllSellItems() {
  sellSelectedIds.clear();
  document.querySelectorAll('.sell-item.selected').forEach(d => d.classList.remove('selected'));
  updateSellTotal();
}

function buyCurrency(name, cost) {
  if (!state) return;

  if (state.gold < cost) {
    addToLog(`❌ Nicht genug ${ICONS.gold}! Benötige ${cost}, hast ${state.gold}`, 'error');
    return;
  }

  state.gold -= cost;
  addCurrency(name, 1);

  addToLog(`💰 Gekauft: ${name} für ${cost} ${ICONS.gold}`, 'system');
  saveGame();
  renderVendor();
  updateGoldDisplay();
}

function buyVendorItem(itemId, cost) {
  if (!state) return;

  // Find item in vendor (simplified - in real implementation we'd track vendor stock)
  // For now, just create a new item
  const slot = pick(EQUIP_SLOT_KEYS);
  const rarity = pickWeighted([
    {value: 'normal', weight: 60},
    {value: 'magic', weight: 25},
    {value: 'rare', weight: 10}
  ]);

  const item = createItem({
    slot: slot,
    level: Math.max(1, state.level - 5),
    rarity: rarity
  });

  if (state.gold < cost) {
    addToLog(`❌ Nicht genug ${ICONS.gold}! Benötige ${cost}, hast ${state.gold}`, 'error');
    return;
  }

  state.gold -= cost;

  // Check inventory space
  if (state.inventory.length >= INVENTORY_CAP) {
    addToLog("❌ Inventar ist voll!", 'error');
    return;
  }

  state.inventory.push(item);

  addToLog(`🛍️ Gekauft: ${item.name} für ${cost} ${ICONS.gold}`, 'system');
  saveGame();
  renderVendor();
  renderInventory();
  updateGoldDisplay();
}

function renderQuestLog() {
  if (!state) return;

  const container = el('quest-log');
  container.innerHTML = '';

  state.quests.forEach(quest => {
    const questDiv = document.createElement('div');
    questDiv.style.padding = '8px';
    questDiv.style.margin = '4px 0';
    questDiv.style.background = quest.completed ? '#224422' : '#442222';
    questDiv.style.borderRadius = '4px';

    questDiv.innerHTML = `
      <strong>${quest.completed ? '✅' : '🔘'} ${quest.name}</strong>
      <p style="color:#aaa;font-size:12px;">${quest.description}</p>
      <p style="color:#aaa;font-size:12px;">Belohnung: ${quest.rewards.join(', ')}</p>
    `;

    container.appendChild(questDiv);
  });
}

function checkQuests(type, data) {
  if (!state) return;

  state.quests.forEach(quest => {
    if (quest.completed) return;

    switch(type) {
      case 'kill':
        if (quest.id === 'act1_quest2' && state.kills >= 10) {
          completeQuest(quest.id);
        }
        break;
      case 'zone':
        if (quest.id === 'act1_quest1' && data.name === "The Twilight Strand") {
          completeQuest(quest.id);
        } else if (quest.id === 'act2_quest1' && data.name === "Vaal Ruins") {
          completeQuest(quest.id);
        } else if (quest.id === 'act5_quest1' && data.name === "The Ruined Square") {
          completeQuest(quest.id);
        }
        break;
      case 'boss':
        if (quest.id === 'act10_quest1' && data.name === "Shaper") {
          completeQuest(quest.id);
        }
        break;
    }
  });
}

function completeQuest(questId) {
  if (!state) return;

  const quest = state.quests.find(q => q.id === questId);
  if (!quest) return;

  quest.completed = true;

  // Give rewards
  quest.rewards.forEach(reward => {
    if (reward.includes('x')) {
      const [name, amount] = reward.split('x').map(s => s.trim());
      addCurrency(name, parseInt(amount) || 1);
    } else {
      addCurrency(reward, 1);
    }
  });

  addToLog(`🎉 Quest abgeschlossen: ${quest.name}!`, 'system');
  saveGame();
  renderQuestLog();
}

let craftSelectedItemId = null;
let craftSelectedCurrency = null; // PoE-style inventory crafting: currency picked, waiting for an item click


// Definition of every currency that can be used on items, what it requires,
// and what it actually does to the item.
const CRAFTING_CURRENCIES = [
  {
    name: 'Scroll of Wisdom',
    icon: '📜',
    desc: 'Identifiziert ein unidentifiziertes Item und deckt seine Eigenschaften auf.',
    canApply: item => item.identified === false,
    reason: item => item.identified === false ? '' : 'Item ist bereits identifiziert',
    apply: item => { item.identified = true; },
    message: item => `📜 ${item.name} identifiziert!`
  },
  {
    name: 'Transmutation Orb',
    icon: '🔵',
    desc: 'Wertet ein Normales Item zu einem Magic-Item auf (1-2 zufällige Eigenschaften).',
    canApply: item => item.rarity === 'normal',
    reason: item => item.rarity === 'normal' ? '' : 'Nur für normale Items',
    apply: item => {
      item.rarity = 'magic';
      item.affixes = [];
      rebuildItemMods(item);
      if (item.type === 'map') { addRandomMapMods(item, rnd(1, 2)); item.name = generateRareName(item.base, 'magic'); }
      else { addRandomAffixes(item, rnd(1, 2)); item.name = buildMagicName(item); }
    },
    message: item => `🔵 ${item.name} zu Magic aufgewertet!`
  },
  {
    name: 'Augmentation Orb',
    icon: '🔷',
    desc: 'Fügt einem Magic-Item mit nur 1 Eigenschaft eine zweite zufällige Eigenschaft hinzu.',
    canApply: item => item.rarity === 'magic' && item.affixes.length < 2,
    reason: item => item.rarity !== 'magic' ? 'Nur für Magic-Items' : (item.affixes.length >= 2 ? 'Item hat bereits 2 Eigenschaften' : ''),
    apply: item => { if (item.type === 'map') addRandomMapMods(item, item.affixes.length + 1); else addRandomAffixes(item, item.affixes.length + 1); },
    message: item => `🔷 Neue Eigenschaft auf ${item.name} hinzugefügt!`
  },
  {
    name: 'Alchemy Orb',
    icon: '🔮',
    desc: 'Wertet ein Normales Item direkt zu einem Rare-Item mit 4-6 zufälligen Eigenschaften auf.',
    canApply: item => item.rarity === 'normal',
    reason: item => item.rarity === 'normal' ? '' : 'Nur für normale Items',
    apply: item => {
      item.rarity = 'rare';
      item.name = generateRareName(item.base, 'rare');
      item.affixes = [];
      rebuildItemMods(item);
      if (item.type === 'map') addRandomMapMods(item, rnd(4, 6));
      else addRandomAffixes(item, rnd(4, 6));
    },
    message: item => `🔮 ${item.name} zu Rare aufgewertet!`
  },
  {
    name: 'Chaos Orb',
    icon: '🎲',
    desc: 'Würfelt alle Eigenschaften eines Rare-Items komplett neu (neue Werte, neuer Name).',
    canApply: item => item.rarity === 'rare',
    reason: item => item.rarity === 'rare' ? '' : 'Nur für Rare-Items',
    apply: item => {
      item.name = generateRareName(item.base, 'rare');
      item.affixes = [];
      rebuildItemMods(item);
      if (item.type === 'map') addRandomMapMods(item, rnd(4, 6));
      else addRandomAffixes(item, rnd(4, 6));
    },
    message: item => `🎲 ${item.name} komplett neu gewürfelt!`
  },
  {
    name: 'Exalted Orb',
    icon: '✨',
    desc: 'Fügt einem Rare-Item eine zusätzliche zufällige Eigenschaft hinzu, ohne die bestehenden zu verändern (max. 6 Eigenschaften).',
    canApply: item => item.rarity === 'rare' && item.affixes.length < 6,
    reason: item => item.rarity !== 'rare' ? 'Nur für Rare-Items' : (item.affixes.length >= 6 ? 'Item hat bereits die maximale Anzahl an Eigenschaften' : ''),
    apply: item => { if (item.type === 'map') addRandomMapMods(item, item.affixes.length + 1); else addRandomAffixes(item, item.affixes.length + 1); },
    message: item => `✨ Neue Eigenschaft auf ${item.name} hinzugefügt!`
  },
  {
    name: 'Divine Orb',
    icon: '🌟',
    desc: 'Würfelt die Werte aller bestehenden Eigenschaften neu, ohne die Eigenschaften selbst zu verändern.',
    canApply: item => (item.rarity === 'magic' || item.rarity === 'rare') && item.affixes.length > 0,
    reason: item => (item.rarity === 'magic' || item.rarity === 'rare') ? (item.affixes.length > 0 ? '' : 'Item hat keine Eigenschaften') : 'Nur für Magic- oder Rare-Items',
    apply: item => { rerollAffixValues(item); },
    message: item => `🌟 Werte von ${item.name} neu gewürfelt!`
  },
  {
    name: 'Chromatic Orb',
    icon: '🎨',
    desc: 'Würfelt die Farben aller Sockel eines Items neu.',
    canApply: item => item.sockets && item.sockets.length > 0,
    reason: item => (item.sockets && item.sockets.length > 0) ? '' : 'Item hat keine Sockel',
    apply: item => { item.sockets = createSockets(item.sockets.length, state.attrs); },
    message: item => `🎨 Sockelfarben von ${item.name} geändert!`
  },
  {
    name: "Jeweller's Orb",
    icon: '🔘',
    desc: 'Würfelt die Anzahl der Sockel eines Waffen- oder Rüstungsteils neu (1 bis max., abhängig vom Level).',
    canApply: item => item.slot === 'weapon' || item.slot === 'armour',
    reason: item => (item.slot === 'weapon' || item.slot === 'armour') ? '' : 'Nur für Waffen und Rüstung',
    apply: item => { rerollSockets(item); },
    message: item => `🔘 Sockelanzahl von ${item.name} neu gewürfelt!`
  },
  {
    name: 'Fusing Orb',
    icon: '🔗',
    desc: 'Würfelt die Verbindungen (Links) zwischen den Sockeln eines Items neu.',
    canApply: item => item.sockets && item.sockets.length > 1,
    reason: item => (item.sockets && item.sockets.length > 1) ? '' : 'Item benötigt mindestens 2 Sockel',
    apply: item => { item.links = createLinks(item.sockets.length, getItemMaxLinks(item)); },
    message: item => `🔗 Links von ${item.name} neu gewürfelt!`
  }
];

function getCurrencyAmount(name) {
  if (!state) return 0;
  const c = state.inventory.find(i => i.type === 'currency' && i.name === name);
  return c ? c.amount : 0;
}

function consumeCurrency(name, amount = 1) {
  if (!state) return false;
  const idx = state.inventory.findIndex(i => i.type === 'currency' && i.name === name);
  if (idx === -1 || state.inventory[idx].amount < amount) return false;
  state.inventory[idx].amount -= amount;
  if (state.inventory[idx].amount <= 0) state.inventory.splice(idx, 1);
  return true;
}

// Rerolls the numeric value of every existing affix on an item, keeping the
// affixes themselves (used by Divine Orb).
function rerollAffixValues(item) {
  // Seed mods with implicits only - the loop below adds each affix's freshly
  // rolled value, so pre-seeding with the OLD affix values here would double-count.
  item.mods = {};
  (item.implicits || []).forEach(im => { item.mods[im.stat] = (item.mods[im.stat] || 0) + im.value; });
  item.affixes.forEach(affix => {
    if (item.type === 'map') {
      const src = MAP_MOD_POOL.find(m => m.stat === affix.stat);
      if (src) {
        const frac = (item.tier || 1) / 16;
        const lo = Math.round(src.min + (src.max - src.min) * frac * 0.4);
        const hi = Math.round(src.min + (src.max - src.min) * frac);
        affix.value = rnd(lo, Math.max(lo, hi));
      }
    } else {
      const source = [...PREFIXES, ...SUFFIXES].find(a => a[1] === affix.stat);
      if (source) {
        const [, , , min, max] = source;
        const tier = affix.tier || AFFIX_TIER_COUNT;
        const [lo, hi] = tierValueRange(min, max, tier);
        affix.value = rnd(lo, hi);
      }
    }
    item.mods[affix.stat] = (item.mods[affix.stat] || 0) + affix.value;
  });
}

// Rerolls the socket count of an item between 1 and a level/rarity-based max
// (used by Jeweller's Orb).
function rerollSockets(item) {
  const level = item.itemLevel || item.level || 1;
  let baseCount;
  if (level <= 10) baseCount = 1;
  else if (level <= 25) baseCount = 2;
  else if (level <= 40) baseCount = 3;
  else if (level <= 60) baseCount = 4;
  else baseCount = 5;

  const rarityBonus = item.rarity === 'rare' ? 1 : item.rarity === 'unique' ? 2 : 0;
  const cap = getItemMaxLinks(item);
  const maxSockets = clamp(baseCount + rarityBonus, 1, cap);
  const newCount = rnd(1, maxSockets);

  item.sockets = createSockets(newCount, state.attrs);
  item.links = createLinks(newCount, cap);
}

function renderCrafting() {
  if (!state) return;

  el('crafting-result').innerHTML = '<p style="color:#aaa;">Klicke auf "Crafting öffnen", um ein Item auszuwählen.</p>';

  // Keep an open modal in sync (e.g. after a quest reward grants new currency)
  const overlay = el('craft-modal-overlay');
  if (overlay && !overlay.classList.contains('hidden')) {
    populateCraftItemSelect();
    renderCraftingModalContent();
  }
}

function openCraftingModal() {
  if (!state) return;
  populateCraftItemSelect();
  renderCraftingModalContent();
  el('craft-modal-overlay').classList.remove('hidden');
}

function closeCraftingModal() {
  el('craft-modal-overlay').classList.add('hidden');
}

function populateCraftItemSelect() {
  if (!state) return;
  const select = el('craft-item-select');
  const prevValue = craftSelectedItemId || '';

  select.innerHTML = '<option value="">Wähle ein Item zum Craften</option>';
  state.inventory.filter(i => i.type === 'item').forEach(item => {
    const option = document.createElement('option');
    option.value = item.id;
    const rarityName = RARITY[item.rarity] ? RARITY[item.rarity].name : item.rarity;
    option.textContent = `${item.name} (${rarityName}${item.identified === false ? ', unidentifiziert' : ''})`;
    select.appendChild(option);
  });

  if (prevValue && state.inventory.some(i => i.id === prevValue)) {
    select.value = prevValue;
  } else {
    craftSelectedItemId = null;
  }
}

function onCraftItemSelectChange() {
  craftSelectedItemId = el('craft-item-select').value || null;
  renderCraftingModalContent();
}

function renderCraftingModalContent() {
  if (!state) return;
  const previewEl = el('craft-item-preview');
  const listEl = el('craft-currency-list');

  if (!craftSelectedItemId) {
    previewEl.innerHTML = '';
    listEl.innerHTML = '<p style="color:#aaa;">Wähle oben ein Item aus, um zu sehen welche Currency du darauf anwenden kannst.</p>';
    return;
  }

  const item = state.inventory.find(i => i.id === craftSelectedItemId);
  if (!item) {
    previewEl.innerHTML = '';
    listEl.innerHTML = '<p style="color:#aaa;">Item nicht gefunden.</p>';
    return;
  }

  const rarityColor = RARITY[item.rarity] ? RARITY[item.rarity].color : '#888';
  const rarityName = RARITY[item.rarity] ? RARITY[item.rarity].name : item.rarity;

  let previewHtml = `<div class="craft-item-preview">`;
  previewHtml += `<strong style="color:${rarityColor};font-size:15px;">${getItemIcon(item)} ${item.name}</strong>`;
  previewHtml += `<p style="color:#aaa;font-size:12px;margin:2px 0 6px 0;">${item.base} • ${rarityName}${item.identified === false ? ' • <span style="color:#ff6666;">❔ Unidentifiziert</span>' : ''}</p>`;
  if (item.affixes && item.affixes.length > 0) {
    previewHtml += `<div class="item-mods">${item.affixes.map(a => `${a.label}: +${a.value}`).join('<br>')}</div>`;
  }
  if (item.sockets && item.sockets.length > 0) {
    const socketIcons = item.sockets.map(s => `<span class="icon-socket ${s.color}"></span>`).join('');
    const linkText = item.links && item.links.length ? item.links.join('-') + ' Link' : '';
    previewHtml += `<div style="margin-top:6px;font-size:11px;">Sockel: ${socketIcons} ${linkText}</div>`;
  }
  previewHtml += `</div>`;
  previewEl.innerHTML = previewHtml;

  let listHtml = '';
  CRAFTING_CURRENCIES.forEach(c => {
    const amount = getCurrencyAmount(c.name);
    const applicable = c.canApply(item);
    const enabled = amount > 0 && applicable;
    const reasonText = !applicable ? c.reason(item) : (amount <= 0 ? 'Keine im Besitz' : '');

    listHtml += `<div class="currency-row ${enabled ? 'enabled' : 'disabled'}">`;
    listHtml += `<div class="currency-row-info">`;
    listHtml += `<div class="currency-row-name">${c.icon} ${c.name}</div>`;
    listHtml += `<div class="currency-row-desc">${c.desc}</div>`;
    listHtml += `<div class="currency-row-amount">Besitz: ${amount}${reasonText ? ` • ${reasonText}` : ''}</div>`;
    listHtml += `</div>`;
    listHtml += `<button ${enabled ? '' : 'disabled'} onclick="applyCurrencyToItem('${c.name.replace(/'/g, "\\'")}')">Anwenden</button>`;
    listHtml += `</div>`;
  });
  listEl.innerHTML = listHtml;
}


// === PoE-style inventory crafting: pick currency, then click an item ===
function selectCraftCurrency(name) {
  if (!state) return;
  if (getCurrencyAmount(name) <= 0) { addToLog(`Keine ${name} mehr.`, 'system'); return; }
  craftSelectedCurrency = craftSelectedCurrency === name ? null : name;
  renderInventory();
}
function clearCraftCurrency() {
  craftSelectedCurrency = null;
  renderInventory();
}
function applyCraftCurrencyDirect(currencyName, itemId) {
  if (!state) return;
  const item = state.inventory.find(i => i.id === itemId);
  if (!item) return;
  const config = CRAFTING_CURRENCIES.find(c => c.name === currencyName);
  if (!config) { addToLog(`Unbekannte Currency: ${currencyName}`, 'error'); return; }
  if (getCurrencyAmount(currencyName) <= 0) { addToLog(`❌ Keine ${currencyName} mehr!`, 'error'); craftSelectedCurrency = null; renderInventory(); return; }
  if (!config.canApply(item)) { addToLog(`❌ ${config.reason(item) || 'Nicht anwendbar'}`, 'error'); return; }
  consumeCurrency(currencyName, 1);
  config.apply(item);
  addToLog(config.message(item), 'system');
  if (getCurrencyAmount(currencyName) <= 0) craftSelectedCurrency = null;
  saveGame();
  renderInventory();
}

// === Link groups: derive [groupId per socket] from item.links e.g. [3,1,2] -> [0,0,0,1,2,2] ===
function getSocketLinkGroups(item) {
  if (!item || !item.sockets) return [];
  const groups = [];
  const links = (item.links && item.links.length) ? item.links : [item.sockets.length];
  let g = 0, i = 0;
  for (const size of links) {
    for (let k = 0; k < size && i < item.sockets.length; k++) { groups.push(g); i++; }
    g++;
  }
  while (groups.length < item.sockets.length) { groups.push(g++); }
  return groups;
}
function getLinkedSupports(item, socketIndex) {
  if (!item || !item.sockets) return [];
  const groups = getSocketLinkGroups(item);
  const myGroup = groups[socketIndex];
  const out = [];
  item.sockets.forEach((s, idx) => {
    if (idx === socketIndex) return;
    if (!s.gem || s.gem.gemType !== 'support') return;
    if (groups[idx] === myGroup) out.push(s.gem);
  });
  return out;
}
function renderSocketLinks(item) {
  if (!item || !item.sockets || !item.sockets.length) return '';
  const groups = getSocketLinkGroups(item);
  let html = '<div class="sock-row">';
  let lastGroup = -1;
  let openGroup = false;
  item.sockets.forEach((s, idx) => {
    const g = groups[idx];
    if (g !== lastGroup) {
      if (openGroup) html += '</span>';
      html += '<span class="sock-group">';
      openGroup = true;
      lastGroup = g;
    } else {
      html += '<span class="sock-link"></span>';
    }
    const gemTitle = s.gem ? `${s.gem.icon || ''} ${s.gem.name}` : 'Leer';
    html += `<span class="sock ${s.color}" title="${s.color.toUpperCase()} - ${gemTitle}"></span>`;
  });
  if (openGroup) html += '</span>';
  html += '</div>';
  return html;
}

function applyCurrencyToItem(currencyName) {
  if (!state || !craftSelectedItemId) return;

  const itemIndex = state.inventory.findIndex(i => i.id === craftSelectedItemId);
  if (itemIndex === -1) {
    addToLog("Item nicht gefunden!", 'error');
    return;
  }

  const item = state.inventory[itemIndex];
  const config = CRAFTING_CURRENCIES.find(c => c.name === currencyName);
  if (!config) return;

  if (getCurrencyAmount(currencyName) <= 0) {
    addToLog(`❌ Benötige ${currencyName}!`, 'error');
    return;
  }

  if (!config.canApply(item)) {
    addToLog(`❌ ${config.reason(item) || 'Currency kann nicht auf dieses Item angewendet werden!'}`, 'error');
    return;
  }

  consumeCurrency(currencyName, 1);
  config.apply(item);
  addToLog(config.message(item), 'system');

  saveGame();
  populateCraftItemSelect();
  renderCraftingModalContent();
  renderInventory();
}


function applyCurrencyToMap(currencyName, mapId) {
  if (!state) return;
  const item = (state.maps || []).find(m => m.id === mapId);
  if (!item) return;
  const config = CRAFTING_CURRENCIES.find(c => c.name === currencyName);
  if (!config) return;

  if (getCurrencyAmount(currencyName) <= 0) {
    addToLog(`❌ Benötige ${currencyName}!`, 'error');
    return;
  }
  if (!config.canApply(item)) {
    addToLog(`❌ ${config.reason(item) || 'Nicht anwendbar'}`, 'error');
    return;
  }

  consumeCurrency(currencyName, 1);
  config.apply(item);
  addToLog(config.message(item), 'system');
  saveGame();
  if (typeof renderMapMenu === 'function') renderMapMenu();
}

function sortStash() {
  if (!state) return;
  state.stash.sort((a, b) => {
    // Sort by type, then rarity, then name
    const typeOrder = {currency: 0, gem: 1, item: 2};
    const rarityOrder = {unique: 0, rare: 1, magic: 2, normal: 3, currency: 4};
    if (a.type !== b.type) return (typeOrder[a.type] || 2) - (typeOrder[b.type] || 2);
    if (a.rarity !== b.rarity) return (rarityOrder[a.rarity] || 3) - (rarityOrder[b.rarity] || 3);
    return (a.name || '').localeCompare(b.name || '');
  });
  saveGame();
  renderStash();
  addToLog("Stash sortiert!", 'system');
}

function moveFromStash(itemId) {
  if (!state) return;
  const itemIndex = state.stash.findIndex(i => i.id === itemId);
  if (itemIndex === -1) return;

  if (state.inventory.length >= INVENTORY_CAP) {
    addToLog("Inventar ist voll!", 'error');
    return;
  }

  const item = state.stash.splice(itemIndex, 1)[0];
  state.inventory.push(item);
  saveGame();
  renderStash();
  renderInventory();
  addToLog(`${item.name} aus dem Stash ins Inventar verschoben.`, 'system');
}

function moveToStash(itemId) {
  if (!state) return;
  const itemIndex = state.inventory.findIndex(i => i.id === itemId);
  if (itemIndex === -1) return;

  if (state.stash.length >= STASH_CAP) {
    addToLog("Stash ist voll!", 'error');
    return;
  }

  const item = state.inventory.splice(itemIndex, 1)[0];
  state.stash.push(item);
  saveGame();
  renderStash();
  renderInventory();
  addToLog(`${item.name} in den Stash verschoben.`, 'system');
}

