// ============================================
// STATE.JS - Globaler Spielzustand, Hilfsfunktionen,
// Logging
// ============================================

// ========== GAME STATE ==========
let state = null;
let currentMonster = null;
let autoFightTimer = null;
let idleTimer = null;
let currentCharTab = 'stats';
let currentTownTab = 'stash';
let selectedCraftItem = null;
let selectedClass = 'Marauder'; // Default class selection

// Helper functions
const el = (id) => document.getElementById(id);
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);


function addToLog(message, type = '') {
  const logContainer = el('combat-log');
  if (!logContainer) return; // Safety check

  const entry = document.createElement('div');
  entry.className = `log-entry ${type ? 'log-' + type : ''}`;

  // Add icons for certain message types
  if (type === 'hit') entry.innerHTML = `⚔️ ${message}`;
  else if (type === 'crit') entry.innerHTML = `💥 ${message}`;
  else if (type === 'drop') entry.innerHTML = `🎁 ${message}`;
  else if (type === 'death') entry.innerHTML = `☠️ ${message}`;
  else if (type === 'system') entry.innerHTML = `ℹ️ ${message}`;
  else if (type === 'error') entry.innerHTML = `❌ ${message}`;
  else entry.innerHTML = message;

  logContainer.appendChild(entry);
  logContainer.scrollTop = logContainer.scrollHeight;

  // Keep only last 100 entries
  while (logContainer.children.length > 100) {
    logContainer.removeChild(logContainer.firstChild);
  }

  // Also add to state log
  if (state) {
    state.log = state.log || [];
    state.log.push({message, type, time: new Date().toISOString()});
    if (state.log.length > 100) state.log.shift();
  }
}

