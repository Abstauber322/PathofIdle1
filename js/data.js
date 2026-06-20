// ============================================
// DATA.JS - Spieldaten: Klassen, Items, Affixe,
// Zonen, Währungen, Quests, Konstanten
// ============================================

// ========== CONSTANTS & CONFIG ==========
const SAVE_KEY = "poeTextARPG_Final";
const STASH_CAP = 500;
const INVENTORY_CAP = 120;
const CAMPAIGN_COMPLETE_ACT = 10;
const MAX_LEVEL = 100;
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const MAP_CAP = 60;
const BOSS_SPLINTER_COST = 5;

// Map base types (Endgame, droppen ab Akt 10)
const MAP_BASE_TYPES = ["Dunes", "Cemetery", "Strand", "Maze", "Forge", "Temple", "Basilica", "Crater", "Pit", "Tower", "Sepulchre", "Underground River", "Arsenal", "Colosseum", "Foundry"];

// Map-Modifikator-Pool (skaliert mit Tier, wie Affixe bei Items)
const MAP_MOD_POOL = [
  {stat: 'quantity', label: 'Item Quantity', min: 10, max: 80},
  {stat: 'rarity', label: 'Item Rarity', min: 10, max: 50},
  {stat: 'monsterLife', label: 'Monster Leben', min: 20, max: 120},
  {stat: 'monsterDamage', label: 'Monster Schaden', min: 15, max: 90},
  {stat: 'packSize', label: 'Packgröße', min: 10, max: 60}
];

// Rarity colors and weights
const RARITY = {
  normal: {color: '#888888', weight: 60, name: 'Normal'},
  magic: {color: '#8888ff', weight: 25, name: 'Magic'},
  rare: {color: '#ffff00', weight: 10, name: 'Rare'},
  unique: {color: '#ff8800', weight: 5, name: 'Unique'}
};

// Socket colors
const SOCKET_COLORS = {
  red: {color: '#9e3a3a', attr: 'str'},
  green: {color: '#3a9e3a', attr: 'dex'},
  blue: {color: '#3a3a9e', attr: 'int'},
  white: {color: '#ffffff', attr: 'all'}
};

// Icons (Unicode)
const ICONS = {
  str: '💪', dex: '🏹', int: '🧠',
  life: '❤️', mana: '💙', es: '⚡',
  gold: '💰', xp: '✨',
  weapon: '⚔️', armour: '🛡️', accessory: '💍',
  fire: '🔥', cold: '❄️', lightning: '⚡', chaos: '💜',
  gem: '💎', currency: '💰', socket: '◎',
  monster: '👹', boss: '👑', map: '🗺️'
};

// ========== GAME DATA ==========

// Classes
const CLASSES = {
  Marauder: {
    name: "Marauder",
    icon: '💪',
    attr: {str: 34, dex: 14, int: 14},
    ascend: ["Juggernaut", "Berserker", "Chieftain"],
    startNode: "start_marauder",
    gem: "Cleave",
    description: "Starker Nahkämpfer mit hoher Lebenspunktzahl und physischem Schaden."
  },
  Witch: {
    name: "Witch",
    icon: '🧠',
    attr: {str: 14, dex: 14, int: 34},
    ascend: ["Necromancer", "Elementalist", "Occultist"],
    startNode: "start_witch",
    gem: "Fireball",
    description: "Zauberin mit mächtigen Elementarzaubern und hohem Manapool."
  },
  Ranger: {
    name: "Ranger",
    icon: '🏹',
    attr: {str: 14, dex: 34, int: 14},
    ascend: ["Deadeye", "Raider", "Pathfinder"],
    startNode: "start_ranger",
    gem: "Lightning Arrow",
    description: "Schneller Fernkämpfer mit Projektilschaden und Ausweichen."
  },
  Shadow: {
    name: "Shadow",
    icon: '🎭',
    attr: {str: 14, dex: 24, int: 24},
    ascend: ["Assassin", "Saboteur", "Trickster"],
    startNode: "start_shadow",
    gem: "Poison Strike",
    description: "Hybrid-Kämpfer mit kritischen Treffern und Chaosschaden."
  },
  Templar: {
    name: "Templar",
    icon: '⚔️',
    attr: {str: 24, dex: 14, int: 24},
    ascend: ["Inquisitor", "Hierophant", "Guardian"],
    startNode: "start_templar",
    gem: "Arc",
    description: "Ausgewogener Kämpfer mit Stärke und Intelligenz."
  },
  Duelist: {
    name: "Duelist",
    icon: '⚔️',
    attr: {str: 24, dex: 24, int: 14},
    ascend: ["Slayer", "Gladiator", "Champion"],
    startNode: "start_duelist",
    gem: "Cleave",
    description: "Flexibler Nahkämpfer mit Stärke und Geschick."
  },
  Scion: {
    name: "Scion",
    icon: '👑',
    attr: {str: 20, dex: 20, int: 20},
    ascend: ["Ascendant"],
    startNode: "start_scion",
    gem: "Ice Spear",
    description: "Allrounder mit ausgeglichenen Attributen."
  }
};

// Equipment slots
const EQUIPMENT_SLOTS = [
  {id: 'weapon', name: 'Waffe', icon: '⚔️', slot: 'weapon', type: 'weapon'},
  {id: 'chest', name: 'Brustplatte', icon: '🛡️', slot: 'armour', type: 'armour'},
  {id: 'helm', name: 'Helm', icon: '🪖', slot: 'armour', type: 'armour'},
  {id: 'gloves', name: 'Handschuhe', icon: '🧤', slot: 'armour', type: 'armour'},
  {id: 'boots', name: 'Stiefel', icon: '👢', slot: 'armour', type: 'armour'},
  {id: 'ring1', name: 'Ring 1', icon: '💍', slot: 'accessory', type: 'accessory'},
  {id: 'ring2', name: 'Ring 2', icon: '💍', slot: 'accessory', type: 'accessory'},
  {id: 'amulet', name: 'Amulett', icon: '💎', slot: 'accessory', type: 'accessory'},
  {id: 'belt', name: 'Gürtel', icon: '🪢', slot: 'accessory', type: 'accessory'}
];

// Base types for items
const BASE_TYPES = {
  weapon: [
    {name: "Rustic Sword", str: 5, dex: 2, int: 0, damage: 4, speed: 1.0, sockets: 2, hands: 1},
    {name: "Goat's Horn", str: 8, dex: 0, int: 0, damage: 6, speed: 0.9, sockets: 0, hands: 1},
    {name: "Simple Bow", str: 2, dex: 8, int: 0, damage: 5, speed: 1.1, sockets: 0, hands: 2},
    {name: "Driftwood Wand", str: 0, dex: 2, int: 8, damage: 4, speed: 1.0, sockets: 0, hands: 1},
    {name: "Iron Axe", str: 10, dex: 0, int: 0, damage: 7, speed: 0.8, sockets: 2, hands: 1},
    {name: "Jagged Sword", str: 7, dex: 3, int: 0, damage: 5, speed: 1.0, sockets: 1, hands: 1}
  ],
  armour: [
    {name: "Leather Vest", str: 3, dex: 3, int: 0, armour: 15, evasion: 10, sockets: 0},
    {name: "Chainmail", str: 8, dex: 0, int: 0, armour: 30, evasion: 0, sockets: 0},
    {name: "Silk Robe", str: 0, dex: 0, int: 8, armour: 5, es: 20, sockets: 0},
    {name: "Plate Vest", str: 12, dex: 0, int: 0, armour: 40, evasion: 0, sockets: 3},
    {name: "Studded Leather", str: 5, dex: 5, int: 0, armour: 25, evasion: 25, sockets: 2}
  ],
  accessory: [
    {name: "Iron Ring", str: 2, dex: 0, int: 0, life: 5},
    {name: "Sapphire Ring", str: 0, dex: 0, int: 4, mana: 10},
    {name: "Ruby Ring", str: 4, dex: 0, int: 0, fireRes: 10},
    {name: "Topaz Ring", str: 2, dex: 2, int: 0, lightningRes: 10},
    {name: "Leather Belt", str: 3, dex: 3, int: 0, life: 10},
    {name: "Amulet of Power", str: 2, dex: 2, int: 2, allDamage: 5}
  ]
};

// Affixes
const PREFIXES = [
  ["Vital", "life", "Leben", 18, 130, 7],
  ["Flaring", "flatPhys", "Physischer Schaden", 3, 38, 7],
  ["Cruel", "incPhys", "Erhöhter physischer Schaden", 18, 170, 7],
  ["Apprentice's", "spellDamage", "Zauberschaden", 12, 120, 7],
  ["Pyromancer's", "fireDamage", "Feuerschaden", 12, 125, 7],
  ["Cryomancer's", "coldDamage", "Kälteschaden", 12, 125, 7],
  ["Stormcaller's", "lightningDamage", "Blitzschaden", 12, 125, 7],
  ["Toxic", "chaosDamage", "Chaosschaden", 10, 110, 7],
  ["Gladiator's", "armour", "Rüstung", 22, 220, 7],
  ["Fox's", "evasion", "Ausweichen", 22, 220, 7],
  ["Scholar's", "energyShield", "Energieschild", 18, 190, 7],
  ["Commander", "minionDamage", "Dienerschaden", 14, 140, 7],
  ["Tempered", "allDamage", "Globaler Schaden", 8, 85, 7]
];

const SUFFIXES = [
  ["of the Volcano", "fireRes", "Feuerresistenz", 8, 48, 7],
  ["of the Glacier", "coldRes", "Kälteresistenz", 8, 48, 7],
  ["of the Storm", "lightningRes", "Blitzresistenz", 8, 48, 7],
  ["of the Abyss", "chaosRes", "Chaosresistenz", 5, 35, 7],
  ["of Ferocity", "attackSpeed", "Angriffsgeschwindigkeit", 4, 27, 7],
  ["of the Sage", "castSpeed", "Zaubergeschwindigkeit", 4, 27, 7],
  ["of Puncturing", "critChance", "Kritische Trefferchance", 10, 95, 7],
  ["of Ruin", "critMulti", "Kritischer Multiplikator", 8, 65, 7],
  ["of the Lynx", "dex", "Geschick", 8, 52, 7],
  ["of the Bear", "str", "Stärke", 8, 52, 7],
  ["of the Owl", "int", "Intelligenz", 8, 52, 7],
  ["of the Cheetah", "moveSpeed", "Bewegungsgeschwindigkeit", 4, 30, 7],
  ["of Plenty", "itemQuantity", "Item Quantity", 3, 24, 7],
  ["of Treasure", "itemRarity", "Item Rarity", 8, 80, 7]
];

// Skill Gems
const SKILL_GEMS = {
  // Attack Skills
  Cleave: {type: "active", color: "red", tags: ["Attack", "AoE", "Physical", "Melee"], mana: 6, damage: 18, scale: {str: 0.6}, crit: 5, speed: 1.0, icon: '⚔️', description: "Schlägt in einem Bogen vor dir und trifft alle Gegner."},
  Fireball: {type: "active", color: "blue", tags: ["Spell", "Projectile", "Fire"], mana: 8, damage: 20, scale: {int: 0.7}, crit: 6, speed: 0.9, icon: '🔥', description: "Wirft einen Feuerball, der beim Aufprall explodiert."},
  LightningArrow: {type: "active", color: "green", tags: ["Attack", "Projectile", "Lightning", "Bow"], mana: 7, damage: 15, scale: {dex: 0.6}, crit: 7, speed: 1.1, icon: '⚡', description: "Feuert einen Blitzpfeil ab, der Gegner durchschlägt."},
  IceSpear: {type: "active", color: "blue", tags: ["Spell", "Projectile", "Cold"], mana: 9, damage: 16, scale: {int: 0.65}, crit: 8, speed: 1.0, icon: '❄️', description: "Feuert einen Eisspeer, der Gegner durchbohrt."},
  PoisonStrike: {type: "active", color: "green", tags: ["Attack", "Chaos", "Poison", "Melee"], mana: 7, damage: 14, scale: {dex: 0.5, int: 0.2}, crit: 8, speed: 1.1, icon: '💜', description: "Trifft den Gegner und vergiftet ihn."},
  Arc: {type: "active", color: "blue", tags: ["Spell", "Lightning", "Chaining"], mana: 8, damage: 17, scale: {int: 0.6}, crit: 6, speed: 1.05, icon: '⚡', description: "Blitz schlägt zwischen nahen Gegnern ein."},
  Cyclone: {type: "active", color: "red", tags: ["Attack", "AoE", "Physical", "Melee"], mana: 5, damage: 16, scale: {str: 0.5, dex: 0.2}, crit: 5, speed: 1.25, icon: '🌪️', description: "Dreht sich schnell und trifft alle Gegner in der Nähe."},
  SummonSkeletons: {type: "active", color: "blue", tags: ["Spell", "Minion"], mana: 12, damage: 10, scale: {int: 0.4}, crit: 2, speed: 0.8, minion: true, icon: '💀', description: "Beschwört skelettartige Diener, die für dich kämpfen."},

  // Support Gems
  AddedFireDamage: {type: "support", color: "red", tags: ["Fire"], mult: 1.3, mana: 1.2, icon: '🔥', description: "+30% Feuerschaden", text: "+ Feuerschaden"},
  FasterAttacks: {type: "support", color: "green", tags: ["Attack"], speed: 1.35, mana: 1.1, icon: '⚡', description: "+35% Angriffsgeschwindigkeit", text: "+ Angriffsgeschwindigkeit"},
  FasterCasting: {type: "support", color: "blue", tags: ["Spell"], speed: 1.3, mana: 1.1, icon: '🌪️', description: "+30% Zaubergeschwindigkeit", text: "+ Zaubergeschwindigkeit"},
  MultipleProjectiles: {type: "support", color: "green", tags: ["Projectile"], mult: 1.5, mana: 1.4, icon: '🎯', description: "+50% mehr Projektile", text: "+ Projektile"},
  IncreasedCriticalStrikes: {type: "support", color: "blue", tags: ["Attack", "Spell"], crit: 10, mana: 1.2, icon: '💥', description: "+10% kritische Trefferchance", text: "+ Crit Chance"},
  Chain: {type: "support", color: "blue", tags: ["Projectile", "Chaining"], mult: 1.35, mana: 1.3, icon: '🔗', description: "Projektil ketten zu 2 weiteren Gegnern", text: "+ Ketten"},
  Pierce: {type: "support", color: "green", tags: ["Projectile"], mult: 1.2, mana: 1.1, icon: '→', description: "Projektil durchschlägt 2 Gegner", text: "+ Durchschlag"},
  MinionDamage: {type: "support", color: "blue", tags: ["Minion"], mult: 1.4, mana: 1.2, icon: '💀', description: "+40% Dienerschaden", text: "+ Dienerschaden"},
  LifeLeech: {type: "support", color: "red", tags: ["Attack", "Spell"], leech: 0.02, mana: 1.1, icon: '❤️', description: "2% des Schadens als Lebensraub", text: "+ Lebensraub"},
  ManaLeech: {type: "support", color: "blue", tags: ["Attack", "Spell"], leech: 0.01, mana: 1.1, icon: '💙', description: "1% des Schadens als Manarub", text: "+ Manarub"}
};

// Passive Tree Nodes (auto-generated, hand-tuned)
const PASSIVE_TREE = {
  start_marauder: {name: "Stärke", type: "start", attrs: {str: 10}, icon: '💪', class: 'Marauder', t: 0, ring: 0, description: "Startknoten für Marauder"},
  mar_wucht_r1: {name: "+15 Stärke", type: "normal", attrs: {str: 15}, icon: '💪', class: 'Marauder', t: -1, ring: 1, description: "+15 Stärke"},
  mar_wucht_r2: {name: "+14% Phys. Schaden", type: "normal", attrs: {incPhys: 14}, icon: '⚔️', class: 'Marauder', t: -1, ring: 2, description: "+14% Phys. Schaden"},
  mar_wucht_r3: {name: "Zermalmer", type: "notable", attrs: {incPhys: 24, str: 12}, icon: '🔨', class: 'Marauder', t: -1, ring: 3, description: "Brachiale Wucht hinter jedem Schlag. +24% physischer Schaden, +12 Stärke"},
  mar_wucht_r4: {name: "+20% Angriffsgeschwindigkeit", type: "normal", attrs: {attackSpeed: 20}, icon: '⚡', class: 'Marauder', t: -1, ring: 4, description: "+20% Angriffsgeschwindigkeit"},
  mar_wucht_r5: {name: "Verheerung", type: "keystone", attrs: {incPhys: 40, critMulti: 0.25, evasion: -15}, icon: '💢', class: 'Marauder', t: -1, ring: 5, description: "Reine zerstörerische Kraft. +40% physischer Schaden, +0.25x Krit-Multi, -15% Ausweichen"},
  mar_robust_r1: {name: "+18 Leben", type: "normal", attrs: {life: 18}, icon: '❤️', class: 'Marauder', t: -0.5, ring: 1, description: "+18 Leben"},
  mar_robust_r2: {name: "+22 Rüstung", type: "normal", attrs: {armour: 22}, icon: '🛡️', class: 'Marauder', t: -0.5, ring: 2, description: "+22 Rüstung"},
  mar_robust_r3: {name: "Bollwerk", type: "notable", attrs: {life: 25, armour: 35}, icon: '🛡️', class: 'Marauder', t: -0.5, ring: 3, description: "Ein wandelnder Schutzwall. +25 Leben, +35 Rüstung"},
  mar_robust_r4: {name: "+12% Leben", type: "normal", attrs: {lifePct: 12}, icon: '❤️', class: 'Marauder', t: -0.5, ring: 4, description: "+12% Leben"},
  mar_robust_r5: {name: "Eiserne Haut", type: "keystone", attrs: {armour: 60, life: 40, cannotBeStunned: true}, icon: '🛡️', class: 'Marauder', t: -0.5, ring: 5, description: "Eine Mauer aus Stahl und Narben. +60 Rüstung, +40 Leben, Immun gegen Betäubung"},
  mar_zaeh_r1: {name: "+15 Stärke", type: "normal", attrs: {str: 15}, icon: '💪', class: 'Marauder', t: 0, ring: 1, description: "+15 Stärke"},
  mar_zaeh_r2: {name: "+10% Lebensregeneration", type: "normal", attrs: {lifeRegen: 10}, icon: '❤️', class: 'Marauder', t: 0, ring: 2, description: "+10% Lebensregeneration"},
  mar_zaeh_r3: {name: "Unermüdlich", type: "notable", attrs: {lifeRegen: 18, life: 20}, icon: '❤️', class: 'Marauder', t: 0, ring: 3, description: "Wunden heilen, ehe sie zählen. +18% Lebensregeneration, +20 Leben"},
  mar_zaeh_r4: {name: "+15 Rüstung", type: "normal", attrs: {armour: 15}, icon: '🛡️', class: 'Marauder', t: 0, ring: 4, description: "+15 Rüstung"},
  mar_wild_r1: {name: "+10% Angriffsgeschwindigkeit", type: "normal", attrs: {attackSpeed: 10}, icon: '⚡', class: 'Marauder', t: 0.5, ring: 1, description: "+10% Angriffsgeschwindigkeit"},
  mar_wild_r2: {name: "+8% Kritische Trefferchance", type: "normal", attrs: {critChance: 8}, icon: '💥', class: 'Marauder', t: 0.5, ring: 2, description: "+8% Kritische Trefferchance"},
  mar_wild_r3: {name: "Blutrausch", type: "notable", attrs: {critChance: 12, incPhys: 15}, icon: '💥', class: 'Marauder', t: 0.5, ring: 3, description: "Der Geruch von Blut treibt dich an. +12% Krit-Chance, +15% physischer Schaden"},
  mar_wild_r4: {name: "+0.3x Krit-Multiplikator", type: "normal", attrs: {critMulti: 0.3}, icon: '💥', class: 'Marauder', t: 0.5, ring: 4, description: "+0.3x Krit-Multiplikator"},
  mar_krieg_r1: {name: "+12 Stärke", type: "normal", attrs: {str: 12}, icon: '💪', class: 'Marauder', t: 1, ring: 1, description: "+12 Stärke"},
  mar_krieg_r2: {name: "+15 Leben", type: "normal", attrs: {life: 15}, icon: '❤️', class: 'Marauder', t: 1, ring: 2, description: "+15 Leben"},
  mar_krieg_r3: {name: "Eiserner Wille", type: "notable", attrs: {str: 18, life: 15}, icon: '💪', class: 'Marauder', t: 1, ring: 3, description: "Unbeugsame Entschlossenheit. +18 Stärke, +15 Leben"},
  start_witch: {name: "Intelligenz", type: "start", attrs: {int: 10}, icon: '🧠', class: 'Witch', t: 0, ring: 0, description: "Startknoten für Witch"},
  wit_elem_r1: {name: "+15 Intelligenz", type: "normal", attrs: {int: 15}, icon: '🧠', class: 'Witch', t: -1, ring: 1, description: "+15 Intelligenz"},
  wit_elem_r2: {name: "+16% Elementarschaden", type: "normal", attrs: {elementalDamage: 16}, icon: '🔥', class: 'Witch', t: -1, ring: 2, description: "+16% Elementarschaden"},
  wit_elem_r3: {name: "Brandstifterin", type: "notable", attrs: {fireDamage: 22, elementalDamage: 10}, icon: '🔥', class: 'Witch', t: -1, ring: 3, description: "Lass die Welt brennen. +22% Feuerschaden, +10% Elementarschaden"},
  wit_elem_r4: {name: "+18% Zaubergeschwindigkeit", type: "normal", attrs: {castSpeed: 18}, icon: '🌪️', class: 'Witch', t: -1, ring: 4, description: "+18% Zaubergeschwindigkeit"},
  wit_elem_r5: {name: "Inferno-Seele", type: "keystone", attrs: {fireDamage: 40, elementalDamage: 15, coldRes: -15}, icon: '🔥', class: 'Witch', t: -1, ring: 5, description: "Dein Körper selbst wird zur Flamme. +40% Feuerschaden, +15% Elementarschaden, -15% Kälteresistenz"},
  wit_mana_r1: {name: "+18 Mana", type: "normal", attrs: {mana: 18}, icon: '💙', class: 'Witch', t: -0.5, ring: 1, description: "+18 Mana"},
  wit_mana_r2: {name: "+12% Manaregeneration", type: "normal", attrs: {manaRegen: 12}, icon: '💙', class: 'Witch', t: -0.5, ring: 2, description: "+12% Manaregeneration"},
  wit_mana_r3: {name: "Quelle der Macht", type: "notable", attrs: {mana: 30, manaRegen: 15}, icon: '💙', class: 'Witch', t: -0.5, ring: 3, description: "Ein nie versiegender Brunnen. +30 Mana, +15% Manaregeneration"},
  wit_mana_r4: {name: "+10% Mana", type: "normal", attrs: {manaPct: 10}, icon: '💙', class: 'Witch', t: -0.5, ring: 4, description: "+10% Mana"},
  wit_mana_r5: {name: "Arkaner Überfluss", type: "keystone", attrs: {mana: 60, spellDamage: 25, manaRegen: 20}, icon: '💡', class: 'Witch', t: -0.5, ring: 5, description: "Macht ohne Grenzen. +60 Mana, +25% Zauberschaden, +20% Manaregeneration"},
  wit_geist_r1: {name: "+15 Intelligenz", type: "normal", attrs: {int: 15}, icon: '🧠', class: 'Witch', t: 0, ring: 1, description: "+15 Intelligenz"},
  wit_geist_r2: {name: "+8% Kritische Trefferchance", type: "normal", attrs: {critChance: 8}, icon: '💥', class: 'Witch', t: 0, ring: 2, description: "+8% Kritische Trefferchance"},
  wit_geist_r3: {name: "Scharfsinn", type: "notable", attrs: {critChance: 14, spellDamage: 12}, icon: '💥', class: 'Witch', t: 0, ring: 3, description: "Jeder Zauber ein Skalpell. +14% Krit-Chance, +12% Zauberschaden"},
  wit_geist_r4: {name: "+0.3x Krit-Multiplikator", type: "normal", attrs: {critMulti: 0.3}, icon: '💥', class: 'Witch', t: 0, ring: 4, description: "+0.3x Krit-Multiplikator"},
  wit_diener_r1: {name: "+12 Intelligenz", type: "normal", attrs: {int: 12}, icon: '🧠', class: 'Witch', t: 0.5, ring: 1, description: "+12 Intelligenz"},
  wit_diener_r2: {name: "+20% Dienerschaden", type: "normal", attrs: {minionDamage: 20}, icon: '💀', class: 'Witch', t: 0.5, ring: 2, description: "+20% Dienerschaden"},
  wit_diener_r3: {name: "Nekromantenpakt", type: "notable", attrs: {minionDamage: 30, mana: 20}, icon: '💀', class: 'Witch', t: 0.5, ring: 3, description: "Die Toten dienen dir treu. +30% Dienerschaden, +20 Mana"},
  wit_diener_r4: {name: "+15% Dienerschaden", type: "normal", attrs: {minionDamage: 15}, icon: '💀', class: 'Witch', t: 0.5, ring: 4, description: "+15% Dienerschaden"},
  wit_frost_r1: {name: "+12 Intelligenz", type: "normal", attrs: {int: 12}, icon: '🧠', class: 'Witch', t: 1, ring: 1, description: "+12 Intelligenz"},
  wit_frost_r2: {name: "+14% Kälteschaden", type: "normal", attrs: {coldDamage: 14}, icon: '❄️', class: 'Witch', t: 1, ring: 2, description: "+14% Kälteschaden"},
  wit_frost_r3: {name: "Frostbann", type: "notable", attrs: {coldDamage: 20, critChance: 6}, icon: '❄️', class: 'Witch', t: 1, ring: 3, description: "Eisige Ruhe vor dem Sturm. +20% Kälteschaden, +6% Krit-Chance"},
  start_ranger: {name: "Geschick", type: "start", attrs: {dex: 10}, icon: '🏹', class: 'Ranger', t: 0, ring: 0, description: "Startknoten für Ranger"},
  ran_praez_r1: {name: "+15 Geschick", type: "normal", attrs: {dex: 15}, icon: '🏹', class: 'Ranger', t: -1, ring: 1, description: "+15 Geschick"},
  ran_praez_r2: {name: "+16% Projektilschaden", type: "normal", attrs: {projectileDamage: 16}, icon: '🎯', class: 'Ranger', t: -1, ring: 2, description: "+16% Projektilschaden"},
  ran_praez_r3: {name: "Scharfes Auge", type: "notable", attrs: {projectileDamage: 24, critChance: 8}, icon: '🎯', class: 'Ranger', t: -1, ring: 3, description: "Kein Ziel entkommt. +24% Projektilschaden, +8% Krit-Chance"},
  ran_praez_r4: {name: "+18% Angriffsgeschwindigkeit", type: "normal", attrs: {attackSpeed: 18}, icon: '⚡', class: 'Ranger', t: -1, ring: 4, description: "+18% Angriffsgeschwindigkeit"},
  ran_praez_r5: {name: "Tödliche Präzision", type: "keystone", attrs: {projectileDamage: 40, critMulti: 0.3, armour: -20}, icon: '🎯', class: 'Ranger', t: -1, ring: 5, description: "Jeder Schuss ein Todesurteil. +40% Projektilschaden, +0.3x Krit-Multi, -20 Rüstung"},
  ran_wendig_r1: {name: "+18% Ausweichen", type: "normal", attrs: {evasion: 18}, icon: '🏃', class: 'Ranger', t: -0.5, ring: 1, description: "+18% Ausweichen"},
  ran_wendig_r2: {name: "+12% Bewegungsgeschwindigkeit", type: "normal", attrs: {moveSpeed: 12}, icon: '🏃', class: 'Ranger', t: -0.5, ring: 2, description: "+12% Bewegungsgeschwindigkeit"},
  ran_wendig_r3: {name: "Geist des Windes", type: "notable", attrs: {evasion: 25, moveSpeed: 15}, icon: '🏃', class: 'Ranger', t: -0.5, ring: 3, description: "Schneller als das Auge folgen kann. +25% Ausweichen, +15% Bewegungsgeschwindigkeit"},
  ran_wendig_r4: {name: "+15% Ausweichen", type: "normal", attrs: {evasion: 15}, icon: '🏃', class: 'Ranger', t: -0.5, ring: 4, description: "+15% Ausweichen"},
  ran_wendig_r5: {name: "Phantomschritt", type: "keystone", attrs: {evasion: 45, moveSpeed: 20, cannotBeSlowed: true}, icon: '🏃', class: 'Ranger', t: -0.5, ring: 5, description: "Ein Schatten im Wind. +45% Ausweichen, +20% Bewegungsgeschwindigkeit, Immun gegen Verlangsamung"},
  ran_tanz_r1: {name: "+15 Geschick", type: "normal", attrs: {dex: 15}, icon: '🏹', class: 'Ranger', t: 0, ring: 1, description: "+15 Geschick"},
  ran_tanz_r2: {name: "+14% Angriffsgeschwindigkeit", type: "normal", attrs: {attackSpeed: 14}, icon: '⚡', class: 'Ranger', t: 0, ring: 2, description: "+14% Angriffsgeschwindigkeit"},
  ran_tanz_r3: {name: "Wirbelwind", type: "notable", attrs: {attackSpeed: 20, evasion: 10}, icon: '🌪️', class: 'Ranger', t: 0, ring: 3, description: "Stahl im Sturm. +20% Angriffsgeschwindigkeit, +10% Ausweichen"},
  ran_tanz_r4: {name: "+8% Kritische Trefferchance", type: "normal", attrs: {critChance: 8}, icon: '💥', class: 'Ranger', t: 0, ring: 4, description: "+8% Kritische Trefferchance"},
  ran_fallen_r1: {name: "+12 Geschick", type: "normal", attrs: {dex: 12}, icon: '🏹', class: 'Ranger', t: 0.5, ring: 1, description: "+12 Geschick"},
  ran_fallen_r2: {name: "+15% Chaosschaden", type: "normal", attrs: {chaosDamage: 15}, icon: '💜', class: 'Ranger', t: 0.5, ring: 2, description: "+15% Chaosschaden"},
  ran_fallen_r3: {name: "Giftmischer", type: "notable", attrs: {chaosDamage: 24, critChance: 6}, icon: '💜', class: 'Ranger', t: 0.5, ring: 3, description: "Langsamer Tod im Grünen. +24% Chaosschaden, +6% Krit-Chance"},
  ran_fallen_r4: {name: "+12% Chaosschaden", type: "normal", attrs: {chaosDamage: 12}, icon: '💜', class: 'Ranger', t: 0.5, ring: 4, description: "+12% Chaosschaden"},
  ran_adler_r1: {name: "+12 Geschick", type: "normal", attrs: {dex: 12}, icon: '🏹', class: 'Ranger', t: 1, ring: 1, description: "+12 Geschick"},
  ran_adler_r2: {name: "+10% Item Rarity", type: "normal", attrs: {itemRarity: 10}, icon: '💰', class: 'Ranger', t: 1, ring: 2, description: "+10% Item Rarity"},
  ran_adler_r3: {name: "Jägerin", type: "notable", attrs: {itemRarity: 18, dex: 15}, icon: '🏹', class: 'Ranger', t: 1, ring: 3, description: "Ihr Blick verfehlt nichts, weder Beute noch Feind. +18% Item Rarity, +15 Geschick"},
  start_shadow: {name: "Hybrid", type: "start", attrs: {dex: 5, int: 5}, icon: '🎭', class: 'Shadow', t: 0, ring: 0, description: "Startknoten für Shadow"},
  sha_meuch_r1: {name: "+10 Geschick", type: "normal", attrs: {dex: 10}, icon: '🏹', class: 'Shadow', t: -0.6, ring: 1, description: "+10 Geschick"},
  sha_meuch_r2: {name: "+10 Intelligenz", type: "normal", attrs: {int: 10}, icon: '🧠', class: 'Shadow', t: -0.6, ring: 2, description: "+10 Intelligenz"},
  sha_meuch_r3: {name: "Schattenklinge", type: "notable", attrs: {critChance: 10, chaosDamage: 14}, icon: '🗡️', class: 'Shadow', t: -0.6, ring: 3, description: "Aus dem Dunkel, ohne Vorwarnung. +10% Krit-Chance, +14% Chaosschaden"},
  sha_meuch_r4: {name: "+10% Angriffsgeschwindigkeit", type: "normal", attrs: {attackSpeed: 10}, icon: '⚡', class: 'Shadow', t: -0.6, ring: 4, description: "+10% Angriffsgeschwindigkeit"},
  sha_meuch_r5: {name: "Meister-Assassine", type: "keystone", attrs: {critChance: 18, critMulti: 0.4, chaosDamage: 20}, icon: '🗡️', class: 'Shadow', t: -0.6, ring: 5, description: "Ein Hauch, dann Stille. +18% Krit-Chance, +0.4x Krit-Multi, +20% Chaosschaden"},
  sha_gift_r1: {name: "+10% Chaosschaden", type: "normal", attrs: {chaosDamage: 10}, icon: '💜', class: 'Shadow', t: 0.6, ring: 1, description: "+10% Chaosschaden"},
  sha_gift_r2: {name: "+8% Kritische Trefferchance", type: "normal", attrs: {critChance: 8}, icon: '💥', class: 'Shadow', t: 0.6, ring: 2, description: "+8% Kritische Trefferchance"},
  sha_gift_r3: {name: "Heimtückisch", type: "notable", attrs: {chaosDamage: 18, critChance: 8}, icon: '💜', class: 'Shadow', t: 0.6, ring: 3, description: "Was nicht sofort tötet, zersetzt. +18% Chaosschaden, +8% Krit-Chance"},
  sha_gift_r4: {name: "+12% Ausweichen", type: "normal", attrs: {evasion: 12}, icon: '🏃', class: 'Shadow', t: 0.6, ring: 4, description: "+12% Ausweichen"},
  sha_doppel_r1: {name: "+8 Geschick, +8 Intelligenz", type: "normal", attrs: {dex: 8, int: 8}, icon: '🎭', class: 'Shadow', t: 0, ring: 1, description: "+8 Geschick, +8 Intelligenz"},
  sha_doppel_r2: {name: "Doppelgesicht", type: "notable", attrs: {dex: 12, int: 12, evasion: 10}, icon: '🎭', class: 'Shadow', t: 0, ring: 2, description: "Weder Krieger noch Magier - beides. +12 Geschick, +12 Intelligenz, +10% Ausweichen"},
  start_templar: {name: "Ausgewogen", type: "start", attrs: {str: 5, int: 5}, icon: '⚔️', class: 'Templar', t: 0, ring: 0, description: "Startknoten für Templar"},
  tem_priest_r1: {name: "+10 Stärke", type: "normal", attrs: {str: 10}, icon: '💪', class: 'Templar', t: -0.6, ring: 1, description: "+10 Stärke"},
  tem_priest_r2: {name: "+10 Intelligenz", type: "normal", attrs: {int: 10}, icon: '🧠', class: 'Templar', t: -0.6, ring: 2, description: "+10 Intelligenz"},
  tem_priest_r3: {name: "Geweihte Klinge", type: "notable", attrs: {elementalDamage: 16, incPhys: 10}, icon: '⚔️', class: 'Templar', t: -0.6, ring: 3, description: "Stahl, gesegnet mit Feuer. +16% Elementarschaden, +10% physischer Schaden"},
  tem_priest_r4: {name: "+12% Leben", type: "normal", attrs: {lifePct: 12}, icon: '❤️', class: 'Templar', t: -0.6, ring: 4, description: "+12% Leben"},
  tem_priest_r5: {name: "Flammenbund", type: "keystone", attrs: {fireDamage: 25, armour: 25, mana: 20}, icon: '🔥', class: 'Templar', t: -0.6, ring: 5, description: "Glaube und Feuer vereint. +25% Feuerschaden, +25 Rüstung, +20 Mana"},
  tem_stand_r1: {name: "+15 Leben", type: "normal", attrs: {life: 15}, icon: '❤️', class: 'Templar', t: 0.6, ring: 1, description: "+15 Leben"},
  tem_stand_r2: {name: "+15 Mana", type: "normal", attrs: {mana: 15}, icon: '💙', class: 'Templar', t: 0.6, ring: 2, description: "+15 Mana"},
  tem_stand_r3: {name: "Gesegnet", type: "notable", attrs: {life: 20, mana: 20, allRes: 8}, icon: '✨', class: 'Templar', t: 0.6, ring: 3, description: "Unter göttlichem Schutz. +20 Leben, +20 Mana, +8% alle Resistenzen"},
  tem_stand_r4: {name: "+10% Manaregeneration", type: "normal", attrs: {manaRegen: 10}, icon: '💙', class: 'Templar', t: 0.6, ring: 4, description: "+10% Manaregeneration"},
  tem_wacht_r1: {name: "+8 Stärke, +8 Intelligenz", type: "normal", attrs: {str: 8, int: 8}, icon: '⚔️', class: 'Templar', t: 0, ring: 1, description: "+8 Stärke, +8 Intelligenz"},
  tem_wacht_r2: {name: "Tempelwächter", type: "notable", attrs: {armour: 20, spellDamage: 12}, icon: '🛡️', class: 'Templar', t: 0, ring: 2, description: "Hüter heiliger Hallen. +20 Rüstung, +12% Zauberschaden"},
  start_duelist: {name: "Kämpfer", type: "start", attrs: {str: 5, dex: 5}, icon: '⚔️', class: 'Duelist', t: 0, ring: 0, description: "Startknoten für Duelist"},
  due_tanz_r1: {name: "+10 Stärke", type: "normal", attrs: {str: 10}, icon: '💪', class: 'Duelist', t: -0.6, ring: 1, description: "+10 Stärke"},
  due_tanz_r2: {name: "+10 Geschick", type: "normal", attrs: {dex: 10}, icon: '🏹', class: 'Duelist', t: -0.6, ring: 2, description: "+10 Geschick"},
  due_tanz_r3: {name: "Wirbelklinge", type: "notable", attrs: {attackSpeed: 16, incPhys: 12}, icon: '🗡️', class: 'Duelist', t: -0.6, ring: 3, description: "Stahl, der niemals ruht. +16% Angriffsgeschwindigkeit, +12% physischer Schaden"},
  due_tanz_r4: {name: "+10% Kritische Trefferchance", type: "normal", attrs: {critChance: 10}, icon: '💥', class: 'Duelist', t: -0.6, ring: 4, description: "+10% Kritische Trefferchance"},
  due_tanz_r5: {name: "Blutiger Tanz", type: "keystone", attrs: {attackSpeed: 22, incPhys: 22, life: -20}, icon: '🩸', class: 'Duelist', t: -0.6, ring: 5, description: "Tanz mit dem Tod selbst. +22% Angriffsgeschwindigkeit, +22% physischer Schaden, -20 Leben"},
  due_kampf_r1: {name: "+15 Leben", type: "normal", attrs: {life: 15}, icon: '❤️', class: 'Duelist', t: 0.6, ring: 1, description: "+15 Leben"},
  due_kampf_r2: {name: "+15 Rüstung", type: "normal", attrs: {armour: 15}, icon: '🛡️', class: 'Duelist', t: 0.6, ring: 2, description: "+15 Rüstung"},
  due_kampf_r3: {name: "Unbeugsam", type: "notable", attrs: {life: 20, armour: 20}, icon: '🛡️', class: 'Duelist', t: 0.6, ring: 3, description: "Steht, wo andere fallen. +20 Leben, +20 Rüstung"},
  due_kampf_r4: {name: "+10% Ausweichen", type: "normal", attrs: {evasion: 10}, icon: '🏃', class: 'Duelist', t: 0.6, ring: 4, description: "+10% Ausweichen"},
  due_glad_r1: {name: "+8 Stärke, +8 Geschick", type: "normal", attrs: {str: 8, dex: 8}, icon: '⚔️', class: 'Duelist', t: 0, ring: 1, description: "+8 Stärke, +8 Geschick"},
  due_glad_r2: {name: "Gladiator", type: "notable", attrs: {incPhys: 14, evasion: 10}, icon: '⚔️', class: 'Duelist', t: 0, ring: 2, description: "Geboren für die Arena. +14% physischer Schaden, +10% Ausweichen"},
  start_scion: {name: "Allrounder", type: "start", attrs: {str: 3, dex: 3, int: 3}, icon: '👑', class: 'Scion', t: 0, ring: 0, description: "Startknoten für Scion"},
  hub_h1: {name: "Vielseitigkeit", type: "normal", attrs: {str: 5, dex: 5, int: 5}, icon: '🌟', class: 'all', t: 0, ring: 1, description: "+5 Stärke, Geschick und Intelligenz"},
  hub_h2: {name: "+10% Leben", type: "normal", attrs: {lifePct: 10}, icon: '❤️', class: 'all', t: 0.1, ring: 1, description: "+10% maximale Lebenspunkte"},
  hub_h3: {name: "+8% Globaler Schaden", type: "normal", attrs: {allDamage: 8}, icon: '⚔️', class: 'all', t: 0.2, ring: 1, description: "+8% globaler Schaden"},
  hub_h4: {name: "+8% Alle Resistenzen", type: "normal", attrs: {allRes: 8}, icon: '🛡️', class: 'all', t: 0.3, ring: 1, description: "+8% alle Elementarresistenzen"},
  hub_h5: {name: "+10% Ausweichen", type: "normal", attrs: {evasion: 10}, icon: '🏃', class: 'all', t: 0.4, ring: 1, description: "+10% Ausweichchance"},
  hub_h6: {name: "+15 Rüstung", type: "normal", attrs: {armour: 15}, icon: '🛡️', class: 'all', t: 0.5, ring: 1, description: "+15 Rüstung"},
  hub_h7: {name: "+10% Manaregeneration", type: "normal", attrs: {manaRegen: 10}, icon: '💙', class: 'all', t: 0.6, ring: 1, description: "+10% Manaregeneration"},
  hub_h8: {name: "+10% Item Rarity", type: "normal", attrs: {itemRarity: 10}, icon: '💰', class: 'all', t: 0.7, ring: 1, description: "+10% Item Rarity"},
  hub_h9: {name: "+10% Lebensregeneration", type: "normal", attrs: {lifeRegen: 10}, icon: '❤️', class: 'all', t: 0.8, ring: 1, description: "+10% Lebensregeneration"},
  hub_h10: {name: "+8% Chaosresistenz", type: "normal", attrs: {chaosRes: 8}, icon: '💜', class: 'all', t: 0.9, ring: 1, description: "+8% Chaosresistenz"},
  hub_notable1: {name: "Allrounder", type: "notable", attrs: {str: 10, dex: 10, int: 10, life: 20}, icon: '🌟', class: 'all', t: 0, ring: 2, description: "+10 alle Attribute, +20 Leben"},
  hub_notable2: {name: "Vollendung", type: "notable", attrs: {allDamage: 12, lifePct: 8, allRes: 8}, icon: '🌟', class: 'all', t: 0.2, ring: 2, description: "+12% Schaden, +8% Leben, +8% alle Resistenzen"},
  hub_notable3: {name: "Schatzsucher", type: "notable", attrs: {itemRarity: 20, itemQuantity: 15}, icon: '💰', class: 'all', t: 0.7, ring: 2, description: "Das Glück begünstigt die Mutigen. +20% Item Rarity, +15% Item Quantity"},
  hub_notable4: {name: "Wächter des Gleichgewichts", type: "notable", attrs: {armour: 20, evasion: 20, allRes: 5}, icon: '⚖️', class: 'all', t: 0.5, ring: 2, description: "Weder zu hart noch zu flink - perfekt im Gleichgewicht. +20 Rüstung, +20% Ausweichen, +5% alle Resistenzen"},
  hub_keystone1: {name: "Vollkommenheit", type: "keystone", attrs: {str: 15, dex: 15, int: 15, allDamage: 20, lifePct: 15}, icon: '👑', class: 'all', t: 0, ring: 3, description: "+15 alle Attribute, +20% Schaden, +15% Leben"},
  hub_keystone2: {name: "Schicksalswende", type: "keystone", attrs: {critChance: 15, critMulti: 0.3, allDamage: 10, life: -15}, icon: '🎲', class: 'all', t: 0.2, ring: 3, description: "Alles auf eine Karte. +15% Krit-Chance, +0.3x Krit-Multi, +10% Schaden, -15 Leben"}
};

// Tree connections
const PASSIVE_TREE_CONNECTIONS = [
  {from: 'start_marauder', to: 'mar_wucht_r1'},
  {from: 'mar_wucht_r1', to: 'mar_wucht_r2'},
  {from: 'mar_wucht_r2', to: 'mar_wucht_r3'},
  {from: 'mar_wucht_r3', to: 'mar_wucht_r4'},
  {from: 'mar_wucht_r4', to: 'mar_wucht_r5'},
  {from: 'start_marauder', to: 'mar_robust_r1'},
  {from: 'mar_robust_r1', to: 'mar_robust_r2'},
  {from: 'mar_robust_r2', to: 'mar_robust_r3'},
  {from: 'mar_robust_r3', to: 'mar_robust_r4'},
  {from: 'mar_robust_r4', to: 'mar_robust_r5'},
  {from: 'start_marauder', to: 'mar_zaeh_r1'},
  {from: 'mar_zaeh_r1', to: 'mar_zaeh_r2'},
  {from: 'mar_zaeh_r2', to: 'mar_zaeh_r3'},
  {from: 'mar_zaeh_r3', to: 'mar_zaeh_r4'},
  {from: 'start_marauder', to: 'mar_wild_r1'},
  {from: 'mar_wild_r1', to: 'mar_wild_r2'},
  {from: 'mar_wild_r2', to: 'mar_wild_r3'},
  {from: 'mar_wild_r3', to: 'mar_wild_r4'},
  {from: 'start_marauder', to: 'mar_krieg_r1'},
  {from: 'mar_krieg_r1', to: 'mar_krieg_r2'},
  {from: 'mar_krieg_r2', to: 'mar_krieg_r3'},
  {from: 'start_witch', to: 'wit_elem_r1'},
  {from: 'wit_elem_r1', to: 'wit_elem_r2'},
  {from: 'wit_elem_r2', to: 'wit_elem_r3'},
  {from: 'wit_elem_r3', to: 'wit_elem_r4'},
  {from: 'wit_elem_r4', to: 'wit_elem_r5'},
  {from: 'start_witch', to: 'wit_mana_r1'},
  {from: 'wit_mana_r1', to: 'wit_mana_r2'},
  {from: 'wit_mana_r2', to: 'wit_mana_r3'},
  {from: 'wit_mana_r3', to: 'wit_mana_r4'},
  {from: 'wit_mana_r4', to: 'wit_mana_r5'},
  {from: 'start_witch', to: 'wit_geist_r1'},
  {from: 'wit_geist_r1', to: 'wit_geist_r2'},
  {from: 'wit_geist_r2', to: 'wit_geist_r3'},
  {from: 'wit_geist_r3', to: 'wit_geist_r4'},
  {from: 'start_witch', to: 'wit_diener_r1'},
  {from: 'wit_diener_r1', to: 'wit_diener_r2'},
  {from: 'wit_diener_r2', to: 'wit_diener_r3'},
  {from: 'wit_diener_r3', to: 'wit_diener_r4'},
  {from: 'start_witch', to: 'wit_frost_r1'},
  {from: 'wit_frost_r1', to: 'wit_frost_r2'},
  {from: 'wit_frost_r2', to: 'wit_frost_r3'},
  {from: 'start_ranger', to: 'ran_praez_r1'},
  {from: 'ran_praez_r1', to: 'ran_praez_r2'},
  {from: 'ran_praez_r2', to: 'ran_praez_r3'},
  {from: 'ran_praez_r3', to: 'ran_praez_r4'},
  {from: 'ran_praez_r4', to: 'ran_praez_r5'},
  {from: 'start_ranger', to: 'ran_wendig_r1'},
  {from: 'ran_wendig_r1', to: 'ran_wendig_r2'},
  {from: 'ran_wendig_r2', to: 'ran_wendig_r3'},
  {from: 'ran_wendig_r3', to: 'ran_wendig_r4'},
  {from: 'ran_wendig_r4', to: 'ran_wendig_r5'},
  {from: 'start_ranger', to: 'ran_tanz_r1'},
  {from: 'ran_tanz_r1', to: 'ran_tanz_r2'},
  {from: 'ran_tanz_r2', to: 'ran_tanz_r3'},
  {from: 'ran_tanz_r3', to: 'ran_tanz_r4'},
  {from: 'start_ranger', to: 'ran_fallen_r1'},
  {from: 'ran_fallen_r1', to: 'ran_fallen_r2'},
  {from: 'ran_fallen_r2', to: 'ran_fallen_r3'},
  {from: 'ran_fallen_r3', to: 'ran_fallen_r4'},
  {from: 'start_ranger', to: 'ran_adler_r1'},
  {from: 'ran_adler_r1', to: 'ran_adler_r2'},
  {from: 'ran_adler_r2', to: 'ran_adler_r3'},
  {from: 'start_shadow', to: 'sha_meuch_r1'},
  {from: 'sha_meuch_r1', to: 'sha_meuch_r2'},
  {from: 'sha_meuch_r2', to: 'sha_meuch_r3'},
  {from: 'sha_meuch_r3', to: 'sha_meuch_r4'},
  {from: 'sha_meuch_r4', to: 'sha_meuch_r5'},
  {from: 'start_shadow', to: 'sha_gift_r1'},
  {from: 'sha_gift_r1', to: 'sha_gift_r2'},
  {from: 'sha_gift_r2', to: 'sha_gift_r3'},
  {from: 'sha_gift_r3', to: 'sha_gift_r4'},
  {from: 'start_shadow', to: 'sha_doppel_r1'},
  {from: 'sha_doppel_r1', to: 'sha_doppel_r2'},
  {from: 'start_templar', to: 'tem_priest_r1'},
  {from: 'tem_priest_r1', to: 'tem_priest_r2'},
  {from: 'tem_priest_r2', to: 'tem_priest_r3'},
  {from: 'tem_priest_r3', to: 'tem_priest_r4'},
  {from: 'tem_priest_r4', to: 'tem_priest_r5'},
  {from: 'start_templar', to: 'tem_stand_r1'},
  {from: 'tem_stand_r1', to: 'tem_stand_r2'},
  {from: 'tem_stand_r2', to: 'tem_stand_r3'},
  {from: 'tem_stand_r3', to: 'tem_stand_r4'},
  {from: 'start_templar', to: 'tem_wacht_r1'},
  {from: 'tem_wacht_r1', to: 'tem_wacht_r2'},
  {from: 'start_duelist', to: 'due_tanz_r1'},
  {from: 'due_tanz_r1', to: 'due_tanz_r2'},
  {from: 'due_tanz_r2', to: 'due_tanz_r3'},
  {from: 'due_tanz_r3', to: 'due_tanz_r4'},
  {from: 'due_tanz_r4', to: 'due_tanz_r5'},
  {from: 'start_duelist', to: 'due_kampf_r1'},
  {from: 'due_kampf_r1', to: 'due_kampf_r2'},
  {from: 'due_kampf_r2', to: 'due_kampf_r3'},
  {from: 'due_kampf_r3', to: 'due_kampf_r4'},
  {from: 'start_duelist', to: 'due_glad_r1'},
  {from: 'due_glad_r1', to: 'due_glad_r2'},
  {from: 'start_scion', to: 'hub_h1'},
  {from: 'hub_h1', to: 'hub_h2'},
  {from: 'hub_h2', to: 'hub_h3'},
  {from: 'hub_h3', to: 'hub_h4'},
  {from: 'hub_h4', to: 'hub_h5'},
  {from: 'hub_h5', to: 'hub_h6'},
  {from: 'hub_h6', to: 'hub_h7'},
  {from: 'hub_h7', to: 'hub_h8'},
  {from: 'hub_h8', to: 'hub_h9'},
  {from: 'hub_h9', to: 'hub_h10'},
  {from: 'hub_h10', to: 'hub_h1'},
  {from: 'hub_h1', to: 'hub_h3'},
  {from: 'hub_h1', to: 'hub_h5'},
  {from: 'hub_h1', to: 'hub_h7'},
  {from: 'hub_h1', to: 'hub_notable1'},
  {from: 'hub_h3', to: 'hub_notable2'},
  {from: 'hub_h8', to: 'hub_notable3'},
  {from: 'hub_h6', to: 'hub_notable4'},
  {from: 'hub_notable1', to: 'hub_keystone1'},
  {from: 'hub_notable2', to: 'hub_keystone2'},
  {from: 'hub_notable3', to: 'hub_notable4'},
  {from: 'start_templar', to: 'hub_h1'},
  {from: 'start_duelist', to: 'hub_h1'},
  {from: 'mar_wild_r4', to: 'wit_elem_r2'},
  {from: 'wit_frost_r3', to: 'ran_praez_r2'},
  {from: 'ran_adler_r3', to: 'hub_h8'},
  {from: 'hub_h1', to: 'sha_meuch_r2'},
  {from: 'sha_meuch_r4', to: 'tem_priest_r2'},
  {from: 'tem_stand_r3', to: 'due_kampf_r3'},
  {from: 'due_tanz_r4', to: 'mar_wucht_r3'}
];



// ACT METADATA
const ACT_INFO = {
  1:  {name:"Akt I – Die Küste",           icon:"⚓", color:"#8ab4d4", boss:"Merveil, die Versunkene"},
  2:  {name:"Akt II – Der Düsterwald",      icon:"🌲", color:"#6a9e6a", boss:"Die Königin der Großen Natter"},
  3:  {name:"Akt III – Sarn",               icon:"🏛️", color:"#c4a065", boss:"Piety, die Inquisitorin"},
  4:  {name:"Akt IV – Der Körper der Bestie",icon:"🔥", color:"#c46a3a", boss:"Dominus, oberster Inquisitor"},
  5:  {name:"Akt V – Die Folgen",           icon:"💀", color:"#9a6a9a", boss:"Kitava, der Hungrige"},
  6:  {name:"Akt VI – Die Küste (II)",      icon:"🌊", color:"#5a7abf", boss:"Ryslatha, die Brutmutter"},
  7:  {name:"Akt VII – Der Verfluchte Wald",icon:"🍂", color:"#8a7a3a", boss:"Arakaali, Spinnerin des Todes"},
  8:  {name:"Akt VIII – Sarn (II)",         icon:"⚔️",  color:"#bf5a5a", boss:"Lunaris & Solaris"},
  9:  {name:"Akt IX – Die Wüste",           icon:"🏜️", color:"#cfa44a", boss:"The Depraved Trinity"},
  10: {name:"Akt X – Karui-Küste",          icon:"🌅", color:"#cf8a5a", boss:"Kitava, der Herrschende"}
};

// Zones: bossWave = wave number that ends zone, actFinal = true if completing unlocks next act
const ZONES = [
  // ── ACT 1 ──────────────────────────────────────────────────────────
  {name:"The Twilight Strand",    lvl:1,  act:1, bossWave:5,  actFinal:false, icon:"🏖️"},
  {name:"The Coast",              lvl:2,  act:1, bossWave:8,  actFinal:false, icon:"⚓"},
  {name:"The Mud Flats",          lvl:3,  act:1, bossWave:8,  actFinal:false, icon:"🌿"},
  {name:"The Submerged Passage",  lvl:5,  act:1, bossWave:10, actFinal:false, icon:"🌊"},
  {name:"Merveil's Cavern",       lvl:7,  act:1, bossWave:12, actFinal:true,  icon:"🐚"},
  // ── ACT 2 ──────────────────────────────────────────────────────────
  {name:"The Southern Forest",    lvl:9,  act:2, bossWave:8,  actFinal:false, icon:"🌲"},
  {name:"The Forest Encampment",  lvl:11, act:2, bossWave:8,  actFinal:false, icon:"🏕️"},
  {name:"The Wetlands",           lvl:12, act:2, bossWave:10, actFinal:false, icon:"🐸"},
  {name:"The Vaal Ruins",         lvl:14, act:2, bossWave:12, actFinal:false, icon:"🗿"},
  {name:"The Western Forest",     lvl:15, act:2, bossWave:15, actFinal:true,  icon:"🌳"},
  // ── ACT 3 ──────────────────────────────────────────────────────────
  {name:"The City of Sarn",       lvl:17, act:3, bossWave:8,  actFinal:false, icon:"🏛️"},
  {name:"The Slums",              lvl:19, act:3, bossWave:8,  actFinal:false, icon:"🏚️"},
  {name:"The Marketplace",        lvl:21, act:3, bossWave:10, actFinal:false, icon:"🛒"},
  {name:"The Library",            lvl:23, act:3, bossWave:10, actFinal:false, icon:"📚"},
  {name:"The Lunaris Temple",     lvl:24, act:3, bossWave:15, actFinal:true,  icon:"🌙"},
  // ── ACT 4 ──────────────────────────────────────────────────────────
  {name:"The Dried Lake",         lvl:27, act:4, bossWave:8,  actFinal:false, icon:"☀️"},
  {name:"The Mines",              lvl:29, act:4, bossWave:8,  actFinal:false, icon:"⛏️"},
  {name:"The Crystal Veins",      lvl:31, act:4, bossWave:10, actFinal:false, icon:"💎"},
  {name:"Daresso's Dream",        lvl:33, act:4, bossWave:10, actFinal:false, icon:"🗡️"},
  {name:"The Belly of the Beast", lvl:35, act:4, bossWave:15, actFinal:true,  icon:"💀"},
  // ── ACT 5 ──────────────────────────────────────────────────────────
  {name:"The Control Blocks",     lvl:37, act:5, bossWave:8,  actFinal:false, icon:"🔒"},
  {name:"The Slave Pens",         lvl:39, act:5, bossWave:8,  actFinal:false, icon:"⛓️"},
  {name:"The Ruined Square",      lvl:41, act:5, bossWave:10, actFinal:false, icon:"🏚️"},
  {name:"Oriath Square",          lvl:43, act:5, bossWave:10, actFinal:false, icon:"🏛️"},
  {name:"The Cathedral Rooftop",  lvl:45, act:5, bossWave:15, actFinal:true,  icon:"⛪"},
  // ── ACT 6 ──────────────────────────────────────────────────────────
  {name:"The Twilight Strand II", lvl:46, act:6, bossWave:8,  actFinal:false, icon:"🌅"},
  {name:"The Coast II",           lvl:48, act:6, bossWave:8,  actFinal:false, icon:"🌊"},
  {name:"The Mud Flats II",       lvl:50, act:6, bossWave:10, actFinal:false, icon:"🌿"},
  {name:"The Karui Fortress",     lvl:52, act:6, bossWave:10, actFinal:false, icon:"🛡️"},
  {name:"The Riverways",          lvl:53, act:6, bossWave:15, actFinal:true,  icon:"🏞️"},
  // ── ACT 7 ──────────────────────────────────────────────────────────
  {name:"The Vaal City",          lvl:55, act:7, bossWave:8,  actFinal:false, icon:"🗿"},
  {name:"The Northern Forest",    lvl:56, act:7, bossWave:8,  actFinal:false, icon:"🍂"},
  {name:"The Causeway",           lvl:57, act:7, bossWave:10, actFinal:false, icon:"🌉"},
  {name:"The Ashen Fields",       lvl:58, act:7, bossWave:10, actFinal:false, icon:"🔥"},
  {name:"Maligaro's Sanctum",     lvl:60, act:7, bossWave:15, actFinal:true,  icon:"🕷️"},
  // ── ACT 8 ──────────────────────────────────────────────────────────
  {name:"The Sarn Encampment",    lvl:61, act:8, bossWave:8,  actFinal:false, icon:"🏕️"},
  {name:"The Grain Gate",         lvl:62, act:8, bossWave:8,  actFinal:false, icon:"🌾"},
  {name:"The Imperial Fields",    lvl:63, act:8, bossWave:10, actFinal:false, icon:"⚔️"},
  {name:"The Solaris Temple",     lvl:64, act:8, bossWave:10, actFinal:false, icon:"☀️"},
  {name:"The Lunaris Concourse",  lvl:66, act:8, bossWave:15, actFinal:true,  icon:"🌕"},
  // ── ACT 9 ──────────────────────────────────────────────────────────
  {name:"The Descent",            lvl:67, act:9, bossWave:8,  actFinal:false, icon:"⬇️"},
  {name:"The Vastiri Desert",     lvl:68, act:9, bossWave:8,  actFinal:false, icon:"🏜️"},
  {name:"The Foothills",          lvl:68, act:9, bossWave:10, actFinal:false, icon:"⛰️"},
  {name:"The Boiling Lake",       lvl:69, act:9, bossWave:10, actFinal:false, icon:"🌋"},
  {name:"The Quarry",             lvl:70, act:9, bossWave:15, actFinal:true,  icon:"🪨"},
  // ── ACT 10 ─────────────────────────────────────────────────────────
  {name:"The Cathedral Rooftop II",lvl:70, act:10,bossWave:8, actFinal:false, icon:"⛪"},
  {name:"The Blood Aqueduct",     lvl:70, act:10,bossWave:8,  actFinal:false, icon:"🩸"},
  {name:"The Feeding Trough",     lvl:70, act:10,bossWave:10, actFinal:false, icon:"💀"},
  {name:"The Ravaged Square",     lvl:70, act:10,bossWave:10, actFinal:false, icon:"🏚️"},
  {name:"Karui Shores",           lvl:70, act:10,bossWave:15, actFinal:true,  icon:"🌅"},
];

// Bosses
const BOSSES = {
  Shaper: {lvl: 78, hp: 15000, damage: 400, rewards: ["Starforge", "Void Battery"], splinter: "Shaper Splinter", description: "Der Shaper - Herrscher der Form"},
  Elder: {lvl: 80, hp: 18000, damage: 450, rewards: ["Watcher's Eye", "Shavronne's Wrappings"], splinter: "Elder Splinter", description: "Der Elder - Verderber der Realität"},
  Sirus: {lvl: 83, hp: 22000, damage: 550, rewards: ["Thread of Hope", "The Searing Touch"], splinter: "Sirus Splinter", description: "Sirus - der Wächter der Erinnerung"},
  Maven: {lvl: 84, hp: 25000, damage: 600, rewards: ["Unnatural Instinct", "The Taming"], splinter: "Maven Splinter", description: "Die Maven - Meisterin der Arena"},
  UberElder: {lvl: 85, hp: 30000, damage: 700, rewards: ["Watcher's Eye", "Starforge", "Presence of Chayula"], splinter: "Uber Elder Splinter", description: "Uber Elder - Die ultimative Bedrohung"}
};

// Currency
const CURRENCY_TYPES = [
  {name: "Scroll of Wisdom", weight: 100, cost: 1},
  {name: "Portal Scroll", weight: 80, cost: 2},
  {name: "Transmutation Orb", weight: 30, cost: 4},
  {name: "Augmentation Orb", weight: 25, cost: 3},
  {name: "Alchemy Orb", weight: 15, cost: 8},
  {name: "Chaos Orb", weight: 5, cost: 20},
  {name: "Exalted Orb", weight: 1, cost: 100},
  {name: "Divine Orb", weight: 2, cost: 50},
  {name: "Chromatic Orb", weight: 20, cost: 5},
  {name: "Jeweller's Orb", weight: 15, cost: 6},
  {name: "Fusing Orb", weight: 15, cost: 8},
  {name: "Gemcutter's Prism", weight: 10, cost: 10}
];

// Quests
const QUESTS = [
  {id: "act1_quest1", name: "Die erste Reise", act: 1, description: "Betritt das erste Gebiet", completed: false, rewards: ["Scroll of Wisdom x5"]},
  {id: "act1_quest2", name: "Der erste Gegner", act: 1, description: "Besiege 10 Gegner", completed: false, rewards: ["Transmutation Orb x1"]},
  {id: "act2_quest1", name: "Die Vaal Ruinen", act: 2, description: "Betritt die Vaal Ruinen", completed: false, rewards: ["Augmentation Orb x1"]},
  {id: "act2_quest2", name: "Der erste seltene Gegner", act: 2, description: "Besiege einen seltenen Gegner", completed: false, rewards: ["Alchemy Orb x1"]},
  {id: "act5_quest1", name: "Das Herz der Bestie", act: 5, description: "Betritt Belly of the Beast", completed: false, rewards: ["Chaos Orb x1"]},
  {id: "act10_quest1", name: "Der Shaper", act: 10, description: "Besiege den Shaper", completed: false, rewards: ["Exalted Orb x1"]}
];

