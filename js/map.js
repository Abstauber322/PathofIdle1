// ============================================
// MAP.JS - Karte & Zonen-Auswahl, Portal-System,
// Zonen-Abschluss, Akt-Freischaltung
// ============================================

// ========== ZONE-SELECT RENDERING ==========
function renderZoneSelect() {
  if (!state) return;

  const container = el('zone-select');
  if (!container) return;
  container.innerHTML = '';

  // Group zones by act
  const actGroups = {};
  ZONES.filter(z => z.act <= state.unlockedAct).forEach(zone => {
    if (!actGroups[zone.act]) actGroups[zone.act] = [];
    actGroups[zone.act].push(zone);
  });

  Object.entries(actGroups).forEach(([act, zones]) => {
    const info = ACT_INFO[act] || {name:`Akt ${act}`, icon:'⚔️'};
    const group = document.createElement('optgroup');
    group.label = `${info.icon} ${info.name}`;

    zones.forEach(zone => {
      const option = document.createElement('option');
      option.value = zone.name;
      const completed = (state.completedZones || []).includes(zone.name);
      option.textContent = `${zone.icon || '🗺️'} ${zone.name} (Lvl ${zone.lvl})${completed ? ' ✓' : ''}`;
      if (zone.name === state.currentZone) option.selected = true;
      group.appendChild(option);
    });
    container.appendChild(group);
  });
}

// ========== ZONE ACTIONS ==========
function selectZone() {
  if (!state) return;
  state.currentZone = el('zone-select').value;
  state.currentMap = null;
  // Reset wave when changing zones
  resetCombatState();
  saveGame();
}

function resetCombatState() {
  waveState = null;
  waveAdvancePending = false;
  currentMonster = null;
  targetedEnemyId = null;
  if (waveCombatTimer) { clearInterval(waveCombatTimer); waveCombatTimer = null; }
  if (typeof stopWaveCombatTick === 'function') stopWaveCombatTick();
  const ef = el('enemy-field'); if (ef) ef.innerHTML = '';
  const cv = el('combat-vitals'); if (cv) cv.classList.add('hidden');
}

function enterZone() {
  if (!state) return;

  const zone = ZONES.find(z => z.name === state.currentZone);
  if (!zone) return;

  // Close any existing portal
  state.inTown = false;
  state.currentMap = null;
  state.portalOpen = false;
  removePortalUI();

  resetCombatState();

  spawnMonsterFromZone(zone);
  renderSkillBar();
  renderFlasks();
  if (typeof updateNavCombatState === 'function') updateNavCombatState();

  const actInfo = ACT_INFO[zone.act] || {};
  addToLog(`🚪 Betritt ${zone.icon || ''} ${zone.name} — Wellen bis Boss: ${zone.bossWave}`, 'system');
  showSection('map');
  saveGame();
}

// ========== ZONE COMPLETION ==========
// Called by combat.js enemyDefeated when final boss wave is cleared
function onZoneComplete(zone) {
  if (!state) return;

  zone = zone || ZONES.find(z => z.name === state.currentZone);
  if (!zone) return;

  // Mark zone as completed
  if (!state.completedZones) state.completedZones = [];
  if (!state.completedZones.includes(zone.name)) {
    state.completedZones.push(zone.name);
  }

  // Stop all combat and fully clear wave state
  if (typeof stopWaveCombatTick === 'function') stopWaveCombatTick();
  if (autoFightTimer2) { clearInterval(autoFightTimer2); autoFightTimer2 = null; }
  waveState = null;
  waveAdvancePending = false;
  currentMonster = null;
  targetedEnemyId = null;
  const efZ = document.getElementById('enemy-field'); if (efZ) efZ.innerHTML = '';
  const cvZ = document.getElementById('combat-vitals'); if (cvZ) cvZ.classList.add('hidden');

  // Act final zone → unlock next act
  let actUnlocked = null;
  if (zone.actFinal && zone.act < 10) {
    const nextAct = zone.act + 1;
    if (state.unlockedAct < nextAct) {
      state.unlockedAct = nextAct;
      actUnlocked = nextAct;
    }
  }

  // Open portal back to town
  state.portalOpen = true;

  saveGame();
  showZoneCompleteScreen(zone, actUnlocked);
}

function showZoneCompleteScreen(zone, actUnlocked) {
  // Remove any existing overlay
  const existing = document.getElementById('zone-complete-overlay');
  if (existing) existing.remove();

  const actInfo = ACT_INFO[zone.act] || {name:`Akt ${zone.act}`, icon:'⚔️', color:'#c8a84b'};
  const nextActInfo = actUnlocked ? (ACT_INFO[actUnlocked] || {name:`Akt ${actUnlocked}`, icon:'⚔️'}) : null;

  const overlay = document.createElement('div');
  overlay.id = 'zone-complete-overlay';
  overlay.style.cssText = `
    position:fixed; inset:0; z-index:9999;
    background:radial-gradient(ellipse at center, rgba(20,8,0,0.97) 0%, rgba(0,0,0,0.99) 100%);
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    animation: overlayFadeIn 0.6s ease-out;
  `;

  // Inject keyframes if not yet present
  if (!document.getElementById('zone-complete-styles')) {
    const style = document.createElement('style');
    style.id = 'zone-complete-styles';
    style.textContent = `
      @keyframes overlayFadeIn { from{opacity:0;} to{opacity:1;} }
      @keyframes zoneCompleteGlow { 0%,100%{text-shadow:0 0 20px #c8a84b,0 0 40px #c8a84b88;} 50%{text-shadow:0 0 40px #ffd700,0 0 80px #ffd70088;} }
      @keyframes actBadgePop { 0%{transform:scale(0) rotate(-10deg);opacity:0;} 60%{transform:scale(1.15) rotate(2deg);} 100%{transform:scale(1) rotate(0);opacity:1;} }
      @keyframes slideUp { from{transform:translateY(40px);opacity:0;} to{transform:translateY(0);opacity:1;} }
      @keyframes portalPulse { 0%,100%{box-shadow:0 0 20px #9966ff,0 0 40px #6633cc44;} 50%{box-shadow:0 0 35px #cc88ff,0 0 70px #9944ff88;} }
      @keyframes shimmer { 0%{background-position:200% center;} 100%{background-position:-200% center;} }
    `;
    document.head.appendChild(style);
  }

  const bossName = actInfo.boss || 'Gebietsherr';

  overlay.innerHTML = `
    <div style="text-align:center; padding:40px; max-width:600px; width:90%;">

      <!-- Zone icon + glow -->
      <div style="font-size:72px; margin-bottom:16px; animation:zoneCompleteGlow 2s ease-in-out infinite;">
        ${zone.icon || '🗺️'}
      </div>

      <!-- Zone name -->
      <h2 style="
        font-size:13px; letter-spacing:4px; text-transform:uppercase;
        color:#888; margin:0 0 8px 0;
      ">ZONE ABGESCHLOSSEN</h2>

      <h1 style="
        font-size:28px; color:#e8d48b; margin:0 0 4px 0;
        font-family:'Palatino Linotype',serif; letter-spacing:2px;
        text-shadow: 0 0 30px #c8a84b88;
        animation: zoneCompleteGlow 2s ease-in-out infinite;
      ">${zone.name}</h1>

      <p style="color:#888; font-size:13px; margin:0 0 24px 0;">
        ${actInfo.icon} ${actInfo.name} · ${bossName} besiegt
      </p>

      <!-- Divider line -->
      <div style="
        height:1px; background:linear-gradient(to right, transparent, #c8a84b66, transparent);
        margin:20px 0;
      "></div>

      ${actUnlocked ? `
        <!-- New Act Unlock -->
        <div style="
          animation: actBadgePop 0.7s 0.3s ease-out both;
          background: linear-gradient(135deg, rgba(${hexToRgb(nextActInfo.color || '#c8a84b')},0.15), rgba(0,0,0,0.4));
          border: 1px solid ${nextActInfo.color || '#c8a84b'};
          border-radius: 12px; padding: 20px; margin-bottom:24px;
        ">
          <div style="font-size:36px; margin-bottom:8px;">${nextActInfo.icon}</div>
          <div style="color:#ffd700; font-size:11px; letter-spacing:3px; margin-bottom:4px;">NEUER AKT FREIGESCHALTET</div>
          <div style="color:#e8d48b; font-size:20px; font-family:'Palatino Linotype',serif;">
            ${nextActInfo.name}
          </div>
        </div>
      ` : ''}

      <!-- Stats row -->
      <div style="
        display:flex; gap:16px; justify-content:center; margin-bottom:28px;
        animation: slideUp 0.5s 0.2s ease-out both;
      ">
        <div style="background:rgba(255,255,255,0.05); border:1px solid #333; border-radius:8px; padding:12px 20px; text-align:center;">
          <div style="font-size:22px; color:#e8d48b;">${state.kills}</div>
          <div style="font-size:10px; color:#666; letter-spacing:2px;">KILLS</div>
        </div>
        <div style="background:rgba(255,255,255,0.05); border:1px solid #333; border-radius:8px; padding:12px 20px; text-align:center;">
          <div style="font-size:22px; color:#e8d48b;">Lvl ${state.level}</div>
          <div style="font-size:10px; color:#666; letter-spacing:2px;">LEVEL</div>
        </div>
        <div style="background:rgba(255,255,255,0.05); border:1px solid #333; border-radius:8px; padding:12px 20px; text-align:center;">
          <div style="font-size:22px; color:#e8d48b;">${state.gold}💰</div>
          <div style="font-size:10px; color:#666; letter-spacing:2px;">GOLD</div>
        </div>
      </div>

      <!-- Portal button -->
      <button onclick="waveState=null; state.portalOpen=true; useTownPortal(); document.getElementById('zone-complete-overlay').remove();" style="
        animation: portalPulse 2s ease-in-out infinite, slideUp 0.5s 0.4s ease-out both;
        background: linear-gradient(135deg, #2a1a4a, #1a0a3a);
        border: 2px solid #9966ff; border-radius: 8px;
        color: #cc88ff; font-size: 16px; padding: 14px 36px;
        cursor: pointer; letter-spacing: 2px; font-family: inherit;
        width: 100%; max-width: 320px; margin-bottom: 12px;
        display: block; margin-left: auto; margin-right: auto;
      ">🌀 Portal zur Stadt öffnen</button>

      ${(function(){
        // Find the next zone after the completed one
        const currentIdx = ZONES.findIndex(z => z.name === zone.name);
        const nextZone = currentIdx >= 0 ? ZONES[currentIdx + 1] : null;
        // Only show if there IS a next zone and it belongs to an unlocked act
        if (!nextZone || nextZone.act > (state.unlockedAct || 1)) return '';
        return `
        <button onclick="goToNextZone('${nextZone.name}'); document.getElementById('zone-complete-overlay').remove();" style="
          animation: slideUp 0.5s 0.5s ease-out both;
          background: linear-gradient(135deg, #1a2a1a, #0a1a0a);
          border: 2px solid #44aa44; border-radius: 8px;
          color: #88dd88; font-size: 16px; padding: 14px 36px;
          cursor: pointer; letter-spacing: 2px; font-family: inherit;
          width: 100%; max-width: 320px; margin-bottom: 12px;
          display: block; margin-left: auto; margin-right: auto;
        ">▶▶ Nächste Zone: ${nextZone.icon || '🗺️'} ${nextZone.name}</button>`;
      })()}

      <button onclick="continueInZone(); document.getElementById('zone-complete-overlay').remove();" style="
        background: transparent; border: 1px solid #444; border-radius: 8px;
        color: #888; font-size: 13px; padding: 10px 24px;
        cursor: pointer; font-family: inherit;
        display: block; margin: 0 auto;
      ">Im Gebiet bleiben</button>
    </div>
  `;

  document.body.appendChild(overlay);
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

function continueInZone() {
  // Player stays – restart waves from wave 1 of next cycle with higher difficulty
  if (!state) return;
  state.portalOpen = false;
  state.inTown = false;
  // Full reset so density/monsters don't accumulate
  resetCombatState();
  addToLog(`⚔️ Weiter im Gebiet – erhöhte Schwierigkeit!`, 'system');
  startWaves(1);
}

function goToNextZone(zoneName) {
  if (!state) return;
  const zone = ZONES.find(z => z.name === zoneName);
  if (!zone) return;

  if (zone.act <= (state.unlockedAct || 1)) {
    state.currentZone = zoneName;
    state.currentMap = null;
    state.portalOpen = false;
    state.inTown = false;
    resetCombatState();
    spawnMonsterFromZone(zone);
    renderSkillBar();
    renderFlasks();
    if (typeof updateNavCombatState === 'function') updateNavCombatState();
    addToLog(`▶▶ Betritt ${zone.icon || ''} ${zone.name} (Akt ${zone.act}, Lvl ${zone.lvl})`, 'system');
    showSection('map');
    saveGame();
  }
}

// ========== PORTAL SYSTEM ==========

function removePortalUI() {
  const old = document.getElementById('portal-btn-floating');
  if (old) old.remove();
}

function showPortalButton() {
  removePortalUI();
  const btn = document.createElement('button');
  btn.id = 'portal-btn-floating';
  btn.onclick = () => usePortalScroll();
  btn.style.cssText = `
    position:fixed; bottom:100px; right:20px; z-index:999;
    background:linear-gradient(135deg,#2a1a4a,#1a0a3a);
    border:2px solid #9966ff; border-radius:8px;
    color:#cc88ff; font-size:13px; padding:10px 18px;
    cursor:pointer; font-family:inherit;
    animation: portalPulse 2s ease-in-out infinite;
    box-shadow:0 0 20px #9966ff44;
  `;
  btn.innerHTML = `🌀 Portal (${countPortalScrolls()})`;
  document.body.appendChild(btn);
}

function countPortalScrolls() {
  if (!state) return 0;
  const ps = state.inventory.find(i => i.name === 'Portal Scroll' && i.type === 'currency');
  return ps ? (ps.amount || 0) : 0;
}

function usePortalScroll() {
  if (!state) return;
  if (state.inTown) { addToLog('Du bist bereits in der Stadt.', 'system'); return; }

  const ps = state.inventory.find(i => i.name === 'Portal Scroll' && i.type === 'currency');
  if (!ps || ps.amount <= 0) {
    addToLog('❌ Kein Portal-Scroll! Kämpfe dich durch oder finde einen.', 'error');
    return;
  }
  ps.amount -= 1;
  if (ps.amount <= 0) state.inventory.splice(state.inventory.indexOf(ps), 1);

  state.portalOpen = true;
  addToLog('🌀 Portal geöffnet! Teleportiere zur Stadt...', 'system');
  useTownPortal();
}

function useTownPortal() {
  if (!state) return;
  // Keep portalOpen = true so goToTown() passes the combat check, then goToTown clears it.
  removePortalUI();
  goToTown();
}

// ========== TOWN ACCESS ==========
function goToTown() {
  if (!state) return;

  // Block town access during active combat unless portal is open
  const inCombat = !state.inTown && waveState && waveState.enemies.some(e => e.hp > 0);
  if (inCombat && !state.portalOpen) {
    addToLog('❌ Du kannst die Stadt nicht betreten während du kämpfst! Benutze einen Portal-Scroll (Q-Menü) oder besiege die Welle.', 'error');
    // Show portal button if player has scrolls
    if (countPortalScrolls() > 0) showPortalButton();
    return;
  }

  state.inTown = true;
  state.portalOpen = false;
  currentMonster = null;
  state.currentMap = null;
  waveAdvancePending = false;
  if (typeof updateNavCombatState === 'function') updateNavCombatState();

  // Stop ALL combat timers
  if (typeof stopWaveCombatTick === 'function') stopWaveCombatTick();
  if (autoFightTimer2) { clearInterval(autoFightTimer2); autoFightTimer2 = null; }
  // DO NOT clear waveState here: player may return to the zone and resume.
  // But stop the combat tick so enemies stop attacking.

  removePortalUI();
  addToLog('🏡 Zurück in der Stadt.', 'system');
  showSection('town');
  saveGame();
}

// ========== MAP (Endgame) — jetzt über die Stadt (Maps & Bosse Buttons) ==========
// Alte Buttons (#map-btn / #boss-btn) im Karten-Menü werden ausgeblendet; die
// Funktionalität läuft jetzt über openMapMenu()/openBossMenu() aus der Stadt.
function openMap() { openMapMenu(); }   // Rückwärtskompatibilität für evtl. alte Buttons
function fightBoss() { openBossMenu(); } // Rückwärtskompatibilität für evtl. alte Buttons

function isCampaignComplete() {
  return state && state.unlockedAct >= CAMPAIGN_COMPLETE_ACT;
}

function updateCampaignButtons() {
  // Boss/Map-Buttons gehören jetzt in die Stadt — alte Buttons im Karten-Menü
  // (falls noch im HTML vorhanden) werden immer versteckt.
  const mapBtn = el('map-btn');
  const bossBtn = el('boss-btn');
  if (mapBtn) mapBtn.style.display = 'none';
  if (bossBtn) bossBtn.style.display = 'none';
}

// ---------- Karten-Menü (Stadt) ----------
function ensureEndgameOverlay(id) {
  let ov = document.getElementById(id);
  if (!ov) {
    ov = document.createElement('div');
    ov.id = id;
    ov.style.cssText = 'position:fixed;inset:0;z-index:9998;display:none;background:rgba(0,0,0,0.85);align-items:center;justify-content:center;';
    ov.onclick = (e) => { if (e.target === ov) ov.style.display = 'none'; };
    document.body.appendChild(ov);
  }
  return ov;
}

function openMapMenu() {
  if (!state) return;
  if (!isCampaignComplete()) {
    addToLog(`🗺️ Maps sind erst ab Akt ${CAMPAIGN_COMPLETE_ACT} verfügbar!`, 'error');
    return;
  }
  renderMapMenu();
  ensureEndgameOverlay('map-menu-overlay').style.display = 'flex';
}

function closeMapMenu() {
  const ov = document.getElementById('map-menu-overlay');
  if (ov) ov.style.display = 'none';
}

function renderMapMenu() {
  const ov = ensureEndgameOverlay('map-menu-overlay');
  const maps = state.maps || [];

  let html = `<div style="background:#15151c;border:1px solid #c8a84b;border-radius:10px;max-width:760px;width:92%;max-height:82vh;overflow-y:auto;padding:18px;">`;
  html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
    <h3 style="color:var(--gold);margin:0;">🗺️ Karten (${maps.length}/${MAP_CAP})</h3>
    <button onclick="closeMapMenu()">✖</button>
  </div>`;
  html += `<p style="color:#888;font-size:12px;margin:0 0 10px;">Karten droppen ab Akt ${CAMPAIGN_COMPLETE_ACT}. Normale Karten können mit Currency (Schmied-Orbs) zu Magic/Rare aufgewertet werden — höhere Rarität = mehr Modifikatoren.</p>`;

  if (maps.length === 0) {
    html += `<p style="color:#888;">Keine Karten im Besitz.</p>`;
  } else {
    html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;">`;
    maps.slice().sort((a, b) => b.tier - a.tier).forEach(m => {
      const color = RARITY[m.rarity] ? RARITY[m.rarity].color : '#888';
      const tAm = getCurrencyAmount('Transmutation Orb');
      const alAm = getCurrencyAmount('Alchemy Orb');
      const auAm = getCurrencyAmount('Augmentation Orb');
      const chAm = getCurrencyAmount('Chaos Orb');
      const exAm = getCurrencyAmount('Exalted Orb');
      html += `<div class="item-card" style="border-color:${color};" id="mapcard-${m.id}">
        <strong style="color:${color};">${ICONS.map} ${m.name}</strong>
        <p style="color:#aaa;font-size:12px;margin:3px 0;">Tier ${m.tier} · ${RARITY[m.rarity] ? RARITY[m.rarity].name : m.rarity}</p>
        ${m.affixes.length ? `<div class="item-mods">${m.affixes.map(a => `${a.label}: +${a.value}`).join('<br>')}</div>` : ''}
        <div class="item-actions" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">
          <button onclick="enterMapItem('${m.id}')" style="border-color:var(--gold);color:var(--gold);">▶ Betreten</button>
          ${m.rarity === 'normal' ? `
            <button onclick="applyCurrencyToMap('Transmutation Orb','${m.id}')" ${tAm <= 0 ? 'disabled' : ''}>🔵 Transmute (${tAm})</button>
            <button onclick="applyCurrencyToMap('Alchemy Orb','${m.id}')" ${alAm <= 0 ? 'disabled' : ''}>🔮 Alchemy (${alAm})</button>` : ''}
          ${m.rarity === 'magic' ? `<button onclick="applyCurrencyToMap('Augmentation Orb','${m.id}')" ${(auAm <= 0 || m.affixes.length >= 2) ? 'disabled' : ''}>🔷 Augment (${auAm})</button>` : ''}
          ${m.rarity === 'rare' ? `
            <button onclick="applyCurrencyToMap('Chaos Orb','${m.id}')" ${chAm <= 0 ? 'disabled' : ''}>🎲 Chaos (${chAm})</button>
            <button onclick="applyCurrencyToMap('Exalted Orb','${m.id}')" ${(exAm <= 0 || m.affixes.length >= 6) ? 'disabled' : ''}>✨ Exalt (${exAm})</button>` : ''}
        </div>
      </div>`;
    });
    html += `</div>`;
  }
  html += `</div>`;
  ov.innerHTML = html;

  maps.forEach(m => {
    const card = document.getElementById(`mapcard-${m.id}`);
    if (card) {
      card.onmouseenter = () => showTooltip(card, createItemTooltip(m), 'item');
      card.onmouseleave = () => hideTooltip('item');
    }
  });
}

function enterMapItem(mapId) {
  if (!state) return;
  const idx = (state.maps || []).findIndex(m => m.id === mapId);
  if (idx === -1) return;
  const map = state.maps.splice(idx, 1)[0];

  closeMapMenu();
  resetCombatState();
  state.inTown = false;
  state.currentMap = map;

  addToLog(`🗺️ Betritt ${map.icon || ''} ${map.name} (Tier ${map.tier})`, 'system');
  showSection('map');
  startWaves(1);
  if (typeof updateNavCombatState === 'function') updateNavCombatState();
  saveGame();
}

function onMapComplete() {
  if (!state) return;
  const map = state.currentMap;
  state.currentMap = null;

  if (typeof stopWaveCombatTick === 'function') stopWaveCombatTick();
  waveState = null;
  waveAdvancePending = false;
  currentMonster = null;
  targetedEnemyId = null;

  // Splitter sind die primäre Belohnung von Karten
  const bossNames = Object.keys(BOSSES);
  const dropCount = rnd(1, 2);
  for (let i = 0; i < dropCount; i++) {
    const bossName = pick(bossNames);
    const boss = BOSSES[bossName];
    const amt = rnd(1, 2);
    state.bossSplinters[boss.splinter] = (state.bossSplinters[boss.splinter] || 0) + amt;
    addToLog(`+${amt} ${boss.splinter}`, 'drop');
  }

  state.inTown = true;
  addToLog(`🎉 ${map ? map.name : 'Karte'} abgeschlossen!`, 'system');
  showSection('town');
  saveGame();
}

// ---------- Boss-Menü (Stadt) ----------
function openBossMenu() {
  if (!state) return;
  if (!isCampaignComplete()) {
    addToLog(`👑 Bosse sind erst ab Akt ${CAMPAIGN_COMPLETE_ACT} verfügbar!`, 'error');
    return;
  }
  renderBossMenu();
  ensureEndgameOverlay('boss-menu-overlay').style.display = 'flex';
}

function closeBossMenu() {
  const ov = document.getElementById('boss-menu-overlay');
  if (ov) ov.style.display = 'none';
}

function renderBossMenu() {
  const ov = ensureEndgameOverlay('boss-menu-overlay');
  let html = `<div style="background:#15151c;border:1px solid #c8a84b;border-radius:10px;max-width:680px;width:92%;max-height:82vh;overflow-y:auto;padding:18px;">`;
  html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
    <h3 style="color:var(--gold);margin:0;">👑 Bosse</h3>
    <button onclick="closeBossMenu()">✖</button>
  </div>`;
  html += `<p style="color:#888;font-size:12px;margin:0 0 10px;">Benötigt je ${BOSS_SPLINTER_COST} Splitter. Splitter findest du in Karten.</p>`;
  html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;">`;
  Object.entries(BOSSES).forEach(([name, boss]) => {
    const have = state.bossSplinters[boss.splinter] || 0;
    const ready = have >= BOSS_SPLINTER_COST;
    html += `<div class="item-card" style="border-color:${ready ? 'var(--gold)' : '#555'};">
      <strong style="color:${ready ? 'var(--gold)' : '#ccc'};">👑 ${name}</strong>
      <p style="color:#aaa;font-size:12px;margin:3px 0;">Lvl ${boss.lvl} · ${boss.description}</p>
      <p style="color:#aaa;font-size:12px;margin:3px 0;">${boss.splinter}: ${have}/${BOSS_SPLINTER_COST}</p>
      <p style="color:#888;font-size:11px;margin:3px 0;">Beute: ${boss.rewards.join(', ')}</p>
      <div class="item-actions" style="margin-top:6px;">
        <button onclick="startBossFight('${name}')" ${ready ? '' : 'disabled'} style="border-color:var(--gold);color:var(--gold);">⚔️ Kämpfen</button>
      </div>
    </div>`;
  });
  html += `</div></div>`;
  ov.innerHTML = html;
}

function startBossFight(bossName) {
  if (!state) return;
  if (!isCampaignComplete()) {
    addToLog(`👑 Bosse sind erst ab Akt ${CAMPAIGN_COMPLETE_ACT} verfügbar!`, 'error');
    return;
  }
  const boss = BOSSES[bossName];
  if (!boss) return;
  if ((state.bossSplinters[boss.splinter] || 0) < BOSS_SPLINTER_COST) {
    addToLog(`❌ Benötige ${BOSS_SPLINTER_COST} ${boss.splinter} für ${bossName}! (Du findest sie in Karten)`, 'error');
    return;
  }
  state.bossSplinters[boss.splinter] -= BOSS_SPLINTER_COST;

  closeBossMenu();
  resetCombatState();
  state.inTown = false;
  state.currentMap = null;

  const enemy = {
    id: uid(), name: '👑 ' + bossName, bossKey: bossName, icon: ICONS.boss,
    lvl: boss.lvl, hp: boss.hp, maxHp: boss.hp, damage: boss.damage,
    xp: boss.hp, rarity: 'unique', modifiers: [], speed: 1, attackSpeed: 1,
    leech: 0, regen: 0, explosive: false, cursed: false, isBoss: true,
    armour: 0, evade: 0, extraFire: 0, extraCold: 0, extraLight: 0, extraChaos: 0,
    critChance: 0, critMulti: 1.5, reflect: 0, type: 'boss',
    nextAttackAt: Date.now() + 900
  };
  waveState = {
    waveNum: 1, density: 1, enemies: [enemy], waveSize: 1, waveKills: 0,
    modifiers: [], lvl: boss.lvl, tier: {n: 5, label: 'BOSS', cls: 'boss'},
    waveAura: {}, isBoss: true, isNamedBoss: true
  };
  currentMonster = enemy;
  targetedEnemyId = enemy.id;

  renderWave();
  const cv = document.getElementById('combat-vitals'); if (cv) cv.classList.remove('hidden');
  if (typeof renderCombatVitals === 'function') renderCombatVitals();
  showWaveBanner(`☠ BOSS · ${bossName}`);
  addToLog(`👑 Kampf gegen ${bossName} beginnt!`, 'system');
  showSection('map');
  startWaveCombatTick();
  saveGame();
}

function onNamedBossDefeated(bossName) {
  if (!state) return;
  const boss = BOSSES[bossName];

  if (typeof stopWaveCombatTick === 'function') stopWaveCombatTick();
  waveState = null;
  waveAdvancePending = false;
  currentMonster = null;
  targetedEnemyId = null;

  addToLog(`👑 ${bossName} besiegt!`, 'drop');
  if (boss && Math.random() < 0.5 && state.inventory.length < INVENTORY_CAP) {
    const uniqueName = pick(boss.rewards);
    const item = createItem({level: boss.lvl, rarity: 'unique', uniqueName: uniqueName});
    state.inventory.push(item);
    addToLog(`🎁 Einzigartiger Gegenstand erhalten: ${item.name}!`, 'drop');
  }

  state.inTown = true;
  showSection('town');
  saveGame();
}

// ========== MAP RENDER ==========
function renderMap() {
  if (!state) return;
  renderZoneSelect();
  renderMonster();
  updateCampaignButtons();

  // Ensure act-progress container exists in the map section
  let actProg = el('act-progress');
  if (!actProg) {
    const mapSec = el('section-map');
    if (mapSec) {
      actProg = document.createElement('div');
      actProg.id = 'act-progress';
      // Insert near top of map section
      mapSec.insertBefore(actProg, mapSec.firstChild);
    }
  }
  renderActProgress();

  // Show portal button if player is fighting and has portal scrolls
  if (!state.inTown && waveState && countPortalScrolls() > 0) {
    const existing = document.getElementById('portal-btn-floating');
    if (!existing) showPortalButton();
  }
}

function renderActProgress() {
  const container = el('act-progress');
  if (!container || !state) return;

  const unlockedAct = state.unlockedAct || 1;
  const completedZones = state.completedZones || [];

  let html = '<div style="display:flex; flex-wrap:wrap; gap:6px; margin:8px 0;">';
  for (let act = 1; act <= 10; act++) {
    const info = ACT_INFO[act] || {icon:'⚔️', name:`Akt ${act}`, color:'#555'};
    const unlocked = act <= unlockedAct;
    const finalZone = ZONES.find(z => z.act === act && z.actFinal);
    const completed = finalZone && completedZones.includes(finalZone.name);

    const bg = completed ? 'linear-gradient(135deg,rgba(200,168,75,0.25),rgba(0,0,0,0.4))'
               : unlocked ? 'rgba(255,255,255,0.05)'
               : 'rgba(0,0,0,0.5)';
    const border = completed ? '#c8a84b' : unlocked ? '#555' : '#2a2a2a';
    const color = completed ? '#e8d48b' : unlocked ? '#aaa' : '#444';

    html += `
      <div style="
        background:${bg}; border:1px solid ${border}; border-radius:6px;
        padding:4px 10px; font-size:11px; color:${color};
        ${!unlocked ? 'filter:grayscale(1);' : ''}
      " title="${info.name}">
        ${info.icon} ${completed ? '✓' : unlocked ? '' : '🔒'}${act}
      </div>`;
  }
  html += '</div>';
  container.innerHTML = html;
}
