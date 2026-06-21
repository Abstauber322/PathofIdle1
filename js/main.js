// ============================================
// MAIN.JS - Initialisierung (wird zuletzt geladen)
// ============================================

function init() {
  // Load game
  state = loadGame();

  // Render class selection
  renderClassSelection();

  if (state) {
    // If we have a saved game, hide class selection, show nav
    el('section-char-select').classList.add('hidden');
    const navBar = el('nav-bar');
    if (navBar) { navBar.classList.remove('hidden'); navBar.style.display = 'flex'; }

    showSection('char');

    ensureFlasks();

    // Initialize game
    renderCharacter();
    renderInventory();
    renderTree();
    renderSkills();
    renderSkillBar();
    renderFlasks();
    renderMap();
    renderTown();

    updateGoldDisplay();
    if (typeof updateNavCombatState === 'function') updateNavCombatState();
    addToLog(`Willkommen zurück, ${state.name}!`, 'system');
    if (state._equipSlotFixNotice) {
      addToLog(`🔧 Ausrüstungssystem aktualisiert: ${state._equipSlotFixNotice} falsch sitzende(s) Item(s) wurden zurück ins Inventar gelegt.`, 'system');
      delete state._equipSlotFixNotice;
      saveGame();
    }
  } else {
    // Show class selection
    showSection('char-select');
    addToLog("Wähle eine Klasse, um zu beginnen.", 'system');
  }

  // Auto-save every 30 seconds
  setInterval(() => {
    if (state) saveGame();
  }, AUTO_SAVE_INTERVAL);
}

// Start the game when loaded
window.onload = init;
