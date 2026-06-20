// ============================================
// SKILLS.JS - Skill-/Gem-System: Skill-Leiste,
// aktive & Support-Gems
// ============================================

// ========== SKILL BAR (combat) ==========
const cdIntervals = {};

function renderSkillBar() {
  const bar = el('skill-bar');
  if (!bar) return;
  bar.innerHTML = '';

  if (!state) return;

  // Collect active gems with their item
  Object.values(state.equipment).forEach(item => {
    if (!item || !item.sockets) return;
    item.sockets.forEach((socket, idx) => {
      if (!socket.gem || socket.gem.gemType !== 'active') return;
      const gem = socket.gem;
      const supports = getLinkedSupports(item, idx);
      const eff = calcEffectiveSkill(gem, supports);
      const cdSec = (eff.cooldown / 1000).toFixed(1);
      const colorHex = gem.color === 'red' ? '#ff6666' : gem.color === 'green' ? '#66ff66' : gem.color === 'blue' ? '#6699ff' : '#fff';
      const btnId = `skbtn-${item.id}-${idx}`;

      const btn = document.createElement('button');
      btn.className = 'skill-btn';
      btn.id = btnId;
      btn.style.borderColor = colorHex;
      btn.innerHTML = `
        <div class="cd-sweep" id="sweep-${btnId}"></div>
        <span class="btn-label" style="color:${colorHex}">${gem.icon} ${gem.name}<br>
          <span style="font-size:10px;color:#aaa;">💙${eff.mana} ⚔️${eff.damage}${eff.projCount>1?` ×${eff.projCount}`:''}</span>
        </span>
        <span class="cd-text" id="cdt-${btnId}"></span>`;
      btn.onclick = () => triggerSkillBtn(item.id, idx, eff.cooldown, btnId);
      bar.appendChild(btn);

      // restore cooldown state if active
      refreshCdVisual(btnId, gem.name, eff.cooldown);
    });
  });

  if (!bar.children.length) {
    bar.innerHTML = '<p style="color:#888;font-size:12px;">Keine aktive Skill-Gem ausgerüstet – sockel eine Skill, um anzugreifen.</p>';
  }
}

function refreshCdVisual(btnId, gemName, cdMs) {
  const now = Date.now();
  const last = skillCooldowns[gemName] || 0;
  const elapsed = now - last;
  if (elapsed < cdMs) {
    startCdAnimation(btnId, gemName, cdMs, elapsed);
  }
}

function triggerSkillBtn(itemId, socketIndex, cdMs, btnId) {
  // find gem name for cd tracking
  let gemName = null;
  for (const v of Object.values(state.equipment)) {
    if (v && v.id === itemId && v.sockets && v.sockets[socketIndex] && v.sockets[socketIndex].gem) {
      gemName = v.sockets[socketIndex].gem.name;
    }
  }
  useSkillGem(itemId, socketIndex);
  if (gemName && skillCooldowns[gemName]) {
    startCdAnimation(btnId, gemName, cdMs, 0);
  }
}

function startCdAnimation(btnId, gemName, cdMs, alreadyElapsed) {
  const btn = el(btnId);
  const sweep = el('sweep-' + btnId);
  const cdText = el('cdt-' + btnId);
  if (!btn || !sweep) return;

  const remaining = cdMs - alreadyElapsed;
  if (remaining <= 0) return;

  btn.disabled = true;
  // start sweep full, animate to 0
  sweep.style.transition = 'none';
  sweep.style.transform = `scaleX(${1 - alreadyElapsed/cdMs})`;
  sweep.classList.remove('draining');

  // Force reflow
  sweep.offsetWidth;
  sweep.style.transition = `transform ${remaining}ms linear`;
  sweep.classList.add('draining');
  sweep.style.transform = 'scaleX(0)';

  // Tick display
  if (cdIntervals[btnId]) clearInterval(cdIntervals[btnId]);
  const endTime = Date.now() + remaining;
  cdIntervals[btnId] = setInterval(() => {
    const left = endTime - Date.now();
    if (left <= 0) {
      clearInterval(cdIntervals[btnId]);
      if (cdText) cdText.textContent = '';
      if (btn) btn.disabled = false;
      sweep.style.transform = 'scaleX(0)';
    } else {
      if (cdText) cdText.textContent = (left/1000).toFixed(1) + 's';
    }
  }, 100);
}

// ===== END SKILL BAR =====

let currentSkillMode = 'active';
let pendingSocketTarget = null; // {itemId, socketIndex, mode}
let skillCooldowns = {}; // gemName -> timestamp

function toggleSkillModeDropdown() {
  const dd = el('skill-mode-dropdown');
  dd.classList.toggle('hidden');
}

function setSkillMode(mode) {
  currentSkillMode = mode;
  el('skill-mode-label').textContent = mode === 'active' ? '⚔️ Aktive Skills' : '✨ Support Gems';
  el('skill-mode-dropdown').classList.add('hidden');
  el('skill-panel-active').classList.toggle('hidden', mode !== 'active');
  el('skill-panel-support').classList.toggle('hidden', mode !== 'support');
  cancelGemPick();
  renderSkills();
}

function cancelGemPick() {
  pendingSocketTarget = null;
  el('active-gem-picker').classList.add('hidden');
  el('support-gem-picker').classList.add('hidden');
}

// Check if a support gem is compatible with an active skill gem (PoE-style tag matching)
function supportCompatible(activeGem, supportGem) {
  // Support gem must share at least one tag with active gem
  const activeTags = activeGem.tags || [];
  const supportTags = supportGem.tags || [];
  // Specific incompatibilities (like PoE: GMP needs Projectile, Minion-only supports, etc.)
  if (supportGem.name === 'MultipleProjectiles' || supportGem.name === 'Chain' || supportGem.name === 'Pierce') {
    return activeTags.includes('Projectile');
  }
  if (supportGem.name === 'MinionDamage') return activeTags.includes('Minion');
  if (supportGem.name === 'FasterAttacks') return activeTags.includes('Attack');
  if (supportGem.name === 'FasterCasting') return activeTags.includes('Spell');
  if (supportGem.name === 'AddedFireDamage') return activeTags.some(t => ['Attack','Spell'].includes(t));
  // General: share any tag
  return activeTags.some(t => supportTags.includes(t));
}

// Get all equipped items with sockets
function getSocketedItems() {
  const result = [];
  if (!state) return result;
  Object.entries(state.equipment).forEach(([slot, item]) => {
    if (item && item.sockets && item.sockets.length > 0) result.push({slot, item});
  });
  return result;
}

// Get gems from inventory by type
function getInventoryGems(type) {
  if (!state) return [];
  return state.inventory.filter(i => i.type === 'gem' && i.gemType === type);
}

// Build effective skill data for a gem (with linked support gems on same item)
function getSkillWithSupports(activeGem, item) {
  const supports = [];
  item.sockets.forEach(s => {
    if (s.gem && s.gem.gemType === 'support') {
      if (supportCompatible(activeGem, SKILL_GEMS[s.gem.name] || {})) {
        supports.push(s.gem);
      }
    }
  });
  return {gem: activeGem, supports, item};
}

// Calculate effective skill stats with support gems
function calcEffectiveSkill(activeGem, supports) {
  const base = SKILL_GEMS[activeGem.name] || {};
  let damage = base.damage || activeGem.damage || 0;
  let manaMult = 1.0;
  let speed = base.speed || 1.0;
  let crit = base.crit || 0;
  let projCount = 1;
  let leech = 0;
  let chains = 0;
  let pierces = 0;
  let tags = [...(base.tags || [])];

  supports.forEach(sup => {
    const sd = SKILL_GEMS[sup.name] || {};
    if (sd.mult) damage = Math.floor(damage * sd.mult);
    if (sd.mana) manaMult *= sd.mana;
    if (sd.speed) speed *= sd.speed;
    if (sd.crit) crit += sd.crit;
    if (sd.leech) leech += sd.leech;
    // GMP / LMP style
    if (sup.name === 'MultipleProjectiles') projCount = 5;
    if (sup.name === 'Chain') chains = 2;
    if (sup.name === 'Pierce') pierces = 2;
  });

  const mana = Math.ceil((base.mana || activeGem.mana || 0) * manaMult);
  const cooldown = Math.max(800, Math.floor(1500 / speed)); // ms

  return {damage, mana, speed, crit, projCount, chains, pierces, leech, cooldown, tags};
}

function openActiveGemPicker(itemId, socketIndex) {
  pendingSocketTarget = {itemId, socketIndex, mode: 'active'};
  const gems = getInventoryGems('active');
  const picker = el('active-gem-picker');
  const list = el('active-gem-list');

  // find item
  let targetItem = null;
  for (const v of Object.values(state.equipment)) { if (v && v.id === itemId) { targetItem = v; break; } }
  const socket = targetItem && targetItem.sockets[socketIndex];

  el('active-picker-title').textContent = `Gem in ${targetItem ? targetItem.name : '?'} Sockel ${socketIndex+1} einsetzen:`;
  list.innerHTML = '';

  if (gems.length === 0) {
    list.innerHTML = '<p style="color:#666;font-size:12px;">Keine aktiven Skill Gems im Inventar.</p>';
  } else {
    gems.forEach(gem => {
      const gd = SKILL_GEMS[gem.name] || {};
      const colorOk = !socket || socket.color === 'white' || socket.color === gem.color;
      const card = document.createElement('div');
      card.className = 'gem-card ' + gem.color + '-gem';
      card.style.opacity = colorOk ? '1' : '0.4';
      card.style.cursor = colorOk ? 'pointer' : 'not-allowed';
      card.innerHTML = `<strong>${gem.icon} ${gem.name}</strong><br>
        <span style="color:#aaa;font-size:11px;">Mana: ${gd.mana||0} | DMG: ${gd.damage||0} | Tags: ${(gd.tags||[]).join(', ')}</span>
        ${!colorOk ? '<br><span style="color:#ff6666;font-size:10px;">Farbe inkompatibel</span>' : ''}`;
      if (colorOk) card.onclick = () => doSocketGemById(gem.id, itemId, socketIndex);
      list.appendChild(card);
    });
  }
  picker.classList.remove('hidden');
}

function openSupportGemPicker(itemId, socketIndex, activeGem) {
  pendingSocketTarget = {itemId, socketIndex, mode: 'support'};
  const picker = el('support-gem-picker');
  const list = el('support-gem-list');

  let targetItem = null;
  for (const v of Object.values(state.equipment)) { if (v && v.id === itemId) { targetItem = v; break; } }
  const socket = targetItem && targetItem.sockets[socketIndex];
  const activeData = SKILL_GEMS[activeGem.name] || {};

  el('support-picker-title').textContent = `Support Gem für ${activeGem.name} (${targetItem ? targetItem.name : '?'}) einsetzen:`;
  el('support-picker-info').textContent = `Sockel ${socketIndex+1} — nur kompatible Support Gems werden angezeigt.`;
  list.innerHTML = '';

  const supGems = getInventoryGems('support');
  const compatible = supGems.filter(g => {
    const gd = SKILL_GEMS[g.name] || {};
    return supportCompatible(activeData, gd);
  });

  if (compatible.length === 0) {
    list.innerHTML = '<p style="color:#666;font-size:12px;">Keine kompatiblen Support Gems im Inventar.</p>';
  } else {
    compatible.forEach(gem => {
      const gd = SKILL_GEMS[gem.name] || {};
      const colorOk = !socket || socket.color === 'white' || socket.color === gem.color;
      const card = document.createElement('div');
      card.className = 'gem-card ' + gem.color + '-gem';
      card.style.opacity = colorOk ? '1' : '0.4';
      card.style.cursor = colorOk ? 'pointer' : 'not-allowed';
      card.innerHTML = `<strong>${gem.icon} ${gem.name}</strong><br>
        <span style="color:#aaa;font-size:11px;">${gd.description || gem.text || ''}</span>
        ${!colorOk ? '<br><span style="color:#ff6666;font-size:10px;">Farbe inkompatibel</span>' : ''}`;
      if (colorOk) card.onclick = () => doSocketGemById(gem.id, itemId, socketIndex);
      list.appendChild(card);
    });
  }
  picker.classList.remove('hidden');
}

function doSocketGemById(gemId, itemId, socketIndex) {
  if (!state) return;
  let targetItem = null;
  for (const v of Object.values(state.equipment)) { if (v && v.id === itemId) { targetItem = v; break; } }
  if (!targetItem) return;

  const gemIdx = state.inventory.findIndex(i => i.id === gemId);
  if (gemIdx === -1) return;
  const gem = state.inventory[gemIdx];

  const socket = targetItem.sockets[socketIndex];
  if (socket.gem) {
    // return existing gem to inventory
    if (state.inventory.length < INVENTORY_CAP) state.inventory.push(socket.gem);
  }
  socket.gem = gem;
  state.inventory.splice(gemIdx, 1);

  applyEquipmentStats();
  saveGame();
  cancelGemPick();
  renderSkills();
  renderSkillBar();
  addToLog(`${gem.icon} ${gem.name} in ${targetItem.name} (Sockel ${socketIndex+1}) eingesetzt.`, 'system');
}

function renderSkills() {
  if (!state) return;
  if (currentSkillMode === 'active') renderActiveSkillPanel();
  else renderSupportGemPanel();

  // always update both gem lists at bottom
  renderEquippedGems();
}

function renderActiveSkillPanel() {
  const container = el('active-socket-items');
  container.innerHTML = '';
  const items = getSocketedItems();

  items.forEach(({item}) => {
    item.sockets.forEach((socket, idx) => {
      if (socket.gem && socket.gem.gemType === 'active') return; // already has active gem
      if (socket.gem) return; // has support gem in free slot — skip for now
      const card = document.createElement('div');
      card.className = 'item-card';
      card.style.minWidth = '180px';
      const colorStyle = `color:${socket.color === 'red' ? '#ff6666' : socket.color === 'green' ? '#66ff66' : socket.color === 'blue' ? '#6699ff' : '#fff'}`;
      card.innerHTML = `<strong>${item.icon} ${item.name}</strong>
        <p style="font-size:12px;${colorStyle};margin:4px 0;">⬡ Sockel ${idx+1} (${socket.color.toUpperCase()}) — Leer</p>
        <button onclick="openActiveGemPicker('${item.id}', ${idx})" style="margin-top:4px;">+ Gem einsetzen</button>`;
      container.appendChild(card);
    });
  });

  if (container.children.length === 0) {
    container.innerHTML = '<p style="color:#666;font-size:12px;">Keine freien Sockel für aktive Gems.</p>';
  }
}

function renderSupportGemPanel() {
  const container = el('support-active-items');
  container.innerHTML = '';
  const items = getSocketedItems();
  let found = false;

  items.forEach(({item}) => {
    // find active gems on this item
    item.sockets.forEach((socket, idx) => {
      if (!socket.gem || socket.gem.gemType !== 'active') return;
      found = true;
      const activeGem = socket.gem;
      const activeData = SKILL_GEMS[activeGem.name] || {};

      // find free sockets on same item for support
      const freeSockets = item.sockets.map((s, i) => ({s, i})).filter(({s}) => !s.gem);

      const card = document.createElement('div');
      card.className = 'item-card';
      card.style.minWidth = '220px';
      card.innerHTML = `<strong>${activeGem.icon} ${activeGem.name}</strong>
        <p style="font-size:11px;color:#aaa;margin:2px 0;">auf: ${item.icon} ${item.name}</p>
        <p style="font-size:11px;color:#888;">Tags: ${(activeData.tags||[]).join(', ')}</p>`;

      if (freeSockets.length > 0) {
        freeSockets.forEach(({s, i}) => {
          const colorStyle = `color:${s.color === 'red' ? '#ff6666' : s.color === 'green' ? '#66ff66' : s.color === 'blue' ? '#6699ff' : '#fff'}`;
          const btn = document.createElement('button');
          btn.style.cssText = 'margin-top:4px;display:block;';
          btn.textContent = `+ Support → Sockel ${i+1} (${s.color.toUpperCase()})`;
          btn.onclick = () => openSupportGemPicker(item.id, i, activeGem);
          card.appendChild(btn);
        });
      } else {
        const p = document.createElement('p');
        p.style.cssText = 'font-size:11px;color:#666;margin-top:4px;';
        p.textContent = 'Keine freien Sockel.';
        card.appendChild(p);
      }

      container.appendChild(card);
    });
  });

  if (!found) {
    container.innerHTML = '<p style="color:#666;font-size:12px;">Kein aktiver Skill Gem in Ausrüstung. Setze zuerst einen aktiven Gem ein.</p>';
  }
}

function renderEquippedGems() {
  // Active gems with effective stats
  const activeContainer = el('active-skills');
  activeContainer.innerHTML = '';
  const supportContainer = el('support-skills');
  supportContainer.innerHTML = '';

  getSocketedItems().forEach(({item}) => {
    item.sockets.forEach((socket, idx) => {
      if (!socket.gem) return;
      const gem = socket.gem;
      const gd = SKILL_GEMS[gem.name] || {};
      const colorHex = gem.color === 'red' ? '#ff6666' : gem.color === 'green' ? '#66ff66' : gem.color === 'blue' ? '#6699ff' : '#fff';

      if (gem.gemType === 'active') {
        const linkedSupports = getLinkedSupports(item, idx);
        const eff = calcEffectiveSkill(gem, linkedSupports);
        const supports = linkedSupports.map(s => s.name);
        const cd = Math.round(eff.cooldown / 100) / 10;

        const div = document.createElement('div');
        div.className = 'item-card';
        div.style.cssText = `min-width:190px;border-color:${colorHex}`;
        div.innerHTML = `
          <div class="item-title">
            <strong style="color:${colorHex}">${gem.icon} ${gem.name}</strong>
            <span style="color:#666;font-size:11px;">Lvl ${gem.level}</span>
          </div>
          <p style="font-size:11px;color:#aaa;margin:2px 0;">💙 Mana: ${eff.mana} | ⚔️ DMG: ${eff.damage}</p>
          <p style="font-size:11px;color:#aaa;margin:2px 0;">⏱ CD: ${cd}s${eff.projCount > 1 ? ` | 🎯 ×${eff.projCount} Projektile` : ''}${eff.chains > 0 ? ` | 🔗 Ketten ×${eff.chains}` : ''}${eff.pierces > 0 ? ` | → Durchschlag ×${eff.pierces}` : ''}${eff.leech > 0 ? ` | ❤️ Raub ${Math.round(eff.leech*100)}%` : ''}</p>
          ${supports.length > 0 ? `<p style="font-size:10px;color:#888;margin:2px 0;">✨ ${supports.join(' + ')}</p>` : ''}
          <div class="item-actions">
            <button onclick="useSkillGem('${item.id}', ${idx})">Benutzen</button>
            <button onclick="unsocketGem('${item.id}', ${idx})">Entfernen</button>
          </div>`;
        activeContainer.appendChild(div);
      } else {
        const div = document.createElement('div');
        div.className = 'item-card';
        div.style.cssText = `min-width:180px;border-color:${colorHex}`;
        div.innerHTML = `
          <div class="item-title">
            <strong style="color:${colorHex}">${gem.icon} ${gem.name}</strong>
          </div>
          <p style="font-size:11px;color:#aaa;margin:2px 0;">${gd.description || gem.text || ''}</p>
          <p style="font-size:10px;color:#888;margin:2px 0;">auf: ${item.name}</p>
          <div class="item-actions">
            <button onclick="unsocketGem('${item.id}', ${idx})">Entfernen</button>
          </div>`;
        supportContainer.appendChild(div);
      }
    });
  });

  if (activeContainer.children.length === 0) activeContainer.innerHTML = '<p style="color:#666;font-size:12px;">Keine aktiven Skills eingesetzt.</p>';
  if (supportContainer.children.length === 0) supportContainer.innerHTML = '<p style="color:#666;font-size:12px;">Keine Support Gems eingesetzt.</p>';
}

// New useSkill entry points
function useSkillGem(itemId, socketIndex) {
  if (!state || !currentMonster) { addToLog('Kein Gegner!', 'error'); return; }
  let targetItem = null;
  for (const v of Object.values(state.equipment)) { if (v && v.id === itemId) { targetItem = v; break; } }
  if (!targetItem) return;
  const gem = targetItem.sockets[socketIndex] && targetItem.sockets[socketIndex].gem;
  if (!gem || gem.gemType !== 'active') return;

  // Init mana tracking
  if (state.currentMana === undefined) state.currentMana = state.stats.mana || 100;

  // Cooldown check
  const now = Date.now();
  const gd = SKILL_GEMS[gem.name] || {};
  const supports = getLinkedSupports(targetItem, socketIndex);
  const eff = calcEffectiveSkill(gem, supports);

  if (skillCooldowns[gem.name] && (now - skillCooldowns[gem.name]) < eff.cooldown) {
    const remaining = ((eff.cooldown - (now - skillCooldowns[gem.name])) / 1000).toFixed(1);
    addToLog(`⏱ ${gem.name} auf Cooldown (${remaining}s)`, 'system');
    return;
  }

  // Mana check
  if (state.currentMana < eff.mana) {
    addToLog(`💙 Zu wenig Mana! (${state.currentMana}/${eff.mana})`, 'error');
    return;
  }

  state.currentMana -= eff.mana;
  // sync to stats
  if (!state.currentMana && state.stats) state.currentMana = state.stats.mana || 100;
  skillCooldowns[gem.name] = now;

  useGemSkillEff(gem, eff, targetItem);
}

function useGemSkillEff(gem, eff, item) {
  const stats = state.stats;
  let damage = eff.damage;

  if (gem.scale || (SKILL_GEMS[gem.name] && SKILL_GEMS[gem.name].scale)) {
    const scale = (SKILL_GEMS[gem.name] || {}).scale || {};
    Object.entries(scale).forEach(([attr, f]) => { damage += Math.floor((state.attrs[attr]||0) * f); });
  }
  if (state.equipment.weapon) {
    const w = state.equipment.weapon;
    if (w.incPhys) damage += Math.floor(damage * w.incPhys / 100);
    if (w.allDamage) damage += Math.floor(damage * w.allDamage / 100);
  }
  const tags = eff.tags || (SKILL_GEMS[gem.name] && SKILL_GEMS[gem.name].tags) || [];
  if (tags.includes('Fire')) damage += Math.floor(damage * (stats.fireDamage||0) / 100);
  if (tags.includes('Cold')) damage += Math.floor(damage * (stats.coldDamage||0) / 100);
  if (tags.includes('Lightning')) damage += Math.floor(damage * (stats.lightningDamage||0) / 100);
  if (tags.includes('Chaos')) damage += Math.floor(damage * (stats.chaosDamage||0) / 100);
  if (tags.includes('Physical')) damage += Math.floor(damage * (stats.physicalDamage||0) / 100);
  if (tags.includes('Attack') && stats.attackSpeed) damage += Math.floor(damage * stats.attackSpeed / 100);

  const critChance = Math.min(95, (stats.critChance||0) + (eff.crit||0));
  const isCrit = Math.random() * 100 < critChance;
  if (isCrit) damage = Math.floor(damage * (stats.critMulti || 1.5));

  // ----- Pick targets based on skill type -----
  const alive = (waveState ? waveState.enemies.filter(e=>e.hp>0) : (currentMonster ? [currentMonster] : []));
  if (alive.length === 0) return;

  const primary = (currentMonster && currentMonster.hp > 0) ? currentMonster : alive[0];
  let targets = [primary];
  let modeLabel = '';

  if (tags.includes('AoE') || tags.includes('Chaining')) {
    // AoE/Chain: hit ALL alive enemies (PoE-style cleave / cyclone / arc)
    targets = alive.slice();
    modeLabel = tags.includes('AoE') ? ' 💢 AoE' : ' ⚡ Kette';
  } else if (tags.includes('Projectile')) {
    // Projectiles hit N distinct targets
    const projHits = Math.max(1, eff.projCount || 1);
    targets = [];
    const pool = [primary, ...alive.filter(e => e.id !== primary.id)];
    for (let i = 0; i < projHits && i < pool.length; i++) targets.push(pool[i]);
    if (projHits > 1) modeLabel = ` (×${projHits} Projektile)`;
  }

  // Distribute damage
  let totalDmgDealt = 0;
  let firstHit = true;
  targets.forEach(tgt => {
    if (!tgt || tgt.hp <= 0) return;
    // AoE has slight damage falloff after first target so single-target skills stay strong
    const mult = (firstHit ? 1 : (tags.includes('AoE') ? 0.75 : 1));
    const dmg = Math.max(1, Math.floor(damage * mult));
    tgt.hp -= dmg;
    totalDmgDealt += dmg;
    flashEnemy(tgt.id);
    const card = document.getElementById('ec-'+tgt.id);
    showPopup(card || el('monster-box'), '-' + dmg, isCrit ? 'crit' : '');
    firstHit = false;
  });

  const logMsg = `${gem.icon} ${gem.name}${modeLabel}${isCrit ? ': 💥 KRIT' : ':'} ${totalDmgDealt} Schaden${targets.length>1?` an ${targets.length} Gegnern`:''}!`;
  addToLog(logMsg, isCrit ? 'crit' : 'hit');

  // Life leech (off total damage dealt)
  if (eff.leech > 0 && !(waveState && waveState.waveAura && waveState.waveAura.noLeech)) {
    const leeched = Math.floor(totalDmgDealt * eff.leech);
    if (leeched > 0) {
      state.stats.life = Math.min(state.stats.maxLife || state.stats.life, state.stats.life + leeched);
      addToLog(`❤️ Lebensraub: +${leeched}`, 'system');
    }
  }

  flashPlayerCast(targets.filter(t => t && t.hp !== undefined).slice(0, 6), tags);

  // Reflect from any target that still lives
  targets.forEach(tgt => {
    if (tgt.reflect && tgt.hp > 0) {
      const refl = Math.floor(damage * tgt.reflect);
      if (refl > 0) {
        state.stats.life -= refl;
        addToLog(`🪞 Reflektion: ${refl} Schaden an dir!`, 'hit');
        showPopup(el('monster-box'), '-'+refl, '');
      }
    }
  });
  if (state.stats.life <= 0) { playerDeath(); return; }

  // Resolve deaths (in order so kills/charges count cleanly)
  targets.forEach(tgt => { if (tgt.hp <= 0) monsterDefeated(tgt); });

  if (waveState && !waveCombatTimer && waveState.enemies.some(e=>e.hp>0)) startWaveCombatTick();

  renderMonster(); renderWave(); renderCharacter(); renderFlasks(); saveGame();
}

// OLD useSkill still needed for auto-fight & skill buttons
function renderSkills_old() { renderSkills(); }

// ===== ORIGINAL renderSkills replaced =====


