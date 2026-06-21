// ============================================
// COMBAT.JS - Kampf-Engine: Wellen, Angriffe,
// Auto-Kampf, Tränke (Flasks), Monster-Anzeige
// ============================================

// ========== SKILL FUNCTIONS ==========
function useSkill(skillIndex) {
  if (!state || !currentMonster) return;
  const activeGems = [];
  Object.values(state.equipment).forEach(item => {
    if (item && item.sockets) {
      item.sockets.forEach((socket, idx) => {
        if (socket.gem && socket.gem.gemType === 'active') activeGems.push({gem: socket.gem, item, idx});
      });
    }
  });
  if (activeGems.length === 0) { addToLog('Keine aktive Skill-Gem!', 'error'); return; }
  const s = activeGems[skillIndex % activeGems.length];
  useSkillGem(s.item.id, s.idx);
}

function useGemSkill(gem, item) {
  // legacy wrapper
  const idx = item.sockets.findIndex(s => s.gem && s.gem.id === gem.id);
  if (idx >= 0) useSkillGem(item.id, idx);
}

function attack() {
  if (!state || !currentMonster) {
    addToLog("Kein Gegner zum Angreifen!", 'error');
    return;
  }

  // Find first active skill gem and use it - there is no standard attack anymore
  for (const item of Object.values(state.equipment)) {
    if (item && item.sockets) {
      for (let i = 0; i < item.sockets.length; i++) {
        if (item.sockets[i].gem && item.sockets[i].gem.gemType === 'active') {
          useSkill(0);
          return;
        }
      }
    }
  }

  addToLog("⚠️ Keine aktive Skill-Gem ausgerüstet! Sockel eine Skill-Gem, um anzugreifen.", 'error');
}


// ========== WAVE COMBAT ENGINE ==========
const MONSTER_TYPES = [
  {name:'Zombie',    icon:'🧟', base:{hp:30,dmg:2,xp:10}},
  {name:'Skeleton',  icon:'💀', base:{hp:25,dmg:3,xp:12}},
  {name:'Ranger',    icon:'🏹', base:{hp:20,dmg:4,xp:15}},
  {name:'Mage',      icon:'🧙', base:{hp:18,dmg:5,xp:18}},
  {name:'Golem',     icon:'🪨', base:{hp:50,dmg:2,xp:20}},
  {name:'Demon',     icon:'😈', base:{hp:35,dmg:6,xp:25}},
  {name:'Wraith',    icon:'👻', base:{hp:22,dmg:7,xp:22}},
  {name:'Vaal Guard',icon:'⚔️', base:{hp:45,dmg:5,xp:28}},
];

// PoE-style modifier pool: ~24 mods covering offense/defense/element/utility.
// Each apply(m, ctx) can mutate the enemy AND register a player-side aura via ctx.waveAura.
const MONSTER_MODIFIERS = [
  // --- Movement / speed
  {id:'swift',     label:'Schnell',         color:'#44cc44', badge:'⚡',
   apply:m=>{ m.damage=Math.ceil(m.damage*1.2); m.speed=0.55; m.attackSpeed=(m.attackSpeed||1)*1.4; }},
  {id:'frenzied',  label:'Frenetisch',      color:'#ff8866', badge:'🌀',
   apply:m=>{ m.attackSpeed=(m.attackSpeed||1)*1.7; m.damage=Math.ceil(m.damage*1.15); }},
  // --- Defense
  {id:'armoured',  label:'Gepanzert',       color:'#aaaaff', badge:'🛡',
   apply:m=>{ m.hp=Math.ceil(m.hp*1.6); m.maxHp=m.hp; m.armour=(m.armour||0)+m.lvl*8; }},
  {id:'hexproof',  label:'Fluchresistent',  color:'#7777aa', badge:'🚫',
   apply:m=>{ m.hexproof=true; }},
  {id:'evasive',   label:'Ausweichend',     color:'#88ffaa', badge:'💨',
   apply:m=>{ m.evade=0.35; }},
  {id:'tough',     label:'Zäh',             color:'#cccccc', badge:'🪖',
   apply:m=>{ m.hp=Math.ceil(m.hp*2.2); m.maxHp=m.hp; }},
  // --- Offense
  {id:'volatile',  label:'Explosiv',        color:'#ff8844', badge:'💥',
   apply:m=>{ m.explosive=true; m.damage=Math.ceil(m.damage*1.25); }},
  {id:'berserker', label:'Berserker',       color:'#ff2222', badge:'😡',
   apply:m=>{ m.damage=Math.ceil(m.damage*1.9); m.hp=Math.ceil(m.hp*0.75); m.maxHp=m.hp; }},
  {id:'crit',      label:'Kritisch',        color:'#ffee44', badge:'🎯',
   apply:m=>{ m.critChance=0.35; m.critMulti=2.2; }},
  {id:'piercing',  label:'Durchschlagend',  color:'#ffaa66', badge:'🏹',
   apply:m=>{ m.pierce=true; m.damage=Math.ceil(m.damage*1.1); }},
  // --- Elemental damage (extra-as-element)
  {id:'fiery',     label:'Brennend',        color:'#ff5522', badge:'🔥',
   apply:m=>{ m.extraFire=0.6; }},
  {id:'frosty',    label:'Eisig',           color:'#66ccff', badge:'❄',
   apply:m=>{ m.extraCold=0.6; m.chill=true; }},
  {id:'shocking',  label:'Schockend',       color:'#ffff66', badge:'⚡',
   apply:m=>{ m.extraLight=0.6; m.shock=true; }},
  {id:'chaotic',   label:'Chaotisch',       color:'#aa44ff', badge:'☠',
   apply:m=>{ m.extraChaos=0.5; m.ignoreES=true; }},
  // --- Player-side curses (waveAura)
  {id:'eleWeak',   label:'Elementarschwäche',color:'#ff88ff', badge:'💢',
   apply:(m,ctx)=>{ if(ctx) ctx.waveAura.eleResLoss=(ctx.waveAura.eleResLoss||0)+25; }},
  {id:'vuln',      label:'Verwundbarkeit',  color:'#ff5555', badge:'🩸',
   apply:(m,ctx)=>{ if(ctx) ctx.waveAura.dmgTakenMore=(ctx.waveAura.dmgTakenMore||0)+25; }},
  {id:'tempChains',label:'Temporale Ketten',color:'#bb88ff', badge:'⏳',
   apply:(m,ctx)=>{ if(ctx) ctx.waveAura.playerSlow=0.35; }},
  {id:'noLeech',   label:'Kein Lebensraub', color:'#888888', badge:'🚱',
   apply:(m,ctx)=>{ if(ctx) ctx.waveAura.noLeech=true; }},
  {id:'reflect',   label:'Schadensreflexion',color:'#ff77aa', badge:'🪞',
   apply:m=>{ m.reflect=0.15; }},
  // --- Sustain
  {id:'vampiric',  label:'Vampirisch',      color:'#ff4488', badge:'🩸',
   apply:m=>{ m.leech=0.18; }},
  {id:'regen',     label:'Regenerierend',   color:'#44ffaa', badge:'💚',
   apply:m=>{ m.regen=Math.ceil(m.maxHp*0.04); }},
  // --- Mob-density modifiers (wave-only, multiply pack count)
  {id:'pack',      label:'Volle Packung',   color:'#ffd070', badge:'👥',
   apply:m=>{}, waveOnly:true, densityMult:1.6},
  {id:'beyond',    label:'Jenseits',        color:'#ff00ff', badge:'🌌',
   apply:m=>{}, waveOnly:true, densityMult:2.0, addRare:true},
  {id:'breach',    label:'Bruch',           color:'#aa00ff', badge:'🌀',
   apply:m=>{}, waveOnly:true, densityMult:1.8},
];

// Pool of "boss" enemies for milestone waves
const BOSS_TYPES = [
  {name:'Vaal Oversoul',  icon:'👁', base:{hp:600,dmg:14,xp:300}},
  {name:'Brutus',         icon:'👹', base:{hp:500,dmg:18,xp:280}},
  {name:'Merveil',        icon:'🧜', base:{hp:520,dmg:16,xp:290}},
  {name:'Piety',          icon:'⚜', base:{hp:560,dmg:15,xp:310}},
  {name:'Shaper',         icon:'🌌', base:{hp:900,dmg:22,xp:500}},
];

// Wave state
let waveState = null; // {waveNum, enemies:[], waveSize, waveKills, modifiers, density, tier, waveAura, isBoss}
let targetedEnemyId = null;
let autoFightTimer2 = null;
let waveCombatTimer = null;
// Race-condition guard: true while the 900ms "wave complete → next wave" timeout is pending.
// startAutoCombat2 must NOT restart a wave while this flag is set.
let waveAdvancePending = false;

function getWaveZoneLvl() {
  if (!state) return 1;
  if (state.currentMap) return state.currentMap.itemLevel;
  const zone = ZONES.find(z=>z.name===state.currentZone);
  return zone ? zone.lvl : 1;
}

function waveTier(waveNum) {
  if (waveNum % 10 === 0) return {n:5, label:'BOSS', cls:'boss'};
  if (waveNum >= 25) return {n:4, label:'T4 · Apex', cls:'t4'};
  if (waveNum >= 15) return {n:3, label:'T3 · Elite', cls:'t3'};
  if (waveNum >= 7)  return {n:2, label:'T2 · Hart',  cls:'t2'};
  return {n:1, label:'T1 · Normal', cls:'t1'};
}

function buildWave(waveNum, zoneLvl) {
  const tier = waveTier(waveNum);
  const isBoss = waveNum % 10 === 0;
  const mapMods = (state && state.currentMap && state.currentMap.mods) || {};

  // PoE-style scaling: density grows exponentially-ish, capped sanely.
  let density = Math.min(3 + Math.floor(waveNum * 0.7) + Math.floor(zoneLvl * 0.2), 16);
  // Difficulty scaling — steeper than before for "alles wird schwerer"
  const hpMult   = (1 + (waveNum - 1) * 0.22 + Math.pow(waveNum, 1.25) * 0.015) * (1 + (mapMods.monsterLife || 0) / 100);
  const dmgMult  = (1 + (waveNum - 1) * 0.15 + Math.pow(waveNum, 1.15) * 0.012) * (1 + (mapMods.monsterDamage || 0) / 100);
  const lvl      = Math.max(1, zoneLvl + Math.floor(waveNum * 0.5));

  // Pick wave-level modifiers (more on higher tiers)
  const modCount = Math.min(6, Math.floor(waveNum / 3));
  let mods = waveNum >= 3 ? pickModifiers(modCount) : [];

  // Apply density multipliers from wave-only mods (pack/beyond/breach) + map packSize mod
  mods.forEach(m => { if (m.densityMult) density = Math.ceil(density * m.densityMult); });
  if (mapMods.packSize) density = Math.ceil(density * (1 + mapMods.packSize / 100));
  density = Math.min(density, 24);

  // Build wave-level aura container (curses applied via apply(m, ctx))
  const waveAura = {};
  mods.forEach(m => { if (m.apply.length >= 2) m.apply({}, {waveAura}); });

  const enemies = [];

  if (isBoss) {
    // Boss wave: 1 huge boss + small entourage
    const bossType = BOSS_TYPES[(Math.floor(waveNum/10) - 1) % BOSS_TYPES.length];
    const boss = makeEnemy(bossType, lvl, hpMult*2.2, dmgMult*1.6, 'unique', true);
    boss.name = '☠ ' + bossType.name;
    // Bosses get 3 random rare-tier mods
    pickModifiers(3).filter(m=>!m.waveOnly).forEach(mod => {
      mod.apply(boss); if (!boss.modifiers.includes(mod.id)) boss.modifiers.push(mod.id);
    });
    enemies.push(boss);
    const guards = Math.min(3, 1 + Math.floor(waveNum/20));
    for (let i = 0; i < guards; i++) {
      enemies.push(makeEnemy(pick(MONSTER_TYPES), lvl, hpMult, dmgMult, 'magic', false));
    }
  } else {
    // Add a guaranteed rare for "beyond" mod
    const forceRare = mods.some(m=>m.addRare);
    for (let i = 0; i < density; i++) {
      const type = pick(MONSTER_TYPES);
      let rarity = 'normal';
      const rarRoll = Math.random();
      const magicChance = 0.18 + waveNum * 0.012;
      const rareChance  = 0.02 + waveNum * 0.006;
      if (forceRare && i === 0)            rarity = 'rare';
      else if (rarRoll < rareChance)       rarity = 'rare';
      else if (rarRoll < rareChance + magicChance) rarity = 'magic';

      const enemy = makeEnemy(type, lvl, hpMult, dmgMult, rarity, false);
      // Apply per-enemy mods
      const ownMods = [];
      if (rarity === 'rare')  ownMods.push(...pickModifiers(3).filter(m=>!m.waveOnly));
      if (rarity === 'magic') ownMods.push(...pickModifiers(2).filter(m=>!m.waveOnly).slice(0,1));
      ownMods.forEach(mod => { mod.apply(enemy); enemy.modifiers.push(mod.id); });
      // Wave-level mods apply to every enemy (excluding waveOnly aura/density mods)
      mods.filter(m=>!m.waveOnly).forEach(mod => {
        mod.apply(enemy);
        if (!enemy.modifiers.includes(mod.id)) enemy.modifiers.push(mod.id);
      });
      enemies.push(enemy);
    }
  }

  return {
    waveNum, density: enemies.length, enemies, waveSize: enemies.length,
    waveKills: 0, modifiers: mods.map(m=>m.id), lvl, tier, waveAura, isBoss,
  };
}

function makeEnemy(type, lvl, hpMult, dmgMult, rarity, isBoss) {
  const rMult = rarity==='unique' ? 6 : rarity==='rare' ? 3 : rarity==='magic' ? 1.6 : 1;
  const dMult = rarity==='unique' ? 3 : rarity==='rare' ? 2 : rarity==='magic' ? 1.3 : 1;
  const xMult = rarity==='unique' ? 10 : rarity==='rare' ? 4 : rarity==='magic' ? 2 : 1;
  const hp  = Math.ceil(type.base.hp * lvl * hpMult * rMult);
  const dmg = Math.ceil(type.base.dmg * lvl * dmgMult * dMult);
  const xp  = Math.ceil(type.base.xp * lvl * xMult);
  return {
    id: uid(),
    name: (rarity==='unique'?'☠ ':rarity==='rare'?'★ ':rarity==='magic'?'◆ ':'') + type.name,
    icon: type.icon,
    lvl, hp, maxHp: hp, damage: dmg, xp, rarity,
    modifiers: [], speed: 1, attackSpeed: 1, leech: 0, regen: 0,
    explosive: false, cursed: false, isBoss,
    armour: 0, evade: 0,
    extraFire: 0, extraCold: 0, extraLight: 0, extraChaos: 0,
    critChance: 0, critMulti: 1.5, reflect: 0,
    nextAttackAt: Date.now() + 600 + Math.random()*600,
  };
}

function pickModifiers(count) {
  const shuffled = [...MONSTER_MODIFIERS].sort(() => Math.random()-0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}


function startWaves(waveNum=1) {
  if (!state) return;
  // Always clear the enemy field before building a new wave
  // so ghost cards from the previous wave don't accumulate in the DOM.
  const ef = document.getElementById('enemy-field');
  if (ef) {
    // Preserve the player character center element across wave clears
    const playerSave = document.getElementById('player-char-center');
    ef.innerHTML = '';
    // Re-inject player after clearing (will be rebuilt by renderPlayerCharacter anyway)
  }

  waveState = buildWave(waveNum, getWaveZoneLvl());
  currentMonster = waveState.enemies[0];
  targetedEnemyId = currentMonster.id;
  renderWave();
  const cv = document.getElementById('combat-vitals'); if (cv) cv.classList.remove('hidden');
  renderCombatVitals();
  const tierTxt = waveState.isBoss
    ? `☠ BOSS · Welle ${waveState.waveNum}`
    : `Welle ${waveState.waveNum} · ${waveState.tier.label}`;
  showWaveBanner(tierTxt);
  addToLog(`⚔️ ${tierTxt} — ${waveState.waveSize} Gegner` +
    (waveState.modifiers.length ? ` · Mods: ${waveState.modifiers.length}` : ''), 'system');
  startWaveCombatTick();
}

function showWaveBanner(text) {
  const field = el('enemy-field');
  if (!field) return;
  const old = field.querySelector('.wave-banner');
  if (old) old.remove();
  const banner = document.createElement('div');
  banner.className = 'wave-banner';
  banner.style.cssText = 'position:absolute;inset:0;';
  banner.textContent = text;
  field.style.position = 'relative';
  field.appendChild(banner);
  setTimeout(() => banner.remove(), 1600);
}

// Floating damage / status popup over a target card (or player panel)
function showPopup(targetEl, text, cls) {
  if (!targetEl) return;
  if (getComputedStyle(targetEl).position === 'static') targetEl.style.position = 'relative';
  const p = document.createElement('div');
  p.className = 'dmg-pop ' + (cls || '');
  p.textContent = text;
  p.style.left = (35 + Math.random()*30) + '%';
  targetEl.appendChild(p);
  setTimeout(()=>p.remove(), 900);
}

function flashEnemy(enemyId) {
  const card = document.getElementById('ec-'+enemyId);
  if (card) {
    card.classList.remove('struck');
    void card.offsetWidth;
    card.classList.add('struck');
  }
}

function flashPlayerCast(targets, tags) {
  const playerEl = document.getElementById('player-char-svg') || document.getElementById('player-orb');
  if (playerEl) {
    playerEl.classList.remove('player-cast', 'player-lunge');
    void playerEl.offsetWidth;
    playerEl.classList.add('player-cast');
    playerEl.classList.add('player-lunge');
    setTimeout(() => playerEl.classList.remove('player-lunge'), 300);
  }
  const box = el('monster-box');
  if (box) { box.classList.remove('player-cast'); void box.offsetWidth; box.classList.add('player-cast'); }

  tags = tags || [];
  if (tags.includes('AoE') || tags.includes('Chaining')) {
    aoeBurst();
  }

  if (targets && targets.length) {
    targets.forEach(t => fireProjectileToTarget(t.id));
  } else {
    fireProjectileToTarget();
  }
}

function aoeBurst() {
  const field = el('enemy-field');
  if (!field) return;
  const ring = document.createElement('div');
  ring.className = 'aoe-burst';
  field.appendChild(ring);
  setTimeout(() => ring.remove(), 500);
}

function fireProjectileToTarget(enemyId) {
  const field = el('enemy-field');
  const id = enemyId || targetedEnemyId;
  if (!field || !id) return;
  const card = document.getElementById('ec-'+id);
  if (!card) return;
  const ang = card.style.getPropertyValue('--ang') || '0deg';
  const dist = card.style.getPropertyValue('--dist') || '160px';
  const p = document.createElement('div');
  p.className = 'projectile';
  field.appendChild(p);
  requestAnimationFrame(() => {
    p.style.transform = `translate(-50%,-50%) rotate(${ang}) translateY(calc(-1 * ${dist})) rotate(calc(-1 * ${ang}))`;
  });
  setTimeout(() => { p.style.opacity = '0'; }, 320);
  setTimeout(() => p.remove(), 600);
}

function flashPlayerHurt() {
  const playerEl = document.getElementById('player-char-svg') || document.getElementById('player-orb');
  if (playerEl) { playerEl.classList.remove('hurt'); void playerEl.offsetWidth; playerEl.classList.add('hurt'); }
}

function enemyLungeAt(enemyId) {
  const card = document.getElementById('ec-'+enemyId);
  if (!card) return;
  const base = card._baseDist || parseFloat(card.style.getPropertyValue('--dist')) || 160;
  card.style.setProperty('--dist', Math.max(60, base - 50) + 'px');
  card.classList.remove('attacking'); void card.offsetWidth; card.classList.add('attacking');
  setTimeout(() => { card.style.setProperty('--dist', base + 'px'); }, 280);
}


function getPlayerSVG(className) {
  // Returns a unique SVG character for each class
  const defs = {
    Marauder: {
      body: '#c0392b', // deep red
      accent: '#e74c3c',
      hair: '#2c1a0e',
      skin: '#c8956c',
      weapon: `<rect x="38" y="30" width="5" height="36" rx="2" fill="#888"/><rect x="35" y="26" width="11" height="5" rx="1" fill="#aaa"/>`, // axe handle + head
      armor: `<rect x="20" y="44" width="26" height="24" rx="3" fill="#7f1d1d"/>
               <rect x="22" y="44" width="4" height="24" rx="1" fill="#991b1b" opacity="0.6"/>
               <rect x="38" y="44" width="4" height="24" rx="1" fill="#991b1b" opacity="0.6"/>`,
      helm: `<ellipse cx="33" cy="26" rx="11" ry="8" fill="#7f1d1d"/>
             <rect x="24" y="20" width="4" height="6" rx="1" fill="#991b1b"/>
             <rect x="37" y="20" width="4" height="6" rx="1" fill="#991b1b"/>`,
      glow: '#ef4444'
    },
    Witch: {
      body: '#5b21b6',
      accent: '#8b5cf6',
      hair: '#1a0a2e',
      skin: '#e8c9b0',
      weapon: `<line x1="40" y1="28" x2="40" y2="68" stroke="#6d28d9" stroke-width="2.5"/>
               <circle cx="40" cy="26" r="5" fill="#a78bfa" opacity="0.9"/>
               <circle cx="40" cy="26" r="3" fill="#fff" opacity="0.7"/>`,
      armor: `<path d="M20 44 Q33 40 46 44 L44 68 H22 Z" fill="#4c1d95"/>
              <path d="M26 44 L24 68" stroke="#6d28d9" stroke-width="1" opacity="0.7"/>
              <path d="M40 44 L42 68" stroke="#6d28d9" stroke-width="1" opacity="0.7"/>`,
      helm: `<path d="M22 30 Q33 14 44 30 Q40 28 33 29 Q26 28 22 30Z" fill="#3b0764"/>
             <circle cx="33" cy="22" r="3" fill="#a78bfa" opacity="0.8"/>`,
      glow: '#8b5cf6'
    },
    Ranger: {
      body: '#065f46',
      accent: '#10b981',
      hair: '#78350f',
      skin: '#d4a574',
      weapon: `<line x1="44" y1="22" x2="44" y2="72" stroke="#854d0e" stroke-width="2"/>
               <path d="M38 24 Q44 36 38 48" stroke="#854d0e" stroke-width="1.5" fill="none"/>
               <line x1="38" y1="24" x2="38" y2="48" stroke="#fbbf24" stroke-width="1" opacity="0.8"/>`,
      armor: `<rect x="21" y="44" width="24" height="24" rx="2" fill="#064e3b"/>
              <rect x="26" y="44" width="12" height="5" rx="1" fill="#065f46"/>
              <rect x="21" y="56" width="24" height="2" fill="#10b981" opacity="0.5"/>`,
      helm: `<ellipse cx="33" cy="26" rx="10" ry="7" fill="#064e3b"/>
             <rect x="23" y="22" width="20" height="3" rx="1" fill="#065f46"/>`,
      glow: '#10b981'
    },
    Shadow: {
      body: '#1e1b4b',
      accent: '#6366f1',
      hair: '#0f0f0f',
      skin: '#b8956a',
      weapon: `<rect x="38" y="34" width="3" height="28" rx="1" fill="#4f46e5"/>
               <rect x="35" y="34" width="3" height="28" rx="1" fill="#6366f1"/>
               <path d="M35 34 L38 28 L41 34Z" fill="#818cf8"/>`,
      armor: `<rect x="21" y="44" width="24" height="24" rx="2" fill="#1e1b4b"/>
              <path d="M33 44 L33 68" stroke="#4f46e5" stroke-width="1.5" opacity="0.7"/>
              <path d="M21 54 L45 54" stroke="#4f46e5" stroke-width="1" opacity="0.5"/>`,
      helm: `<ellipse cx="33" cy="26" rx="10" ry="7" fill="#1e1b4b"/>
             <rect x="24" y="26" width="18" height="3" rx="1" fill="#312e81"/>`,
      glow: '#6366f1'
    },
    Templar: {
      body: '#78350f',
      accent: '#f59e0b',
      hair: '#451a03',
      skin: '#c8956c',
      weapon: `<rect x="39" y="26" width="4" height="42" rx="1" fill="#92400e"/>
               <rect x="34" y="36" width="14" height="3" rx="1" fill="#d97706"/>
               <circle cx="41" cy="28" r="4" fill="#f59e0b" opacity="0.9"/>`,
      armor: `<rect x="20" y="44" width="26" height="24" rx="3" fill="#78350f"/>
              <rect x="28" y="44" width="10" height="24" fill="#92400e" opacity="0.5"/>
              <path d="M27 44 L27 68 M39 44 L39 68" stroke="#f59e0b" stroke-width="1" opacity="0.6"/>`,
      helm: `<ellipse cx="33" cy="26" rx="11" ry="8" fill="#78350f"/>
             <rect x="28" y="18" width="10" height="4" rx="1" fill="#f59e0b" opacity="0.8"/>`,
      glow: '#f59e0b'
    },
    Duelist: {
      body: '#1e3a5f',
      accent: '#3b82f6',
      hair: '#292524',
      skin: '#c8956c',
      weapon: `<rect x="39" y="28" width="3" height="38" rx="1" fill="#94a3b8"/>
               <rect x="35" y="42" width="11" height="3" rx="1" fill="#64748b"/>
               <rect x="39" y="28" width="3" height="8" rx="1" fill="#e2e8f0"/>`,
      armor: `<rect x="21" y="44" width="24" height="24" rx="2" fill="#1e3a5f"/>
              <rect x="21" y="50" width="24" height="3" fill="#2563eb" opacity="0.5"/>
              <rect x="21" y="60" width="24" height="2" fill="#2563eb" opacity="0.4"/>`,
      helm: `<ellipse cx="33" cy="26" rx="10" ry="7" fill="#1e3a5f"/>
             <path d="M23 26 Q33 18 43 26" stroke="#3b82f6" stroke-width="1.5" fill="none"/>`,
      glow: '#3b82f6'
    },
    Scion: {
      body: '#831843',
      accent: '#f43f5e',
      hair: '#fde68a',
      skin: '#e8c9b0',
      weapon: `<line x1="40" y1="26" x2="40" y2="68" stroke="#be185d" stroke-width="2"/>
               <circle cx="40" cy="24" r="4" fill="#f43f5e" opacity="0.9"/>
               <circle cx="40" cy="24" r="2" fill="#fff" opacity="0.8"/>
               <path d="M36 38 Q40 34 44 38" stroke="#f43f5e" stroke-width="1.5" fill="none"/>`,
      armor: `<path d="M21 44 Q33 40 45 44 L43 68 H23 Z" fill="#831843"/>
              <path d="M33 44 L33 68" stroke="#f43f5e" stroke-width="1" opacity="0.6"/>`,
      helm: `<ellipse cx="33" cy="26" rx="10" ry="7" fill="#831843"/>
             <path d="M27 22 L33 16 L39 22" fill="#f43f5e" opacity="0.7"/>`,
      glow: '#f43f5e'
    }
  };

  const cls = defs[className] || defs['Marauder'];

  return `<svg viewBox="0 0 66 90" xmlns="http://www.w3.org/2000/svg" width="66" height="90">
    <defs>
      <radialGradient id="pg-${className}" cx="50%" cy="100%" r="60%">
        <stop offset="0%" stop-color="${cls.glow}" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="${cls.glow}" stop-opacity="0"/>
      </radialGradient>
      <filter id="pf-glow-${className}">
        <feGaussianBlur stdDeviation="1.5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <!-- Ground glow -->
    <ellipse cx="33" cy="84" rx="18" ry="5" fill="url(#pg-${className})"/>

    <!-- Legs -->
    <rect x="24" y="66" width="8" height="18" rx="2" fill="${cls.body}"/>
    <rect x="34" y="66" width="8" height="18" rx="2" fill="${cls.body}"/>
    <!-- Boot details -->
    <rect x="24" y="78" width="8" height="6" rx="2" fill="#111"/>
    <rect x="34" y="78" width="8" height="6" rx="2" fill="#111"/>

    <!-- Body Armor -->
    ${cls.armor}

    <!-- Left arm -->
    <rect x="12" y="44" width="8" height="22" rx="3" fill="${cls.skin}"/>
    <rect x="11" y="44" width="8" height="10" rx="3" fill="${cls.body}"/>

    <!-- Right arm / weapon arm -->
    <rect x="46" y="44" width="8" height="22" rx="3" fill="${cls.skin}"/>
    <rect x="46" y="44" width="8" height="10" rx="3" fill="${cls.body}"/>

    <!-- Weapon -->
    <g filter="url(#pf-glow-${className})">
      ${cls.weapon}
    </g>

    <!-- Neck -->
    <rect x="29" y="36" width="8" height="10" rx="2" fill="${cls.skin}"/>

    <!-- Head -->
    <ellipse cx="33" cy="30" rx="12" ry="11" fill="${cls.skin}"/>

    <!-- Helm/Hat -->
    <g filter="url(#pf-glow-${className})">
      ${cls.helm}
    </g>

    <!-- Eyes -->
    <ellipse cx="28" cy="30" rx="2.5" ry="2" fill="#fff"/>
    <ellipse cx="38" cy="30" rx="2.5" ry="2" fill="#fff"/>
    <circle cx="28.5" cy="30.5" r="1.3" fill="#111"/>
    <circle cx="38.5" cy="30.5" r="1.3" fill="#111"/>
    <!-- Eye glow -->
    <circle cx="28.5" cy="30.5" r="0.6" fill="${cls.glow}" opacity="0.8"/>
    <circle cx="38.5" cy="30.5" r="0.6" fill="${cls.glow}" opacity="0.8"/>

    <!-- Mouth -->
    <path d="M29 35 Q33 37 37 35" stroke="#a07050" stroke-width="1" fill="none" stroke-linecap="round"/>
  </svg>`;
}

function renderPlayerCharacter() {
  // Hide the legacy player-orb (wherever it sits in HTML)
  const orb = document.getElementById('player-orb');
  if (orb) orb.style.display = 'none';

  // Inject / update a dedicated player element centered inside enemy-field
  const field = document.getElementById('enemy-field');
  if (!field || !state) return;

  let playerEl = document.getElementById('player-char-center');
  if (!playerEl) {
    playerEl = document.createElement('div');
    playerEl.id = 'player-char-center';
    playerEl.style.cssText = `
      position: absolute;
      left: 50%; top: 50%;
      transform: translate(-50%, -50%);
      z-index: 10;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    `;
    field.appendChild(playerEl);
  }

  // Class glow color map
  const glowMap = {
    Marauder:'#ef4444', Witch:'#8b5cf6', Ranger:'#10b981',
    Shadow:'#6366f1', Templar:'#f59e0b', Duelist:'#3b82f6', Scion:'#f43f5e'
  };
  const glow = glowMap[state.className] || '#c8a84b';

  playerEl.innerHTML = `
    <div id="player-char-svg" style="
      filter: drop-shadow(0 0 10px ${glow}88) drop-shadow(0 4px 16px rgba(0,0,0,0.9));
      transition: transform 0.15s ease;
    ">
      ${getPlayerSVG(state.className)}
    </div>
    <div style="
      font-size: 10px; color: ${glow}; letter-spacing: 1px;
      text-shadow: 0 0 8px ${glow}; font-weight: bold;
      background: rgba(0,0,0,0.6); padding: 1px 6px; border-radius: 3px;
      border: 1px solid ${glow}44;
    ">${state.name}</div>
  `;
}

function renderWave() {
  if (!waveState) return;
  const orb = document.getElementById('player-orb');
  if (orb && state) renderPlayerCharacter();
  const alive = waveState.enemies.filter(e=>e.hp>0);

  // Wave header
  const header = el('wave-header');
  if (header) {
    header.classList.remove('hidden');
    const tier = waveState.tier || {cls:'t1', label:'T1'};
    el('wave-num').innerHTML =
      `<span class="wave-tier ${tier.cls}">${tier.label}</span> ${waveState.waveNum}`;
    const killed = waveState.waveSize - alive.length;
    el('wave-progress-txt').textContent = `${killed} / ${waveState.waveSize}`;
    const pct = (killed / waveState.waveSize * 100).toFixed(0);
    el('wave-progress-bar').style.width = pct + '%';
    // Modifiers + aura
    const modEl = el('wave-modifiers');
    const auraTags = [];
    const wa = waveState.waveAura || {};
    if (wa.eleResLoss)   auraTags.push(`-${wa.eleResLoss}% Ele-Res`);
    if (wa.dmgTakenMore) auraTags.push(`+${wa.dmgTakenMore}% Erlittener Schaden`);
    if (wa.playerSlow)   auraTags.push(`${Math.round(wa.playerSlow*100)}% Spieler langsamer`);
    if (wa.noLeech)      auraTags.push(`Kein Lebensraub`);
    modEl.innerHTML = waveState.modifiers.map(id => {
      const m = MONSTER_MODIFIERS.find(x=>x.id===id);
      return m ? `<span style="color:${m.color};font-size:10px;margin:2px;background:rgba(0,0,0,.4);padding:1px 5px;border-radius:3px;">${m.badge} ${m.label}</span>` : '';
    }).join('') + auraTags.map(t=>`<span style="color:#ff6666;font-size:10px;margin:2px;background:rgba(60,0,0,.5);padding:1px 5px;border-radius:3px;border:1px solid #aa3333;">⚠ ${t}</span>`).join('');
  }

  // Enemy field
  const field = el('enemy-field');
  if (!field) return;
  const total = alive.length || 1;
  alive.forEach((enemy, i) => {
    let card = document.getElementById('ec-'+enemy.id);
    if (!card) {
      card = document.createElement('div');
      card.id = 'ec-'+enemy.id;
      const borderCls = enemy.isBoss ? ' boss-border'
        : enemy.rarity==='rare' ? ' rare-border'
        : enemy.rarity==='magic' ? ' magic-border' : '';
      card.className = 'enemy-card' + borderCls;
      // assign stable angle slot (deterministic via id hash)
      const hash = String(enemy.id).split('').reduce((a,c)=>a+c.charCodeAt(0),0);
      const ang = (hash % 360);
      card.style.setProperty('--ang', ang + 'deg');
      // bosses sit closer & larger; rares a bit closer than normals
      const baseDist = enemy.isBoss ? 110 : (enemy.rarity==='rare' ? 150 : enemy.rarity==='magic' ? 165 : 180);
      card.style.setProperty('--dist', baseDist + 'px');
      card._baseDist = baseDist;
      if (enemy.isBoss) { card.style.width = '76px'; }
      card.onclick = () => targetEnemy(enemy.id);
      const modBadges = enemy.modifiers.slice(0,3).map(id=>{
        const m=MONSTER_MODIFIERS.find(x=>x.id===id);
        return m?`<span style="font-size:10px;" title="${m.label}">${m.badge}</span>`:'';
      }).join('');
      card.innerHTML = `
        ${modBadges?`<div style="position:absolute;top:-6px;right:2px;background:#222;border-radius:3px;padding:1px 3px;z-index:2;">${modBadges}</div>`:''}
        <div class="e-icon" style="${enemy.isBoss?'font-size:30px;':''}">${enemy.icon}</div>
        <div class="e-name">${enemy.name}</div>
        <div class="e-hp-bar"><span class="e-hp-fill" id="ehp-${enemy.id}" style="width:100%"></span></div>`;
      field.appendChild(card);
      // breathe-in animation: spawn far, then settle to base distance
      card.style.setProperty('--dist', (baseDist + 60) + 'px');
      card.style.opacity = '0';
      requestAnimationFrame(() => {
        card.style.opacity = '1';
        card.style.setProperty('--dist', baseDist + 'px');
      });
    }
    const fill = document.getElementById('ehp-'+enemy.id);
    if (fill) fill.style.width = Math.max(0, (enemy.hp/enemy.maxHp*100)) + '%';
    card.classList.toggle('targeted', enemy.id === targetedEnemyId);
  });

  // Remove dead cards
  waveState.enemies.filter(e=>e.hp<=0).forEach(e=>{
    const card = document.getElementById('ec-'+e.id);
    if (card && !card.classList.contains('dying')) {
      card.classList.add('dying');
      setTimeout(()=>card.remove(), 400);
    }
  });

  // Remove any stale cards whose IDs don't belong to the current wave at all
  const validIds = new Set(waveState.enemies.map(e => 'ec-' + e.id));
  if (field) {
    Array.from(field.querySelectorAll('.enemy-card')).forEach(card => {
      if (!validIds.has(card.id) && !card.classList.contains('dying')) {
        card.classList.add('dying');
        setTimeout(() => card.remove(), 400);
      }
    });
  }

  renderMonster();
}

function targetEnemy(id) {
  if (!waveState) return;
  const enemy = waveState.enemies.find(e=>e.id===id && e.hp>0);
  if (!enemy) return;
  targetedEnemyId = id;
  currentMonster = enemy;
  renderWave();
}

function getTargetedEnemy() {
  if (!waveState) return null;
  let e = waveState.enemies.find(en=>en.id===targetedEnemyId && en.hp>0);
  if (!e) e = waveState.enemies.find(en=>en.hp>0);
  if (e) { targetedEnemyId = e.id; currentMonster = e; }
  return e || null;
}

function enemyDefeated(enemy) {
  const xpGain = enemy.xp || Math.ceil(enemy.lvl*10);
  const goldGain = rnd(1, Math.ceil(enemy.lvl*2));
  state.xp += xpGain; state.gold += goldGain; state.kills++;
  addToLog(`💀 ${enemy.name} besiegt! +${xpGain} XP, +${goldGain} 💰`, 'drop');
  checkLevelUp(); checkQuests('kill', enemy);
  dropLoot(enemy);
  if (enemy.isBoss) { dropLoot(enemy); dropLoot(enemy); }
  gainFlaskChargesOnKill(enemy);
  updateGoldDisplay();

  if (waveState) {
    waveState.waveKills++;
    const alive = waveState.enemies.filter(e=>e.hp>0);

    if (alive.length === 0) {
      // All dead: stop tick immediately, mark pending so auto-combat won't race us
      stopWaveCombatTick();
      waveAdvancePending = true;
      const completedNum = waveState.waveNum;
      const isNamedBoss = !!waveState.isNamedBoss;
      const namedBossKey = isNamedBoss ? waveState.enemies[0].bossKey : null;
      const map = state.currentMap;
      const zone = (!map && !isNamedBoss) ? ZONES.find(z => z.name === state.currentZone) : null;
      const bossWave = map ? (map.bossWave || 10) : (zone ? zone.bossWave : 10);

      setTimeout(() => {
        if (!state || !waveState) { waveAdvancePending = false; return; }
        addToLog(`🎉 Welle ${completedNum} abgeschlossen!`, 'drop');
        if (isNamedBoss) {
          waveAdvancePending = false;
          onNamedBossDefeated(namedBossKey);
        } else if (map) {
          if (completedNum >= bossWave) {
            waveAdvancePending = false;
            onMapComplete();
          } else {
            startWaves(completedNum + 1);
            waveAdvancePending = false;
          }
        } else if (completedNum >= bossWave) {
          waveAdvancePending = false;
          onZoneComplete(zone);
        } else {
          startWaves(completedNum + 1);
          waveAdvancePending = false;
        }
      }, 900);
    } else {
      const next = alive[0];
      targetedEnemyId = next.id; currentMonster = next;
      renderWave();
    }
  }
  renderCharacter(); saveGame();
}

function monsterDefeated(monster) {
  // Route through wave logic if a wave exists, so kill counting works
  if (waveState && waveState.enemies.find(e=>e.id===monster.id)) {
    return enemyDefeated(monster);
  }
  const xpGain = Math.floor(monster.lvl * 10 + rnd(5, 20));
  const goldGain = rnd(1, monster.lvl * 2);
  state.xp += xpGain; state.gold += goldGain; state.kills++;
  addToLog(`💀 ${monster.name} besiegt! +${xpGain} XP, +${goldGain} 💰`, 'drop');
  checkLevelUp(); checkQuests('kill', monster);
  dropLoot(monster);
  currentMonster = null;
  renderMonster(); renderCharacter(); updateGoldDisplay(); saveGame();
}

// ========== WAVE COMBAT TICK ==========
// Each enemy attacks on its own schedule based on attackSpeed; regen ticks too.
function startWaveCombatTick() {
  stopWaveCombatTick();
  waveCombatTimer = setInterval(waveCombatTick, 200);
}
function stopWaveCombatTick() {
  if (waveCombatTimer) { clearInterval(waveCombatTimer); waveCombatTimer = null; }
}

function waveCombatTick() {
  if (!state || !waveState) { stopWaveCombatTick(); return; }
  if (state.inTown) { stopWaveCombatTick(); return; }
  const alive = waveState.enemies.filter(e=>e.hp>0);
  if (alive.length === 0) { stopWaveCombatTick(); return; }

  // Mana regen
  if (state.currentMana !== undefined) {
    const maxMana = state.stats.maxMana || state.stats.mana || 100;
    const regen = Math.ceil(maxMana * (0.02 + (state.stats.manaRegen||0)/2000));
    state.currentMana = Math.min(maxMana, state.currentMana + regen);
  }

  const now = Date.now();
  alive.forEach(e => {
    if (e.regen) e.hp = Math.min(e.maxHp, e.hp + Math.ceil(e.regen * 0.2));
    if (!e.nextAttackAt) e.nextAttackAt = now + 800;
    if (now >= e.nextAttackAt) {
      enemyDoAttack(e);
      const baseDelay = 1400;
      const spd = e.attackSpeed || 1;
      e.nextAttackAt = now + Math.max(350, baseDelay / spd) * (0.85 + Math.random()*0.3);
    }
  });

  autoUseFlasks();
  renderWave(); renderCharacter(); renderCombatVitals();
}

// PoE-style auto-flask: trigger life flask at <=20% life, mana flask at <=20% mana.
function autoUseFlasks() {
  if (!state || !state.stats) return;
  ensureFlasks();
  const stats = state.stats;
  const maxLife = stats.maxLife || stats.life || 1;
  const maxMana = stats.maxMana || stats.mana || 1;
  if (stats.life > 0 && stats.life / maxLife <= 0.20) {
    const f = state.flasks.life;
    if (f && f.charges > 0 && stats.life < maxLife) useFlask('life');
  }
  if ((state.currentMana ?? maxMana) / maxMana <= 0.20) {
    const f = state.flasks.mana;
    if (f && f.charges > 0 && (state.currentMana ?? 0) < maxMana) useFlask('mana');
  }
}

function enemyDoAttack(attacker) {
  if (!state) return;
  const stats = state.stats;
  const wa = (waveState && waveState.waveAura) || {};

  // Evasion
  if (stats.evasion > 0) {
    const evadeChance = Math.min(70, stats.evasion / (stats.evasion + 100) * 100);
    if (Math.random()*100 < evadeChance) {
      const card = document.getElementById('ec-'+attacker.id);
      showPopup(card || el('monster-box'), 'MISS', 'miss');
      return;
    }
  }

  let dmg = rnd(Math.ceil(attacker.damage * 0.6), attacker.damage);
  // Elemental extras
  dmg += Math.floor(dmg * (attacker.extraFire + attacker.extraCold + attacker.extraLight + attacker.extraChaos));
  // Crit
  const cc = (attacker.critChance || 0);
  const isCrit = Math.random() < cc;
  if (isCrit) dmg = Math.floor(dmg * (attacker.critMulti || 1.5));

  // Player-side aura: vulnerability / ele weakness (rough approximation)
  if (wa.dmgTakenMore) dmg = Math.floor(dmg * (1 + wa.dmgTakenMore/100));
  if (wa.eleResLoss && (attacker.extraFire||attacker.extraCold||attacker.extraLight||attacker.extraChaos)) {
    dmg = Math.floor(dmg * (1 + wa.eleResLoss/200));
  }

  // Armour
  if (stats.armour > 0) dmg = Math.max(1, Math.floor(dmg * (1 - stats.armour/(stats.armour + 10*attacker.lvl))));

  // ES
  if (stats.es > 0 && !attacker.ignoreES) {
    const a = Math.min(stats.es, dmg);
    stats.es -= a; dmg -= a;
  }

  if (attacker.leech) attacker.hp = Math.min(attacker.maxHp, attacker.hp + Math.ceil(dmg*attacker.leech));

  stats.life -= dmg;
  const card = document.getElementById('ec-'+attacker.id);
  const vitals = document.getElementById('combat-vitals');
  showPopup(vitals || el('monster-box'), '-' + Math.max(0,dmg) + ' ❤', isCrit?'crit':'player-hit');
  if (vitals) { vitals.classList.add('flash-hit'); setTimeout(()=>vitals.classList.remove('flash-hit'), 220); }
  flashPlayerHurt();
  enemyLungeAt(attacker.id);
  addToLog(`${attacker.icon} ${attacker.name} trifft dich für ${Math.max(0,dmg)} Schaden${isCrit?' 💥 KRIT!':''}`, isCrit?'crit':'hit');

  // Explosive on death is handled when player kills it; reflect is on hit-received side handled in player code.

  if (stats.life <= 0) { playerDeath(); }
}

// Back-compat shim: some old code paths call monsterAttack(); route to tick once.
function monsterAttack() {
  // Player attack already happened; immediately run one combat tick so enemies
  // counter on the next frame. The interval handles the rest.
  if (waveState && !waveCombatTimer) startWaveCombatTick();
}

// Override spawnMonsterFromZone/Map to use wave system
function spawnMonsterFromZone(zone) { startWaves(1); }
function spawnMonsterFromMap(map) { startWaves(1); }

// ========== AUTO-COMBAT V2 (PoE-style cooldown spam) ==========
function toggleAutoCombat2() {
  if (!state) return;
  const checked = el('auto-combat-toggle2') ? el('auto-combat-toggle2').checked : false;
  state.autoMode = checked;
  if (state.autoMode) startAutoCombat2();
  else stopAutoCombat2();
  const old = el('auto-combat-toggle');
  if (old) old.checked = checked;
  saveGame();
}

function toggleAutoCombat() {
  if (!state) return;
  state.autoMode = el('auto-combat-toggle') ? el('auto-combat-toggle').checked : false;
  if (state.autoMode) startAutoCombat2();
  else stopAutoCombat2();
  const t2 = el('auto-combat-toggle2');
  if (t2) t2.checked = state.autoMode;
  saveGame();
}

function startAutoCombat() { startAutoCombat2(); }
function stopAutoCombat()  { stopAutoCombat2(); }

function startAutoCombat2() {
  if (!state || autoFightTimer2) return;
  addToLog('⚡ Auto-Kampf aktiviert – Skills feuern automatisch nach Cooldown.', 'system');

  autoFightTimer2 = setInterval(() => {
    if (!state || !state.autoMode) { stopAutoCombat2(); return; }
    if (state.inTown) return;

    // If a wave-advance transition is pending, DO NOT start a competing wave.
    // enemyDefeated's own setTimeout will call startWaves() at the right time.
    if (waveAdvancePending) return;

    // Only spawn the very first wave if none exists yet (initial zone entry).
    // Never restart here when waveState exists but all enemies are dead —
    // that case is exclusively owned by enemyDefeated → setTimeout → startWaves().
    if (!waveState) {
      const zone = ZONES.find(z=>z.name===state.currentZone);
      if (zone || state.currentMap) startWaves(1);
      return;
    }

    const enemy = getTargetedEnemy();
    if (!enemy) return;

    if (!waveCombatTimer) startWaveCombatTick();

    const now = Date.now();
    let firedAny = false;
    if (!state.equipment) return;

    Object.values(state.equipment).forEach(item => {
      if (!item || !item.sockets) return;
      item.sockets.forEach((socket, idx) => {
        if (!socket.gem || socket.gem.gemType !== 'active') return;
        const gem = socket.gem;
        const supports = getLinkedSupports(item, idx);
        const eff = calcEffectiveSkill(gem, supports);
        const lastUsed = skillCooldowns[gem.name] || 0;
        if ((now - lastUsed) < eff.cooldown) return;
        if ((state.currentMana||0) < eff.mana) return;
        useSkillGem(item.id, idx);
        firedAny = true;
      });
    });

    if (!firedAny) {
      const hasAnyActive = Object.values(state.equipment).some(it =>
        it && it.sockets && it.sockets.some(s => s.gem && s.gem.gemType === 'active'));
      if (!hasAnyActive && !state._warnedNoSkill) {
        state._warnedNoSkill = true;
        addToLog('⚠️ Keine aktive Skill-Gem ausgerüstet! Sockel eine Skill-Gem, um anzugreifen.', 'error');
      }
    } else {
      state._warnedNoSkill = false;
    }
  }, 120);
}

function stopAutoCombat2() {
  if (autoFightTimer2) { clearInterval(autoFightTimer2); autoFightTimer2 = null; }
  addToLog('⚡ Auto-Kampf deaktiviert.', 'system');
}


// ========== END WAVE ENGINE ==========

function playerDeath() {
  state.deaths++;
  state.stats.life = state.stats.maxLife || state.stats.life;
  state.stats.mana = state.stats.maxMana || state.stats.mana;
  state.stats.es = state.stats.maxES || state.stats.es;
  currentMonster = null;
  waveState = null;
  waveAdvancePending = false;
  stopWaveCombatTick();
  state.inTown = true;
  state.currentMap = null;
  state.portalOpen = false;

  addToLog("☠️ Du bist gestorben! Zurück in der Stadt.", 'death');
  renderMonster();
  renderCharacter();

  showSection('town');
  saveGame();
}

function checkLevelUp() {
  if (!state) return;

  while (state.xp >= state.xpThresholds[state.level]) {
    state.level++;
    state.xp -= state.xpThresholds[state.level - 1];
    state.passivePoints++;
    state.stats = calculateBaseStats(state.attrs, state.level);

    const classData = CLASSES[state.className];
    state.attrs.str += Math.floor(classData.attr.str * 0.1);
    state.attrs.dex += Math.floor(classData.attr.dex * 0.1);
    state.attrs.int += Math.floor(classData.attr.int * 0.1);

    // Level-based act unlocks as fallback (zone completion is the primary path)
    const lvl = state.level;
    if (lvl >= 3  && state.unlockedAct < 1)  state.unlockedAct = 1;
    if (lvl >= 8  && state.unlockedAct < 2)  state.unlockedAct = 2;
    if (lvl >= 16 && state.unlockedAct < 3)  state.unlockedAct = 3;
    if (lvl >= 24 && state.unlockedAct < 4)  state.unlockedAct = 4;
    if (lvl >= 32 && state.unlockedAct < 5)  state.unlockedAct = 5;
    if (lvl >= 40 && state.unlockedAct < 6)  state.unlockedAct = 6;
    if (lvl >= 48 && state.unlockedAct < 7)  state.unlockedAct = 7;
    if (lvl >= 55 && state.unlockedAct < 8)  state.unlockedAct = 8;
    if (lvl >= 62 && state.unlockedAct < 9)  state.unlockedAct = 9;
    if (lvl >= 68 && state.unlockedAct < 10) state.unlockedAct = 10;

    addToLog(`🎉 LEVEL UP! Level ${state.level} erreicht!`, 'system');
    addToLog(`+1 Passivpunkt verfügbar`, 'system');

    applyEquipmentStats();
  }

  renderCharacter();
  renderZoneSelect();
  updateCampaignButtons();
  updateGoldDisplay();
}

function dropLoot(monster) {
  if (!state) return;
  const mm = (state.currentMap && state.currentMap.mods) || {};
  const qBonus = 1 + (mm.quantity || 0) / 100;
  const rBonus = mm.rarity || 0;

  // Currency drop
  if (Math.random() < Math.min(0.9, 0.4 * qBonus)) {
    const currency = pickWeighted(CURRENCY_TYPES.map(c => ({value: c, weight: c.weight})));
    addCurrency(currency.name, Math.random() < 0.1 ? 2 : 1);
  }

  // Item drop
  if (Math.random() < Math.min(0.9, 0.3 * qBonus)) {
    const slot = pick(['weapon', 'armour', 'accessory']);
    const rarity = pickWeighted([
      {value: 'normal', weight: Math.max(10, 60 - rBonus * 0.5)},
      {value: 'magic', weight: 25 + rBonus * 0.15},
      {value: 'rare', weight: 10 + rBonus * 0.25},
      {value: 'unique', weight: 5 + rBonus * 0.1}
    ]);

    const item = createItem({
      slot: slot,
      level: Math.max(1, monster.lvl),
      rarity: rarity,
      identified: rarity === 'normal'
    });

    // Check if inventory has space
    if (state.inventory.length < INVENTORY_CAP) {
      state.inventory.push(item);
      const rarityIcon = RARITY[item.rarity] ? RARITY[item.rarity].name.charAt(0) : '⚪';
      addToLog(`🎁 Gefunden: ${rarityIcon} ${item.name}`, 'drop');
    }
  }

  // Map drop (ab Akt 10)
  if (state.unlockedAct >= CAMPAIGN_COMPLETE_ACT) {
    if (Math.random() < Math.min(0.4, 0.05 * qBonus)) {
      const tier = state.currentMap ? clamp(state.currentMap.tier + rnd(-1, 1), 1, 16) : rnd(1, 5);
      if (!state.maps) state.maps = [];
      if (state.maps.length < MAP_CAP) {
        const mapItem = createMapItem(tier);
        state.maps.push(mapItem);
        addToLog(`🗺️ Karte gefunden: ${mapItem.name} (T${tier})`, 'drop');
      }
    }
  }

  // Boss-Splitter (selten auch von benannten Bossen direkt; primäre Quelle sind Karten)
  if (monster.bossKey && BOSSES[monster.bossKey]) {
    const boss = BOSSES[monster.bossKey];
    const amt = rnd(1, 2);
    state.bossSplinters[boss.splinter] = (state.bossSplinters[boss.splinter] || 0) + amt;
    addToLog(`+${amt} ${boss.splinter}`, 'drop');
  }

  renderInventory();
}

function addCurrency(name, amount) {
  if (!state) return;

  const currencyIndex = state.inventory.findIndex(i => i.type === 'currency' && i.name === name);

  if (currencyIndex !== -1) {
    state.inventory[currencyIndex].amount += amount;
  } else {
    state.inventory.push(createCurrency(name, amount));
  }

  addToLog(`+${amount} ${name}`, 'drop');
  renderInventory();
  updateGoldDisplay();
  saveGame();
}

function updateGoldDisplay() {
  if (!state) return;
  state.gold = Math.max(0, Math.floor(state.gold || 0));
  el('gold-display').textContent = state.gold;
  if (el('town-gold')) el('town-gold').textContent = state.gold;
}


function renderMonster() {
  if (!currentMonster) {
    el('monster-box').innerHTML = `<p style="color:#666;">Kein Gegner. Betrete ein Gebiet.</p>`;
    return;
  }

  const hpPercent = (currentMonster.hp / currentMonster.maxHp) * 100;
  const bossIcon = currentMonster.type === 'boss' ? ICONS.boss : ICONS.monster;

  el('monster-box').innerHTML = `
    <h3>${bossIcon} ${currentMonster.name} <span style="color:#666;">(Level ${currentMonster.lvl})</span></h3>
    <div class="bar life" style="margin:8px 0;">
      <span style="width:${hpPercent}%"></span>
    </div>
    <p>💀 HP: ${currentMonster.hp}/${currentMonster.maxHp}</p>
    <p>⚔️ Schaden: ${currentMonster.damage}</p>
    ${currentMonster.xp ? `<p>💰 XP: ${currentMonster.xp}</p>` : ''}
  `;
}


// ========== FLASK SYSTEM (PoE-style) ==========
function ensureFlasks() {
  if (!state) return;
  if (!state.flasks) {
    state.flasks = {
      life: { charges: 3, maxCharges: 3, chargePerKill: 1, recoverPct: 0.40, duration: 4000 },
      mana: { charges: 3, maxCharges: 3, chargePerKill: 1, recoverPct: 0.35, duration: 4000 }
    };
  }
  if (state.currentMana === undefined || state.currentMana === null) {
    state.currentMana = state.stats.maxMana || state.stats.mana || 50;
  }
}

function gainFlaskChargesOnKill(enemy) {
  if (!state) return;
  ensureFlasks();
  let bonus = 1;
  if (enemy && enemy.rarity === 'magic') bonus = 2;
  else if (enemy && enemy.rarity === 'rare') bonus = 4;
  else if (enemy && (enemy.rarity === 'unique' || enemy.isBoss)) bonus = 8;
  ['life','mana'].forEach(k => {
    const f = state.flasks[k];
    f.charges = Math.min(f.maxCharges, f.charges + (f.chargePerKill || 1) * bonus);
  });
  renderFlasks();
}

function useFlask(kind) {
  if (!state) { return; }
  ensureFlasks();
  const f = state.flasks[kind];
  if (!f || f.charges <= 0) { addToLog(`🧪 ${kind === 'life' ? 'Lebens' : 'Mana'}-Flask leer!`, 'error'); return; }
  f.charges -= 1;
  if (kind === 'life') {
    const max = state.stats.maxLife || state.stats.life;
    const amt = Math.ceil(max * f.recoverPct);
    state.stats.life = Math.min(max, state.stats.life + amt);
    addToLog(`🧪 Lebens-Flask: +${amt} Leben`, 'system');
    showPopup(document.getElementById('combat-vitals') || el('monster-box'), '+' + amt + ' ❤', 'heal');
  } else {
    const max = state.stats.maxMana || state.stats.mana || 50;
    const before = state.currentMana || 0;
    state.currentMana = Math.min(max, before + Math.ceil(max * f.recoverPct));
    addToLog(`🧪 Mana-Flask: +${state.currentMana - before} Mana`, 'system');
    showPopup(document.getElementById('combat-vitals') || el('monster-box'), '+' + (state.currentMana - before) + ' 💙', 'heal');
  }
  renderFlasks(); renderCharacter(); renderCombatVitals(); saveGame();
}

function renderCombatVitals() {
  if (!state || !state.stats) return;
  const cv = document.getElementById('combat-vitals'); if (!cv) return;
  if (!waveState) { cv.classList.add('hidden'); return; }
  cv.classList.remove('hidden');
  const s = state.stats;
  const maxLife = s.maxLife || s.life || 1;
  const maxMana = s.maxMana || s.mana || 1;
  const maxES = s.maxES || 0;
  const life = Math.max(0, Math.floor(s.life));
  const mana = Math.max(0, Math.floor(state.currentMana ?? s.mana ?? 0));
  const es = Math.max(0, Math.floor(s.es || 0));
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  const bar = (id, pct) => { const e = document.getElementById(id); if (e) e.style.width = Math.max(0, Math.min(100, pct)) + '%'; };
  set('cv-life-txt', `${life} / ${maxLife}`);
  bar('cv-life-bar', life / maxLife * 100);
  set('cv-mana-txt', `${mana} / ${maxMana}`);
  bar('cv-mana-bar', mana / maxMana * 100);
  set('cv-es-txt', `${es} / ${maxES}`);
  bar('cv-es-bar', maxES ? es / maxES * 100 : 0);
}



function renderFlasks() {
  const bar = document.getElementById('flask-bar');
  if (!bar || !state) return;
  ensureFlasks();
  const f = state.flasks;
  const make = (kind, icon, color, label) => {
    const fl = f[kind];
    const pct = (fl.charges / fl.maxCharges) * 100;
    const ready = fl.charges > 0;
    return `<button onclick="useFlask('${kind}')" ${ready?'':'disabled'} title="${label} – ${Math.round((kind==='life'?fl.recoverPct:fl.recoverPct)*100)}% sofort. Ladungen durch Kills."
      style="flex:1;min-width:90px;padding:6px;border:2px solid ${color};background:rgba(0,0,0,.4);border-radius:6px;cursor:${ready?'pointer':'not-allowed'};opacity:${ready?1:0.45};text-align:left;">
      <div style="font-size:18px;line-height:1;">${icon} <span style="font-size:12px;color:${color};font-weight:bold;">${fl.charges}/${fl.maxCharges}</span></div>
      <div style="height:4px;background:#222;border-radius:2px;margin-top:4px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:${color};"></div></div>
      <div style="font-size:10px;color:#aaa;margin-top:2px;">${label}</div>
    </button>`;
  };
  bar.innerHTML = make('life','🧪','#ff4444','Leben') + make('mana','🧪','#4488ff','Mana');
}

// Hotkeys: Q = Life flask, W = Mana flask
document.addEventListener('keydown', (e) => {
  if (!state) return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (e.key === 'q' || e.key === 'Q') useFlask('life');
  else if (e.key === 'w' || e.key === 'W') useFlask('mana');
});


// ========== PLAYER CHARACTER STYLES ==========
(function injectPlayerStyles() {
  if (document.getElementById('player-char-styles')) return;
  const style = document.createElement('style');
  style.id = 'player-char-styles';
  style.textContent = `
    /* Enemy field must be relative so player can be absolute-centered */
    #enemy-field {
      position: relative !important;
    }
    #player-char-center {
      pointer-events: none;
    }
    #player-char-svg {
      transition: transform 0.15s ease;
      display: block;
    }
    #player-char-svg svg {
      overflow: visible;
      width: 72px;
      height: 96px;
      animation: playerBreath 3s ease-in-out infinite;
    }
    #player-char-svg.player-lunge {
      transform: translateX(20px) scale(1.1) !important;
    }
    #player-char-svg.hurt {
      animation: playerHurt 0.35s ease !important;
    }
    @keyframes playerHurt {
      0%   { transform: translateX(0);   filter: brightness(1); }
      25%  { transform: translateX(-8px); filter: brightness(2) saturate(0) sepia(1) hue-rotate(-30deg); }
      60%  { transform: translateX(4px); }
      100% { transform: translateX(0);   filter: brightness(1); }
    }
    #player-char-svg.player-cast {
      animation: playerCast 0.3s ease !important;
    }
    @keyframes playerCast {
      0%   { filter: brightness(1); }
      40%  { filter: brightness(1.8) saturate(1.5); transform: scale(1.07); }
      100% { filter: brightness(1); transform: scale(1); }
    }
    @keyframes playerBreath {
      0%, 100% { transform: translateY(0px) scaleY(1); }
      50%       { transform: translateY(-3px) scaleY(1.02); }
    }
    /* Hide original orb */
    #player-orb { display: none !important; }
  `;
  document.head.appendChild(style);
})();
