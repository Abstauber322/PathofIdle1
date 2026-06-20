// ============================================
// SAVE.JS - Speichern/Laden, Import/Export,
// Idle-Modus
// ============================================

// ========== SAVE / LOAD SYSTEM ==========
function saveGame() {
  if (!state) return;

  // Calculate max life and mana
  state.stats.maxLife = state.stats.maxLife || state.stats.life;
  state.stats.maxMana = state.stats.maxMana || state.stats.mana;
  state.stats.maxES = state.stats.maxES || state.stats.es;
  state.gold = Math.max(0, Math.floor(state.gold || 0));

  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  el('save-status').textContent = `Gespeichert ${new Date().toLocaleTimeString()}`;
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;

  try {
    const data = JSON.parse(raw);

    // Migration for older versions
    if (!data.version || data.version < 3) {
      data.version = 3;
      data.xpThresholds = generateXPThresholds();
      data.stats = calculateBaseStats(data.attrs || CLASSES[data.className].attr, data.level || 1);
      data.stats.maxLife = data.stats.life;
      data.stats.maxMana = data.stats.mana;
      data.stats.maxES = data.stats.es || 0;
    }

    // Migration: ensure new fields exist
    if (!data.completedZones)  data.completedZones = [];
    if (data.portalOpen === undefined) data.portalOpen = false;
    if (data.unlockedAct === undefined) data.unlockedAct = 1;
    if (!data.maps) data.maps = [];
    if (!data.bossSplinters) data.bossSplinters = {};

    // Migrate capitalised rarities
    const norm = (it) => { if (it && typeof it.rarity === 'string' && it.rarity !== 'currency') it.rarity = it.rarity.toLowerCase(); };
    (data.inventory || []).forEach(norm);
    (data.stash || []).forEach(norm);
    Object.values(data.equipment || {}).forEach(norm);

    return data;
  } catch {
    return null;
  }
}

function newGame() {
  if (confirm("Neues Spiel beginnen? Aktueller Fortschritt geht verloren!")) {
    // Hard-reset ALL globals so nothing leaks into the new run
    state = null;
    currentMonster = null;
    waveState = null;
    waveAdvancePending = false;
    targetedEnemyId = null;
    selectedClass = 'Marauder';
    try { skillCooldowns = {}; } catch(e) {}
    if (autoFightTimer)  { clearInterval(autoFightTimer);  autoFightTimer  = null; }
    if (autoFightTimer2) { clearInterval(autoFightTimer2); autoFightTimer2 = null; }
    if (idleTimer)       { clearInterval(idleTimer);       idleTimer       = null; }
    if (waveCombatTimer) { clearInterval(waveCombatTimer); waveCombatTimer = null; }
    // Clear visible UI
    const ef = el('enemy-field'); if (ef) ef.innerHTML = '';
    const wh = el('wave-header'); if (wh) wh.classList.add('hidden');
    const cv = el('combat-vitals'); if (cv) cv.classList.add('hidden');
    if (el('gold-display')) el('gold-display').textContent = '0';
    if (el('town-gold'))    el('town-gold').textContent    = '0';
    const pb = document.getElementById('portal-btn-floating'); if (pb) pb.remove();
    const ov = document.getElementById('zone-complete-overlay'); if (ov) ov.remove();
    localStorage.removeItem(SAVE_KEY);
    document.querySelectorAll('[id^="section-"]').forEach(s => s.classList.add('hidden'));
    el('section-char-select').classList.remove('hidden');
    renderClassSelection();
    addToLog("Neues Spiel gestartet. Wähle eine Klasse.", 'system');
  }
}


function exportGame() {
  if (!state) return;

  el('saveBox').value = JSON.stringify(state);
  el('saveBox').classList.remove('hidden');
  addToLog("Export bereit. Kopiere den Text.", 'system');
}

function importGame() {
  try {
    const data = JSON.parse(el('saveBox').value);
    state = data;
    el('saveBox').classList.add('hidden');

    // Migrate if needed
    if (!state.version || state.version < 3) {
      state.version = 3;
      state.xpThresholds = generateXPThresholds();
      state.stats = calculateBaseStats(state.attrs || CLASSES[state.className].attr, state.level || 1);
      state.stats.maxLife = state.stats.life;
      state.stats.maxMana = state.stats.mana;
      state.stats.maxES = state.stats.es || 0;
    }
    if (!state.maps) state.maps = [];
    if (!state.bossSplinters) state.bossSplinters = {};

    // Hide class selection
    el('section-char-select').classList.add('hidden');
    showSection('char');

    // Initialize game
    renderCharacter();
    renderInventory();
    renderTree();
    renderSkills();
    renderMap();

    addToLog(`Willkommen zurück, ${state.name}!`, 'system');
    saveGame();
  } catch (e) {
    addToLog("Ungültiger Import!", 'error');
  }
}


function toggleIdleMode() {
  if (!state) return;

  state.idleMode = el('idle-mode-toggle').checked;

  if (state.idleMode) {
    startIdleMode();
  } else {
    stopIdleMode();
  }

  saveGame();
}

function startIdleMode() {
  if (!state || idleTimer) return;

  idleTimer = setInterval(() => {
    if (state && state.idleMode && !state.inTown && !currentMonster) {
      // Gain XP
      const xpGain = Math.floor(state.level * 0.5);
      state.xp += xpGain;

      // Gain gold
      const goldGain = Math.floor(state.level * 0.3);
      state.gold += goldGain;

      // Check for level up
      checkLevelUp();

      // Random item drop
      if (Math.random() < 0.05) {
        const slot = pick(['weapon', 'armour', 'accessory']);
        const item = createItem({slot: slot, level: state.level});
        if (state.inventory.length < INVENTORY_CAP) {
          state.inventory.push(item);
          addToLog(`🎁 Idle-Loot: ${item.name}`, 'drop');
        }
      }

      addToLog(`⏳ Idle: +${xpGain} XP, +${goldGain} ${ICONS.gold}`, 'system');
      updateGoldDisplay();
      saveGame();
    }
  }, 5000);

  addToLog("Idle-Modus aktiviert!", 'system');
}

function stopIdleMode() {
  if (idleTimer) {
    clearInterval(idleTimer);
    idleTimer = null;
  }
  addToLog("Idle-Modus deaktiviert.", 'system');
}

