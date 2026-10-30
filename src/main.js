window.FF = window.FF || {};

FF.init = function () {
  if (FF._initialized) return;
  FF._initialized = true;

  const saved = FF.Storage.load();
  const storageStatus = FF.Storage.getLoadStatus();
  if (saved) {
    FF.appState.formConfig = Object.assign({}, FF.DEFAULT_FORM_CONFIG, saved.formConfig);
    FF.appState.elements = saved.elements.map((e, i) => Object.assign({}, e, { order: i }));
    if (['default', 'dark', 'minimal', 'corporate'].includes(saved.activeTheme)) {
      FF.appState.activeTheme = saved.activeTheme;
    }
  }

  FF.Palette.init();
  FF.Canvas.init();
  FF.PropertiesPanel.init();
  FF.Toolbar.init();
  FF.Preview.init();
  FF.Modals.init();

  FF.Toolbar.applyTheme(FF.appState.activeTheme);

  if (storageStatus === 'invalid' || storageStatus === 'unsupported') {
    const savedEl = document.getElementById('status-last-saved');
    if (savedEl) {
      savedEl.textContent = storageStatus === 'unsupported'
        ? 'Saved data uses an unsupported version; original data preserved'
        : 'Saved data is invalid; original data preserved';
      savedEl.setAttribute('role', 'status');
      savedEl.title = 'Export or recover your saved data before clearing browser storage. Autosave is paused to prevent overwriting it.';
    }
    FF.appState.isDirty = true;
  }

  let autosaveTimer = null;
  FF.EventBus.on('state:changed', () => {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      if (FF.appState.isDirty) {
        const savedSuccessfully = FF.Storage.save(FF.appState);
        if (savedSuccessfully) FF.dispatch({ type: FF.ACTIONS.MARK_SAVED });
        else console.warn('[FormForge] Autosave failed; edits remain unsaved.');
      }
    }, FF.AUTOSAVE_DELAY);
  });

  if (FF.appState.elements.length > 0) {
    FF.Canvas.render();
    FF.Toolbar.updateAutosaveIndicator();
  }

  console.log('[FormForge] Initialized successfully');
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', FF.init);
} else {
  FF.init();
}
