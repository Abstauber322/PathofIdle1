// ============================================
// EQUIPMENT.JS - Item-Generierung, Ausrüsten,
// Sockets/Gems, Inventar- & Socket-Modal-Anzeige
// ============================================

function createCurrency(name, amount = 1) {
  return {
    id: uid(),
    type: 'currency',
    name: name,
    amount: amount,
    rarity: 'currency',
    icon: ICONS.currency
  };
}

// ========== MAPS (Endgame) ==========
function createMapItem(tier) {
  tier = clamp(Math.round(tier), 1, 16);
  const baseName = pick(MAP_BASE_TYPES) + ' Map';
  return {
    id: uid(),
    type: 'map',
    name: baseName,
    base: baseName,
    tier: tier,
    rarity: 'normal',
    identified: true,
    level: 67 + tier,
    itemLevel: 67 + tier,
    icon: ICONS.map,
    affixes: [],
    mods: {},
    sockets: [],
    links: [],
    bossWave: Math.min(15, 6 + Math.floor(tier / 3))
  };
}

function addRandomMapMods(item, count) {
  const usedStats = new Set(item.affixes.map(a => a.stat));
  let attempts = 0;
  while (item.affixes.length < count && attempts < 30) {
    attempts++;
    const mod = pick(MAP_MOD_POOL);
    if (usedStats.has(mod.stat)) continue;
    const frac = (item.tier || 1) / 16;
    const lo = Math.round(mod.min + (mod.max - mod.min) * frac * 0.4);
    const hi = Math.round(mod.min + (mod.max - mod.min) * frac);
    const value = rnd(lo, Math.max(lo, hi));
    item.affixes.push({stat: mod.stat, label: mod.label, value: value});
    item.mods[mod.stat] = (item.mods[mod.stat] || 0) + value;
    usedStats.add(mod.stat);
  }
}

function createItem(opts = {}) {
  const level = opts.level || 1;
  const slot = opts.slot || pick(['weapon', 'armour', 'accessory']);
  const rarity = String(opts.rarity || pickWeighted([
    {value: 'normal', weight: 60},
    {value: 'magic', weight: 25},
    {value: 'rare', weight: 10},
    {value: 'unique', weight: 5}
  ])).toLowerCase();

  let base;
  if (opts.base) {
    base = BASE_TYPES[slot].find(b => b.name === opts.base) || pick(BASE_TYPES[slot]);
  } else {
    base = pick(BASE_TYPES[slot]);
  }

  const item = {
    id: uid(),
    type: 'item',
    name: rarity === 'normal' ? base.name : generateRareName(base.name, rarity),
    base: base.name,
    slot: slot,
    rarity: rarity,
    level: level,
    itemLevel: level,
    identified: opts.identified !== undefined ? opts.identified : true,
    sockets: [],
    links: [],
    affixes: [],
    mods: {},
    ...base,
    icon: getItemIcon({type: slot === 'jewel' ? 'jewel' : 'item', slot: slot})
  };

  // Add affixes based on rarity
  if (rarity === 'magic') {
    addRandomAffixes(item, rnd(1, 2));
  } else if (rarity === 'rare') {
    addRandomAffixes(item, rnd(4, 6));
  } else if (rarity === 'unique') {
    // Unique items have special properties
    item.name = pickUniqueName(slot);
    item.mods = getUniqueMods(slot);
    item.affixes = Object.entries(item.mods).map(([stat, value]) => ({
      stat: stat,
      value: value,
      label: getStatLabel(stat)
    }));
    item.description = getUniqueDescription(slot);
  }

  // Add sockets based on slot and level
  if (slot !== 'accessory' && slot !== 'jewel') {
    const socketCount = getSocketCount(rarity, slot, level, base.hands);
    if (socketCount > 0) {
      item.sockets = createSockets(socketCount, state ? state.attrs : {str: 1, dex: 1, int: 1});
      item.links = createLinks(socketCount, getItemMaxLinks(item));
    }
  }

  return item;
}

function createGem(name, type) {
  const gemData = SKILL_GEMS[name];
  if (!gemData) return null;

  return {
    id: uid(),
    type: 'gem',
    gemType: type,
    name: name,
    baseName: name,
    level: 1,
    xp: 0,
    quality: rnd(0, 20),
    color: gemData.color,
    tags: [...gemData.tags],
    mana: gemData.mana || 0,
    damage: gemData.damage || 0,
    speed: gemData.speed || 1,
    crit: gemData.crit || 0,
    mult: gemData.mult || 1,
    leech: gemData.leech || 0,
    minion: gemData.minion || false,
    icon: gemData.icon || ICONS.gem,
    description: gemData.description || '',
    text: gemData.text || ''
  };
}

function getBestSupportGem(activeGem) {
  const tags = SKILL_GEMS[activeGem]?.tags || [];
  if (tags.includes('Projectile')) return 'MultipleProjectiles';
  if (tags.includes('Attack')) return 'FasterAttacks';
  if (tags.includes('Spell')) return 'FasterCasting';
  return 'IncreasedCriticalStrikes';
}

// PoE-style link cap: 1H weapons max 3 links, 2H weapons & armour max 6 links.
function getItemMaxLinks(item) {
  if (!item) return 6;
  if (item.slot === 'weapon') return (item.hands === 2) ? 6 : 3;
  if (item.slot === 'armour') return 6;
  return 6;
}

function createSockets(count, attrs) {
  if (count <= 0) return [];

  const total = Math.max(1, attrs.str + attrs.dex + attrs.int);
  const weights = [
    {color: 'red', weight: attrs.str / total},
    {color: 'green', weight: attrs.dex / total},
    {color: 'blue', weight: attrs.int / total}
  ];

  const sockets = [];
  for (let i = 0; i < count; i++) {
    let r = Math.random();
    let acc = 0;
    let color = 'red';

    for (const w of weights) {
      acc += w.weight;
      if (r <= acc) {
        color = w.color;
        break;
      }
    }

    sockets.push({
      color: color,
      gem: null
    });
  }

  // Ensure at least one socket of each color if count >= 3
  if (count >= 3) {
    const colors = sockets.map(s => s.color);
    ['red', 'green', 'blue'].forEach(c => {
      if (!colors.includes(c)) {
        sockets[Math.floor(Math.random() * sockets.length)].color = c;
      }
    });
  }

  return sockets;
}

function createLinks(socketCount, maxLinkCap) {
  if (socketCount <= 1) return [1];

  const cap = maxLinkCap || 6;
  const maxLink = Math.min(cap, socketCount);
  const roll = Math.random();

  // Determine the largest link
  let largestLink;
  if (roll > 0.99) largestLink = maxLink;
  else if (roll > 0.95) largestLink = maxLink - 1;
  else if (roll > 0.85) largestLink = maxLink - 2;
  else if (roll > 0.7) largestLink = 3;
  else if (roll > 0.5) largestLink = 2;
  else largestLink = 1;

  largestLink = Math.min(largestLink, maxLink);

  const links = [largestLink];
  let remaining = socketCount - largestLink;

  while (remaining > 0) {
    const nextLink = Math.min(remaining, Math.random() > 0.5 ? 2 : 1);
    links.push(nextLink);
    remaining -= nextLink;
  }

  return links;
}

function generateRareName(base, rarity) {
  const prefixes = {
    magic: ["Vital", "Flaring", "Cruel", "Apprentice's", "Pyromancer's", "Cryomancer's", "Stormcaller's", "Toxic", "Gladiator's", "Fox's", "Scholar's", "Commander", "Tempered"],
    rare: ["Dragon", "Viper", "Dread", "Gloom", "Horror", "Rune", "Demon", "Phoenix", "Tempest", "Carrion", "Elder", "Shaper", "Uber", "Prime", "Ancient"],
    unique: ["Kaom's", "Headhunter", "Tabula", "Goldrim", "Wanderlust", "The Searing", "Quill", "Void", "Shavronne's", "The Baron", "Facebreaker", "Starforge"]
  };

  const suffixes = {
    magic: ["of the Volcano", "of the Glacier", "of the Storm", "of the Abyss", "of Ferocity", "of the Sage", "of Puncturing", "of Ruin", "of the Lynx", "of the Bear", "of the Owl", "of the Cheetah"],
    rare: ["Fang", "Bane", "Song", "Mark", "Needle", "Shelter", "Grasp", "Roar", "Spire", "Star", "Claw", "Eye"]
  };

  if (rarity === 'magic') {
    return pick(prefixes.magic) + " " + base;
  } else if (rarity === 'rare') {
    return pick(prefixes.rare) + " " + pick(suffixes.rare) + " " + base;
  } else if (rarity === 'unique') {
    return pick(prefixes.unique) + " " + base;
  }

  return base;
}

function pickUniqueName(slot) {
  const names = {
    weapon: ["Kaom's Heart", "Headhunter", "The Searing Touch", "Quill Rain", "Void Battery", "Starforge", "Atziri's Disfavour", "Windripper", "Mjolner", "Cospri's Malice", "Voltaxic Rift"],
    armour: ["Tabula Rasa", "Goldrim", "Wanderlust", "Shavronne's Wrappings", "The Baron", "Facebreaker", "Queen of the Forest", "Belly of the Beast", "Carcass Jack", "Aegis Aurora"],
    accessory: ["Headhunter", "Kaom's Heart", "Presence of Chayula", "Watcher's Eye", "Thread of Hope", "The Taming", "Ming's Heart", "Bisco's Collar", "Carnage Heart"]
  };

  return pick(names[slot] || names.weapon);
}

function getUniqueDescription(slot) {
  const descriptions = {
    weapon: "Eine legendäre Waffe mit einzigartigen Eigenschaften.",
    armour: "Eine legendäre Rüstung mit mächtigen Boni.",
    accessory: "Ein legendäres Accessoire mit speziellen Fähigkeiten."
  };
  return descriptions[slot] || "Ein einzigartiges Item mit besonderen Eigenschaften.";
}

function getUniqueMods(slot) {
  const mods = {
    weapon: {
      life: rnd(100, 500),
      fireDamage: rnd(20, 100),
      coldDamage: rnd(20, 100),
      lightningDamage: rnd(20, 100),
      incPhys: rnd(50, 200),
      attackSpeed: rnd(10, 50),
      critChance: rnd(10, 50)
    },
    armour: {
      life: rnd(100, 500),
      armour: rnd(100, 500),
      evasion: rnd(100, 500),
      energyShield: rnd(100, 500),
      fireRes: rnd(10, 50),
      coldRes: rnd(10, 50),
      lightningRes: rnd(10, 50),
      allRes: rnd(10, 30)
    },
    accessory: {
      str: rnd(10, 50),
      dex: rnd(10, 50),
      int: rnd(10, 50),
      life: rnd(20, 100),
      mana: rnd(20, 100),
      fireRes: rnd(10, 30),
      coldRes: rnd(10, 30),
      lightningRes: rnd(10, 30),
      itemRarity: rnd(10, 50),
      itemQuantity: rnd(10, 30)
    }
  };

  const result = {};
  const statKeys = Object.keys(mods[slot] || mods.weapon);
  const numStats = rnd(3, 6);

  for (let i = 0; i < numStats; i++) {
    const stat = pick(statKeys);
    result[stat] = mods[slot][stat] || mods.weapon[stat];
  }

  return result;
}

function addRandomAffixes(item, count) {
  const usedStats = new Set(item.affixes.map(a => a.stat));
  const allAffixes = [...PREFIXES, ...SUFFIXES];
  let attempts = 0;

  while (item.affixes.length < count && attempts < 50) {
    attempts++;
    const affix = pick(allAffixes);
    const [name, stat, label, min, max, tiers] = affix;

    if (usedStats.has(stat)) continue;

    const tier = clamp(Math.ceil((item.itemLevel / 80) * tiers) + rnd(-1, 1), 1, tiers);
    const tMin = Math.round(min + (max - min) * ((tier - 1) / tiers));
    const tMax = Math.round(min + (max - min) * (tier / tiers));
    const value = rnd(tMin, Math.max(tMin, tMax));

    item.affixes.push({
      name: name,
      stat: stat,
      label: label,
      value: value,
      tier: tier
    });

    item.mods[stat] = (item.mods[stat] || 0) + value;
    usedStats.add(stat);
  }
}

function getSocketCount(rarity, slot, level, hands) {
  if (slot === 'accessory' || slot === 'jewel') return 0;

  let baseCount;
  if (level <= 10) baseCount = 1;
  else if (level <= 25) baseCount = 2;
  else if (level <= 40) baseCount = 3;
  else if (level <= 60) baseCount = 4;
  else baseCount = 5;

  const rarityBonus = rarity === 'rare' ? 1 : rarity === 'unique' ? 2 : 0;
  const randomBonus = Math.random() > 0.7 ? 1 : 0;
  const cap = (slot === 'weapon' && hands !== 2) ? 3 : 6;

  return clamp(baseCount + rarityBonus + randomBonus, 1, cap);
}

function pickWeighted(options) {
  const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0);
  let random = Math.random() * totalWeight;

  for (const opt of options) {
    random -= opt.weight;
    if (random <= 0) return opt.value;
  }

  return options[0].value;
}


// ========== EQUIPMENT FUNCTIONS ==========
function equipItem(itemId) {
  if (!state) return;

  // Find item in inventory
  const itemIndex = state.inventory.findIndex(i => i.id === itemId);
  if (itemIndex === -1) return;

  const item = state.inventory[itemIndex];

  // Check if item fits in any slot
  const compatibleSlots = EQUIPMENT_SLOTS.filter(slot => slot.slot === item.slot);

  if (compatibleSlots.length === 0) {
    addToLog("Dieses Item passt in keinen Ausrüstungsslot!", 'error');
    return;
  }

  // Find first empty compatible slot
  let targetSlot = null;
  for (const slot of compatibleSlots) {
    if (!state.equipment[slot.id]) {
      targetSlot = slot.id;
      break;
    }
  }

  // If no empty slot, ask to replace
  if (!targetSlot) {
    const slotToReplace = compatibleSlots[0];
    if (confirm(`Ersetzen: ${state.equipment[slotToReplace.id].name} mit ${item.name}?`)) {
      // Move old item to inventory
      state.inventory.push(state.equipment[slotToReplace.id]);
      targetSlot = slotToReplace.id;
    } else {
      return;
    }
  }

  // Remove from inventory and equip
  state.inventory.splice(itemIndex, 1);
  state.equipment[targetSlot] = item;

  // Recalculate stats
  applyEquipmentStats();

  saveGame();
  renderCharacter();
  renderInventory();
  addToLog(`Ausrüstung: ${item.name} in ${compatibleSlots.find(s => s.id === targetSlot).name}`, 'system');
}

function unequipItem(slotId) {
  if (!state || !state.equipment[slotId]) return;

  const item = state.equipment[slotId];

  // Check inventory space
  if (state.inventory.length >= INVENTORY_CAP) {
    addToLog("Inventar ist voll!", 'error');
    return;
  }

  // Move to inventory
  state.inventory.push(item);
  state.equipment[slotId] = null;

  // Recalculate stats
  applyEquipmentStats();

  saveGame();
  renderCharacter();
  renderInventory();
  addToLog(`Ausrüstung: ${item.name} abgelegt`, 'system');
}

function applyEquipmentStats() {
  if (!state) return;

  // Reset equipment-based stats
  state.stats = calculateBaseStats(state.attrs, state.level);

  // Apply equipment mods
  Object.values(state.equipment).forEach(item => {
    if (item) {
      Object.entries(item.mods).forEach(([stat, value]) => {
        applyEquipmentStat(stat, value);
      });
    }
  });

  // Apply gem stats
  Object.values(state.equipment).forEach(item => {
    if (item && item.sockets) {
      item.sockets.forEach(socket => {
        if (socket.gem) {
          applyGemStats(socket.gem);
        }
      });
    }
  });

  // Update life/mana based on percentages
  if (state.stats.lifePct) {
    const baseLife = 100 + state.level * 12 + state.attrs.str * 2.2;
    state.stats.maxLife = Math.floor(baseLife * (1 + state.stats.lifePct / 100));
    state.stats.life = state.stats.maxLife;
  }

  if (state.stats.manaPct) {
    const baseMana = 45 + state.level * 5 + state.attrs.int * 1.6;
    state.stats.maxMana = Math.floor(baseMana * (1 + state.stats.manaPct / 100));
    state.stats.mana = state.stats.maxMana;
  }

  // Cap resistances
  state.stats.fireRes = Math.min(75, Math.max(-60, state.stats.fireRes || 0));
  state.stats.coldRes = Math.min(75, Math.max(-60, state.stats.coldRes || 0));
  state.stats.lightningRes = Math.min(75, Math.max(-60, state.stats.lightningRes || 0));
  state.stats.chaosRes = Math.min(75, Math.max(-60, state.stats.chaosRes || 0));
}

function applyEquipmentStat(stat, value) {
  if (!state) return;

  if (stat === 'str' || stat === 'dex' || stat === 'int') {
    state.attrs[stat] = (state.attrs[stat] || 0) + value;
  } else if (stat === 'life' || stat === 'mana') {
    state.stats[`max${stat.charAt(0).toUpperCase() + stat.slice(1)}`] = (state.stats[`max${stat.charAt(0).toUpperCase() + stat.slice(1)}`] || 0) + value;
    state.stats[stat] = (state.stats[stat] || 0) + value;
  } else if (stat === 'es' || stat === 'energyShield') {
    state.stats.maxES = (state.stats.maxES || 0) + value;
    state.stats.es = (state.stats.es || 0) + value;
  } else {
    state.stats[stat] = (state.stats[stat] || 0) + value;
  }
}

function applyGemStats(gem) {
  if (!state || !gem) return;

  // Apply gem's base stats
  if (gem.damage) {
    if (gem.tags.includes('Fire')) {
      state.stats.fireDamage = (state.stats.fireDamage || 0) + gem.damage;
    } else if (gem.tags.includes('Cold')) {
      state.stats.coldDamage = (state.stats.coldDamage || 0) + gem.damage;
    } else if (gem.tags.includes('Lightning')) {
      state.stats.lightningDamage = (state.stats.lightningDamage || 0) + gem.damage;
    } else if (gem.tags.includes('Chaos')) {
      state.stats.chaosDamage = (state.stats.chaosDamage || 0) + gem.damage;
    } else {
      state.stats.physicalDamage = (state.stats.physicalDamage || 0) + gem.damage;
    }
  }

  if (gem.mana) state.stats.manaCost = (state.stats.manaCost || 0) + gem.mana;
  if (gem.crit) state.stats.critChance = (state.stats.critChance || 0) + gem.crit;
  if (gem.speed && gem.speed > 1) {
    const increase = (gem.speed - 1) * 100;
    if (gem.tags.includes('Attack')) {
      state.stats.attackSpeed = (state.stats.attackSpeed || 0) + increase;
    } else {
      state.stats.castSpeed = (state.stats.castSpeed || 0) + increase;
    }
  }

  // Apply support gem effects
  if (gem.gemType === 'support') {
    if (gem.mult && gem.mult > 1) {
      state.stats.allDamage = (state.stats.allDamage || 0) + (gem.mult - 1) * 100;
    }
    if (gem.crit) state.stats.critChance = (state.stats.critChance || 0) + gem.crit;
  }
}

function socketGem(itemId, socketIndex) {
  if (!state) return;

  // Find item in equipment
  let targetItem = null;
  let targetSlot = null;

  for (const [slot, item] of Object.entries(state.equipment)) {
    if (item && item.id === itemId) {
      targetItem = item;
      targetSlot = slot;
      break;
    }
  }

  if (!targetItem || !targetItem.sockets || !targetItem.sockets[socketIndex]) return;

  // Find gem in inventory
  const gemIndex = state.inventory.findIndex(i => i.type === 'gem');
  if (gemIndex === -1) {
    addToLog("Keine Skill-Gem im Inventar gefunden!", 'error');
    return;
  }

  const gem = state.inventory[gemIndex];

  // Check color compatibility
  if (targetItem.sockets[socketIndex].color !== gem.color && targetItem.sockets[socketIndex].color !== 'white') {
    addToLog(`Gem passt nicht in ${targetItem.sockets[socketIndex].color} Sockel!`, 'error');
    return;
  }

  // Socket the gem
  targetItem.sockets[socketIndex].gem = gem;
  state.inventory.splice(gemIndex, 1);

  // Recalculate stats
  applyEquipmentStats();

  saveGame();
  renderCharacter();
  renderSkills();
  renderSkillBar();
  addToLog(`Gem ${gem.name} in ${targetItem.name} eingesetzt`, 'system');
}

function unsocketGem(itemId, socketIndex) {
  if (!state) return;

  // Find item in equipment
  let targetItem = null;

  for (const item of Object.values(state.equipment)) {
    if (item && item.id === itemId) {
      targetItem = item;
      break;
    }
  }

  if (!targetItem || !targetItem.sockets || !targetItem.sockets[socketIndex] || !targetItem.sockets[socketIndex].gem) return;

  const gem = targetItem.sockets[socketIndex].gem;

  // Check inventory space
  if (state.inventory.length >= INVENTORY_CAP) {
    addToLog("Inventar ist voll!", 'error');
    return;
  }

  // Remove gem from socket
  targetItem.sockets[socketIndex].gem = null;
  state.inventory.push(gem);

  // Recalculate stats
  applyEquipmentStats();

  saveGame();
  renderCharacter();
  renderSkills();
  renderSkillBar();
  addToLog(`Gem ${gem.name} aus ${targetItem.name} entfernt`, 'system');
}


function createItemHTML(item, inEquipment) {
  const rarityColor = RARITY[item.rarity] ? RARITY[item.rarity].color : '#888';

  let html = `
    <div class="item-title">
      <strong style="color:${rarityColor}">${item.icon || ICONS.gem} ${item.name}</strong>
      ${inEquipment ? `<span style="color:#666;font-size:11px;">${getSlotName(item.slot)}</span>` : ''}
    </div>
  `;

  if (item.base && item.name !== item.base) {
    html += `<p style="color:#888;font-size:11px;margin:4px 0;">${item.base}</p>`;
  }

  if (item.identified === false) {
    html += `<p style="color:#ff6666;font-size:11px;margin:4px 0;">❔ Unidentifiziert</p>`;
  }

  if (item.type === 'gem') {
    html += `
      <p style="color:#aaa;font-size:11px;margin:4px 0;">
        ${item.gemType === 'active' ? 'Aktiv' : 'Support'} | Lvl ${item.level}
      </p>
    `;
  } else if (item.identified !== false && item.rarity !== 'normal') {
    if (item.affixes && item.affixes.length > 0) {
      html += `<div class="item-mods">`;
      item.affixes.forEach(affix => {
        const sign = affix.value >= 0 ? '+' : '';
        html += `${affix.label}: ${sign}${affix.value}<br>`;
      });
      html += `</div>`;
    }
  } else if (item.rarity === 'unique' && item.description) {
    html += `<p style="color:#ffd700;font-size:11px;margin:4px 0;font-style:italic;">${item.description}</p>`;
  }

  if (item.sockets && item.sockets.length > 0) {
    html += renderSocketLinks(item);
  }

  return html;
}

function createItemDiv(item, inStash) {
  const div = document.createElement('div');
  div.className = 'item-card';
  div.style.borderColor = RARITY[item.rarity] ? RARITY[item.rarity].color : '#888';

  div.innerHTML = createItemHTML(item, false);

  // PoE-style: if a crafting currency is selected, clicking the item applies it
  if (!inStash && craftSelectedCurrency) {
    const cfg = CRAFTING_CURRENCIES.find(c => c.name === craftSelectedCurrency);
    const applicable = cfg && cfg.canApply(item);
    div.classList.add(applicable ? 'craft-target' : 'craft-target');
    if (!applicable) div.style.opacity = '0.55';
    div.onclick = (e) => {
      e.stopPropagation();
      if (applicable) applyCraftCurrencyDirect(craftSelectedCurrency, item.id);
      else addToLog(`❌ ${cfg ? (cfg.reason(item) || 'Nicht anwendbar') : 'Nicht anwendbar'}`, 'error');
    };
  }

  // Add action buttons
  const actions = document.createElement('div');
  actions.className = 'item-actions';

  if (inStash) {
    const btnMove = document.createElement('button');
    btnMove.textContent = '📦 Ins Inventar';
    btnMove.onclick = (e) => { e.stopPropagation(); moveFromStash(item.id); };
    actions.appendChild(btnMove);
  } else {
    // In inventory: offer identify (if unidentified), equip (for equipment) or stash
    if (item.type === 'item' && item.identified === false) {
      const btnId = document.createElement('button');
      const scrolls = getCurrencyAmount('Scroll of Wisdom');
      btnId.textContent = `📜 Identifizieren (${scrolls})`;
      btnId.disabled = scrolls <= 0;
      btnId.style.borderColor = '#ff6666';
      btnId.onclick = (e) => { e.stopPropagation(); identifySingleItem(item.id); };
      actions.appendChild(btnId);
    }
    if (item.type === 'item') {
      const btnEquip = document.createElement('button');
      btnEquip.textContent = '⚔️ Anlegen';
      btnEquip.onclick = (e) => { e.stopPropagation(); equipItem(item.id); };
      actions.appendChild(btnEquip);
    }
    if (item.type === 'item' && item.sockets && item.sockets.length > 0) {
      const btnSock = document.createElement('button');
      const filled = item.sockets.filter(s => s.gem).length;
      btnSock.textContent = `💎 Sockeln (${filled}/${item.sockets.length})`;
      btnSock.style.borderColor = 'var(--gold)';
      btnSock.onclick = (e) => { e.stopPropagation(); openSocketModal(item.id); };
      actions.appendChild(btnSock);
    }
    const btnStash = document.createElement('button');
    btnStash.textContent = '🏦 Stash';
    btnStash.onclick = (e) => { e.stopPropagation(); moveToStash(item.id); };
    actions.appendChild(btnStash);
  }

  div.appendChild(actions);

  div.onmouseenter = () => {
    showTooltip(div, createItemTooltip(item), 'item');
  };
  div.onmouseleave = () => hideTooltip('item');

  return div;
}

function identifySingleItem(itemId) {
  if (!state) return;
  const item = state.inventory.find(i => i.id === itemId);
  if (!item || item.identified !== false) return;
  if (!consumeCurrency('Scroll of Wisdom', 1)) {
    addToLog('Keine Scrolls of Wisdom mehr.', 'system');
    return;
  }
  item.identified = true;
  addToLog(`📜 ${item.name} identifiziert!`, 'loot');
  renderInventory();
}

function identifyAllItems() {
  if (!state) return;
  const targets = state.inventory.filter(i => i.type === 'item' && i.identified === false);
  if (targets.length === 0) { addToLog('Keine unidentifizierten Items.', 'system'); return; }
  let identified = 0;
  for (const item of targets) {
    if (!consumeCurrency('Scroll of Wisdom', 1)) break;
    item.identified = true;
    identified++;
  }
  addToLog(`📜 ${identified} Item(s) identifiziert.${identified < targets.length ? ' (Scrolls aufgebraucht)' : ''}`, 'loot');
  renderInventory();
}

function renderInventory() {
  if (!state) return;

  // Mirror PoE: keep character panel + equipment fresh alongside the item grid
  try { renderCharacter && renderCharacter(); } catch(e) {}
  try { renderEquipment && renderEquipment(); } catch(e) {}

  const idAllBtn = document.getElementById('btn-identify-all');
  if (idAllBtn) {
    const unid = state.inventory.filter(i => i.type === 'item' && i.identified === false).length;
    const scrolls = getCurrencyAmount('Scroll of Wisdom');
    idAllBtn.textContent = `📜 Alle identifizieren (${unid}) · ${scrolls} Scrolls`;
    idAllBtn.disabled = unid === 0 || scrolls === 0;
  }

  // Update count
  el('inv-count').textContent = `${state.inventory.filter(i => i.type !== 'currency').length}/${INVENTORY_CAP}`;

  // Render items
  const container = el('inventory-grid');
  container.innerHTML = '';

  state.inventory.filter(i => i.type !== 'currency').forEach(item => {
    const itemDiv = createItemDiv(item, false);
    container.appendChild(itemDiv);
  });

  // Craft banner (when a currency is armed)
  const gridEl = el('inventory-grid');
  if (gridEl && gridEl.parentElement) {
    let banner = document.getElementById('craft-banner');
    if (craftSelectedCurrency) {
      const cfg = CRAFTING_CURRENCIES.find(c => c.name === craftSelectedCurrency);
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'craft-banner';
        banner.className = 'craft-banner';
        gridEl.parentElement.insertBefore(banner, gridEl);
      }
      banner.innerHTML = `<span>${(cfg && cfg.icon) || '🧪'} <strong>${craftSelectedCurrency}</strong> ausgewählt – klicke ein Item, um es anzuwenden. <span style="color:#aaa;">${cfg ? cfg.desc : ''}</span></span><button onclick="clearCraftCurrency()">✖ Abbrechen</button>`;
    } else if (banner) {
      banner.remove();
    }
  }

  // Render currency (clickable to arm crafting)
  const currencyContainer = el('currency-list');
  currencyContainer.innerHTML = '';

  state.inventory.filter(i => i.type === 'currency').forEach(currency => {
    const cfg = CRAFTING_CURRENCIES.find(c => c.name === currency.name);
    const craftable = !!cfg;
    const selected = craftSelectedCurrency === currency.name;

    const currencyDiv = document.createElement('div');
    currencyDiv.className = 'item-card' + (selected ? ' craft-selected' : '');
    currencyDiv.style.minWidth = 'auto';
    currencyDiv.style.padding = '6px 10px';
    currencyDiv.style.borderColor = selected ? 'var(--gold)' : (craftable ? '#555' : '#333');
    currencyDiv.style.cursor = craftable ? 'pointer' : 'default';

    const icon = (cfg && cfg.icon) || ICONS.currency;
    currencyDiv.innerHTML = `
      <span style="color:var(--gold);font-size:13px;">${icon} ${currency.name}</span>
      <span style="color:#ccc;font-size:12px;">x${currency.amount}${craftable ? (selected ? ' · 🟢 aktiv' : ' · klicken') : ''}</span>
    `;

    if (craftable) {
      currencyDiv.onclick = (e) => { e.stopPropagation(); selectCraftCurrency(currency.name); };
    }

    currencyDiv.onmouseenter = () => {
      showTooltip(currencyDiv, `
        <h4>${icon} ${currency.name}</h4>
        <p>Menge: ${currency.amount}</p>
        ${cfg ? `<p style="color:#aaa;">${cfg.desc}</p><p style="color:var(--gold);margin-top:4px;">Klicke, um diese Currency auf ein Item anzuwenden.</p>` : '<p style="color:#aaa;">Währung zum Handeln</p>'}
      `, 'item');
    };
    currencyDiv.onmouseleave = () => hideTooltip('item');

    currencyContainer.appendChild(currencyDiv);
  });
}


// ========== SOCKET MODAL (PoE-style gem socketing on any item) ==========
let socketModalItemId = null;
let socketModalPickIdx = null; // socket index awaiting a gem pick

function findItemAnywhere(itemId) {
  if (!state) return null;
  for (const [slot, it] of Object.entries(state.equipment)) {
    if (it && it.id === itemId) return {item: it, location: 'equipment', slot};
  }
  const ii = state.inventory.findIndex(i => i.id === itemId);
  if (ii >= 0) return {item: state.inventory[ii], location: 'inventory', index: ii};
  return null;
}

function openSocketModal(itemId) {
  const found = findItemAnywhere(itemId);
  if (!found || !found.item.sockets || found.item.sockets.length === 0) {
    addToLog('Dieses Item hat keine Sockel.', 'system');
    return;
  }
  socketModalItemId = itemId;
  socketModalPickIdx = null;
  el('socket-modal-overlay').classList.remove('hidden');
  renderSocketModal();
}

function closeSocketModal() {
  socketModalItemId = null;
  socketModalPickIdx = null;
  el('socket-modal-overlay').classList.add('hidden');
}

function renderSocketModal() {
  const body = el('socket-modal-body');
  if (!body) return;
  const found = socketModalItemId ? findItemAnywhere(socketModalItemId) : null;
  if (!found) { closeSocketModal(); return; }
  const item = found.item;
  const groups = getSocketLinkGroups(item);
  const rarityColor = RARITY[item.rarity] ? RARITY[item.rarity].color : '#888';

  let html = '';
  html += `<div style="text-align:center;">`;
  html += `<h4 style="color:${rarityColor};margin:0;">${item.icon || '⚔️'} ${item.name}</h4>`;
  html += `<p style="color:#888;margin:2px 0 0;font-size:12px;">${item.base || ''} · ${found.location === 'equipment' ? 'Ausgerüstet' : 'Inventar'}</p>`;
  html += `</div>`;

  // PoE-style socket layout
  html += '<div class="big-sock-row">';
  let lastG = -1, openG = false;
  item.sockets.forEach((s, idx) => {
    const g = groups[idx];
    if (g !== lastG) {
      if (openG) html += '</div>';
      html += '<div class="big-sock-group">';
      openG = true; lastG = g;
    } else {
      html += '<div class="big-sock-link"></div>';
    }
    const isPick = socketModalPickIdx === idx;
    const gem = s.gem;
    const inner = gem ? (gem.icon || '💎') : '<span class="big-sock-empty-dot">●</span>';
    const title = `${s.color.toUpperCase()} Sockel${gem ? ` – ${gem.name}` : ' – Leer'}`;
    html += `<div class="big-sock ${s.color}${isPick?' selected':''}" title="${title}" onclick="onSocketClick(${idx})">${inner}</div>`;
  });
  if (openG) html += '</div>';
  html += '</div>';

  if (socketModalPickIdx !== null) {
    const sock = item.sockets[socketModalPickIdx];
    html += `<p style="color:var(--gold);text-align:center;margin:8px 0;">Wähle ein Gem für Sockel #${socketModalPickIdx+1} (<strong>${sock.color.toUpperCase()}</strong>)`;
    if (sock.gem) html += ` <button onclick="unsocketAny(${socketModalPickIdx})" style="margin-left:8px;">✖ Aktuelles Gem entfernen</button>`;
    html += `</p>`;
    const gems = state.inventory.filter(i => i.type === 'gem');
    if (gems.length === 0) {
      html += `<p style="color:#888;text-align:center;">Keine Gems im Inventar. Kaufe welche im Shop.</p>`;
    } else {
      html += '<div class="gem-pick-list">';
      gems.forEach(g => {
        const colorOk = sock.color === 'white' || sock.color === g.color;
        const cls = 'gem-pick' + (colorOk ? '' : ' disabled');
        const colorHex = g.color === 'red' ? '#ff6666' : g.color === 'green' ? '#66ff66' : g.color === 'blue' ? '#6699ff' : '#fff';
        html += `<div class="${cls}" onclick="${colorOk?`socketAny(${socketModalPickIdx}, '${g.id}')`:''}">
          <span class="gem-name" style="color:${colorHex};">${g.icon||'💎'} ${g.name}</span>
          <span class="gem-meta">${g.gemType === 'active' ? 'Skill' : 'Support'} · Lvl ${g.level||1} · ${g.color.toUpperCase()}${colorOk?'':' (passt nicht)'}</span>
        </div>`;
      });
      html += '</div>';
      html += `<p style="text-align:center;margin-top:8px;"><button onclick="socketModalPickIdx=null;renderSocketModal();">Abbrechen</button></p>`;
    }
  } else {
    html += `<p style="color:#aaa;text-align:center;margin:8px 0;font-size:12px;">Klicke einen Sockel, um ein Gem einzusetzen oder zu tauschen. Verbundene Sockel (goldene Linie) lassen Support-Gems den Skill verstärken.</p>`;

    // Show currently socketed gems with their effects
    const sockedActive = item.sockets.map((s,i)=>({s,i})).filter(x=>x.s.gem);
    if (sockedActive.length) {
      html += '<div style="margin-top:10px;border-top:1px solid #333;padding-top:8px;">';
      html += '<strong style="color:var(--gold);">Eingesetzte Gems:</strong>';
      sockedActive.forEach(({s,i}) => {
        const colorHex = s.gem.color === 'red' ? '#ff6666' : s.gem.color === 'green' ? '#66ff66' : s.gem.color === 'blue' ? '#6699ff' : '#fff';
        html += `<div style="margin:6px 0;padding:6px;background:#15151c;border-left:3px solid ${colorHex};">
          <div><strong style="color:${colorHex};">${s.gem.icon||'💎'} ${s.gem.name}</strong> <span style="color:#888;">(${s.gem.gemType === 'active' ? 'Skill' : 'Support'}, Sockel #${i+1})</span></div>`;
        if (s.gem.gemType === 'active') {
          const supports = getLinkedSupports(item, i);
          if (supports.length) {
            html += `<div style="color:#aaa;font-size:11px;margin-top:2px;">Verlinkte Supports: ${supports.map(x=>`<span style="color:${x.color==='red'?'#ff6666':x.color==='green'?'#66ff66':x.color==='blue'?'#6699ff':'#fff'};">${x.name}</span>`).join(', ')}</div>`;
          } else {
            html += `<div style="color:#666;font-size:11px;margin-top:2px;">Keine verlinkten Supports</div>`;
          }
        }
        html += `</div>`;
      });
      html += '</div>';
    }
  }

  body.innerHTML = html;
}

function onSocketClick(idx) {
  socketModalPickIdx = (socketModalPickIdx === idx) ? null : idx;
  renderSocketModal();
}

function socketAny(socketIdx, gemId) {
  const found = findItemAnywhere(socketModalItemId);
  if (!found) return;
  const item = found.item;
  const sock = item.sockets[socketIdx];
  const gIdx = state.inventory.findIndex(i => i.id === gemId);
  if (gIdx < 0) return;
  const gem = state.inventory[gIdx];
  if (sock.color !== 'white' && sock.color !== gem.color) {
    addToLog(`${gem.name} passt nicht in ${sock.color.toUpperCase()} Sockel!`, 'error');
    return;
  }
  // If socket already has a gem, return it to inventory
  if (sock.gem) {
    if (state.inventory.length >= INVENTORY_CAP) { addToLog('Inventar voll!', 'error'); return; }
    state.inventory.push(sock.gem);
  }
  sock.gem = gem;
  state.inventory.splice(state.inventory.findIndex(i => i.id === gemId), 1);
  socketModalPickIdx = null;
  applyEquipmentStats && applyEquipmentStats();
  saveGame();
  addToLog(`💎 ${gem.name} in ${item.name} gesockelt`, 'loot');
  renderInventory(); renderCharacter && renderCharacter(); renderSkills && renderSkills(); renderSkillBar && renderSkillBar();
  renderSocketModal();
}

function unsocketAny(socketIdx) {
  const found = findItemAnywhere(socketModalItemId);
  if (!found) return;
  const item = found.item;
  const sock = item.sockets[socketIdx];
  if (!sock.gem) return;
  if (state.inventory.length >= INVENTORY_CAP) { addToLog('Inventar voll!', 'error'); return; }
  state.inventory.push(sock.gem);
  addToLog(`💎 ${sock.gem.name} aus ${item.name} entfernt`, 'system');
  sock.gem = null;
  applyEquipmentStats && applyEquipmentStats();
  saveGame();
  renderInventory(); renderCharacter && renderCharacter(); renderSkills && renderSkills(); renderSkillBar && renderSkillBar();
  renderSocketModal();
}
