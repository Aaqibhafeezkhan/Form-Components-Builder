window.FF = window.FF || {};

FF.Modals = (() => {

  const TEMPLATES = FF.TEMPLATES;
  const modalOpeners = new Map();
  const modalKeyHandlers = new Map();

  function getModalFocusable(modal) {
    return [...modal.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(node => !node.hidden && node.getAttribute('aria-hidden') !== 'true');
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById('modal-overlay');
    if (!modal || !overlay) return;
    if (modal.hidden) modalOpeners.set(modalId, document.activeElement);
    modal.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('modal-overlay--visible');
    overlay.onclick = () => closeModal(modalId);
    const onKeydown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal(modalId);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getModalFocusable(modal);
      if (!focusable.length) { event.preventDefault(); modal.focus(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === modal)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    const previousHandler = modalKeyHandlers.get(modalId);
    if (previousHandler) modal.removeEventListener('keydown', previousHandler);
    modalKeyHandlers.set(modalId, onKeydown);
    modal.addEventListener('keydown', onKeydown);
    const firstFocusable = getModalFocusable(modal)[0];
    if (firstFocusable) requestAnimationFrame(() => firstFocusable.focus());
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById('modal-overlay');
    if (modal) modal.hidden = true;
    if (modal && modalKeyHandlers.has(modalId)) {
      modal.removeEventListener('keydown', modalKeyHandlers.get(modalId));
      modalKeyHandlers.delete(modalId);
    }
    const anyOpen = document.querySelectorAll('.modal:not([hidden])');
    if (!anyOpen.length && overlay) {
      overlay.classList.remove('modal-overlay--visible');
      overlay.setAttribute('aria-hidden', 'true');
    }
    const opener = modalOpeners.get(modalId);
    modalOpeners.delete(modalId);
    if (opener && opener.isConnected && typeof opener.focus === 'function') requestAnimationFrame(() => opener.focus());
  }

  function closeAllModals() {
    const openers = [...modalOpeners.values()];
    document.querySelectorAll('.modal').forEach(modal => {
      const handler = modalKeyHandlers.get(modal.id);
      if (handler) modal.removeEventListener('keydown', handler);
      modal.hidden = true;
    });
    modalKeyHandlers.clear();
    modalOpeners.clear();
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.classList.remove('modal-overlay--visible');
      overlay.setAttribute('aria-hidden', 'true');
    }
    const opener = openers[0];
    if (opener && opener.isConnected && typeof opener.focus === 'function') requestAnimationFrame(() => opener.focus());
  }

  function confirm(message, onConfirm, { title = 'Confirm', okLabel = 'Confirm', dangerOk = true } = {}) {
    const modal = document.getElementById('modal-confirm');
    const msgEl = document.getElementById('modal-confirm-message');
    const titleEl = document.getElementById('modal-confirm-title');
    const okBtn = document.getElementById('modal-confirm-ok');
    const cancelBtn = document.getElementById('modal-confirm-cancel');

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (okBtn) {
      okBtn.textContent = okLabel;
      okBtn.className = 'btn ' + (dangerOk ? 'btn--danger' : 'btn--primary');
    }
    openModal('modal-confirm');

    const handleOk = () => {
      cleanup();
      closeModal('modal-confirm');
      if (onConfirm) onConfirm();
    };
    const handleCancel = () => { cleanup(); closeModal('modal-confirm'); };

    function cleanup() {
      okBtn && okBtn.removeEventListener('click', handleOk);
      cancelBtn && cancelBtn.removeEventListener('click', handleCancel);
    }

    okBtn && okBtn.addEventListener('click', handleOk);
    cancelBtn && cancelBtn.addEventListener('click', handleCancel);
  }

  function renderExportModal() {
    const body = document.getElementById('modal-export-body');
    if (!body) return;
    const state = FF.appState;

    const tabs = ['JSON Schema', 'Form JSON', 'HTML', 'React JSX'];
    let activeTab = 'JSON Schema';

    function getCode(tab) {
      if (tab === 'JSON Schema')  return FF.Export.buildJsonSchema(state);
      if (tab === 'Form JSON')    return FF.Export.buildFormJson(state);
      if (tab === 'HTML')         return FF.Export.buildHtml(state);
      if (tab === 'React JSX')    return FF.Export.buildReactJsx(state);
      return '';
    }

    function getLang(tab) {
      if (tab === 'React JSX') return 'javascript';
      if (tab === 'HTML') return 'html';
      return 'json';
    }

    function renderTabs() {
      const code = getCode(activeTab);
      const lang = getLang(activeTab);
      let highlighted = FF.Safe.escapeHtml(code);
      try {
        if (window.hljs) highlighted = window.hljs.highlight(code, { language: lang }).value;
      } catch(e) { highlighted = FF.Safe.escapeHtml(code); }

      body.innerHTML = `
        <div class="export-tabs" role="tablist">
          ${tabs.map(t => `<button class="export-tab-btn${t === activeTab ? ' export-tab-btn--active' : ''}" data-tab="${t}" role="tab" aria-selected="${t === activeTab}">${t}</button>`).join('')}
        </div>
        <div class="export-code-wrap">
          <pre class="export-code"><code class="hljs language-${lang}">${highlighted}</code></pre>
        </div>
        <div class="export-actions">
          <button class="btn btn--ghost" id="btn-export-copy">Copy to Clipboard</button>
          <button class="btn btn--ghost" id="btn-export-download">Download File</button>
          <button class="btn btn--ghost btn--sm" id="btn-export-qr">Generate QR</button>
        </div>
        <div id="export-qr-container" class="export-qr-container" style="display:none"></div>
      `;

      body.querySelectorAll('.export-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          activeTab = btn.getAttribute('data-tab');
          renderTabs();
        });
      });

      document.getElementById('btn-export-copy')?.addEventListener('click', () => {
        navigator.clipboard.writeText(code).then(() => {
          const btn = document.getElementById('btn-export-copy');
          if (btn) { btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = 'Copy to Clipboard'; }, 2000); }
        });
      });

      document.getElementById('btn-export-download')?.addEventListener('click', () => {
        const extMap = { 'JSON Schema': '.schema.json', 'Form JSON': '.form.json', 'HTML': '.html', 'React JSX': '.jsx' };
        const ext = extMap[activeTab] || '.txt';
        const filename = (state.formConfig.title || 'form').replace(/[^a-z0-9]/gi, '-').toLowerCase() + ext;
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      });

      document.getElementById('btn-export-qr')?.addEventListener('click', () => {
        const qrContainer = document.getElementById('export-qr-container');
        if (!qrContainer) return;
        qrContainer.style.display = '';
        qrContainer.innerHTML = '<p style="font-size:12px;color:var(--color-text-muted);margin-bottom:8px">QR code for form JSON data URL:</p><div id="qr-code-inner"></div>';
        const dataStr = 'data:application/json;charset=utf-8,' + encodeURIComponent(FF.Export.buildFormJson(state));
        if (dataStr.length > 2953) {
          qrContainer.innerHTML = '<p style="color:var(--color-danger)">The form is too large for a QR code (about 2.9 KB). Use the JSON download instead.</p>';
        } else if (window.QRCode) {
          new QRCode(document.getElementById('qr-code-inner'), {
            text: safeStr,
            width: 180,
            height: 180,
            colorDark: '#1F2937',
            colorLight: '#FFFFFF',
          });
        } else {
          qrContainer.innerHTML = '<p style="color:var(--color-danger)">QR library not loaded.</p>';
        }
      });
    }

    renderTabs();
  }

  function renderImportModal() {
    const body = document.getElementById('modal-import-body');
    if (!body) return;

    body.innerHTML = `
      <p class="modal-hint">Paste your FormForge JSON below, or upload a file.</p>
      <div class="import-upload-row">
        <label class="btn btn--ghost btn--sm" for="import-file-input">Upload JSON File</label>
        <input type="file" id="import-file-input" accept=".json,application/json" style="display:none">
      </div>
      <textarea id="import-json-textarea" class="prop-input prop-input--textarea import-textarea" rows="12" placeholder='{ "formConfig": {...}, "elements": [...] }'></textarea>
      <div id="import-error" class="import-error" role="alert" aria-live="polite" style="display:none"></div>
      <div class="modal__footer">
        <button class="btn btn--ghost" id="btn-import-cancel">Cancel</button>
        <button class="btn btn--primary" id="btn-import-confirm">Import</button>
      </div>
    `;

    document.getElementById('btn-import-cancel')?.addEventListener('click', () => closeModal('modal-import'));

    document.getElementById('import-file-input')?.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const textarea = document.getElementById('import-json-textarea');
        if (textarea) textarea.value = ev.target.result;
      };
      reader.readAsText(file);
    });

    document.getElementById('btn-import-confirm')?.addEventListener('click', () => {
      const raw = document.getElementById('import-json-textarea')?.value?.trim();
      const errEl = document.getElementById('import-error');
      if (!raw) { showImportError(errEl, 'Please paste or upload a JSON file.'); return; }
      if (raw.length > 1024 * 1024) { showImportError(errEl, 'Import files must be 1 MB or smaller.'); return; }
      let parsed;
      try { parsed = JSON.parse(raw); }
      catch (e) { showImportError(errEl, 'Invalid JSON: ' + e.message); return; }

      let data = parsed;
      if (parsed.data && parsed.version) data = parsed.data;

      const validation = FF.Validation.validateImport(data, {strict:true});
      if (!validation.valid) {
        showImportError(errEl, 'Import validation failed:\n' + validation.errors.join('\n'));
        return;
      }

      const hasContent = FF.appState.elements.length > 0;
      if (hasContent) {
        confirm('Importing will replace all current canvas content. Continue?', () => {
          doImport(data);
        });
      } else {
        doImport(data);
      }
    });
  }

  function showImportError(errEl, msg) {
    if (!errEl) return;
    errEl.style.display = '';
    errEl.textContent = msg;
  }

  function doImport(data) {
    const elements = (data.elements || []).map((el, i) => {
      if (!el.id) el.id = FF.Storage.generateId();
      if (!el.meta) el.meta = { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), cssClass: '' };
      if (!el.conditionalLogic) el.conditionalLogic = { enabled: false, rules: [], logicOperator: 'AND' };
      if (!el.props) el.props = {};
      if (!el.props.validation) el.props.validation = {};
      el.order = i;
      return el;
    });
    FF.dispatch({ type: FF.ACTIONS.IMPORT_FORM, formConfig: data.formConfig, elements, theme: data.activeTheme });
    closeModal('modal-import');
    announce('Form imported successfully — ' + elements.length + ' elements loaded.');
  }

  function renderSettingsModal() {
    const body = document.getElementById('modal-settings-body');
    if (!body) return;
    const state = FF.appState;
    const cfg = state.formConfig;

    body.innerHTML = `
      <div class="settings-grid">
        <section class="settings-section">
          <h3 class="settings-section__title">General</h3>
          <div class="prop-field">
            <label class="prop-label" for="set-title">Form Title</label>
            <input type="text" id="set-title" class="prop-input" value="${escHtml(cfg.title || '')}">
          </div>
          <div class="prop-field">
            <label class="prop-label" for="set-desc">Description</label>
            <textarea id="set-desc" class="prop-input prop-input--textarea" rows="3">${escHtml(cfg.description || '')}</textarea>
          </div>
          <div class="prop-field">
            <label class="prop-label" for="set-submit-label">Submit Button Label</label>
            <input type="text" id="set-submit-label" class="prop-input" value="${escHtml(cfg.submitLabel || 'Submit')}">
          </div>
          <div class="prop-field">
            <label class="prop-label" for="set-success-msg">Success Message</label>
            <textarea id="set-success-msg" class="prop-input prop-input--textarea" rows="2">${escHtml(cfg.successMessage || '')}</textarea>
          </div>
          <div class="prop-field">
            <label class="prop-label" for="set-redirect">Redirect URL (optional)</label>
            <input type="url" id="set-redirect" class="prop-input" value="${escHtml(cfg.redirectUrl || '')}" placeholder="https://...">
          </div>
        </section>

        <section class="settings-section">
          <h3 class="settings-section__title">Validation</h3>
          <div class="prop-field">
            <label class="prop-label" for="set-validation-mode">Validation Mode</label>
            <select id="set-validation-mode" class="prop-input">
              <option value="onSubmit"  ${cfg.validationMode === 'onSubmit'  ? 'selected' : ''}>On Submit</option>
              <option value="onBlur"    ${cfg.validationMode === 'onBlur'    ? 'selected' : ''}>On Blur</option>
              <option value="realtime"  ${cfg.validationMode === 'realtime'  ? 'selected' : ''}>Real-time</option>
            </select>
          </div>
        </section>

        <section class="settings-section">
          <h3 class="settings-section__title">Theme</h3>
          <div class="theme-picker" role="group" aria-label="Form theme">
            ${['default','dark','minimal','corporate'].map(t =>
              `<button class="theme-btn${state.activeTheme === t ? ' theme-btn--active' : ''}" data-theme="${t}" aria-pressed="${state.activeTheme === t}">${t.charAt(0).toUpperCase() + t.slice(1)}</button>`
            ).join('')}
          </div>
        </section>

        <section class="settings-section settings-section--full">
          <h3 class="settings-section__title">Custom CSS</h3>
          <textarea id="set-custom-css" class="prop-input prop-input--textarea prop-input--code" rows="6" placeholder="/* custom CSS applied to preview */">${escHtml(cfg.customCss || '')}</textarea>
        </section>
      </div>
      <div class="modal__footer">
        <button class="btn btn--ghost" id="btn-settings-cancel">Cancel</button>
        <button class="btn btn--primary" id="btn-settings-save">Save Settings</button>
      </div>
    `;

    body.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.getAttribute('data-theme');
        body.querySelectorAll('.theme-btn').forEach(b => { b.classList.remove('theme-btn--active'); b.setAttribute('aria-pressed', 'false'); });
        btn.classList.add('theme-btn--active');
        btn.setAttribute('aria-pressed', 'true');
      });
    });

    document.getElementById('btn-settings-cancel')?.addEventListener('click', () => closeModal('modal-settings'));
    document.getElementById('btn-settings-save')?.addEventListener('click', () => {
      const title = document.getElementById('set-title')?.value;
      const description = document.getElementById('set-desc')?.value;
      const submitLabel = document.getElementById('set-submit-label')?.value;
      const successMessage = document.getElementById('set-success-msg')?.value;
      const redirectUrl = document.getElementById('set-redirect')?.value?.trim();
      const validationMode = document.getElementById('set-validation-mode')?.value;
      const customCss = document.getElementById('set-custom-css')?.value;
      const activeThemeBtn = body.querySelector('.theme-btn--active');
      const selectedTheme = activeThemeBtn ? activeThemeBtn.getAttribute('data-theme') : state.activeTheme;

      if (!FF.Safe.isSafeRedirectUrl(redirectUrl)) { const input=document.getElementById('set-redirect'); if(input){input.setAttribute('aria-invalid','true');input.focus();} announce('Enter a valid HTTP or HTTPS redirect URL.'); return; }
      const cssCheck = FF.Safe.checkCustomCss(customCss);
      if (!cssCheck.ok) { const input=document.getElementById('set-custom-css'); if(input){input.setAttribute('aria-invalid','true');input.focus();} announce(cssCheck.reason); return; }
      FF.dispatch({ type: FF.ACTIONS.UPDATE_FORM_CONFIG, config: { title, description, submitLabel, successMessage, redirectUrl, validationMode, customCss } });
      FF.dispatch({ type: FF.ACTIONS.SET_THEME, theme: selectedTheme });
      closeModal('modal-settings');
      announce('Settings saved');
    });
  }

  function renderTemplatesModal() {
    const body = document.getElementById('modal-templates-body');
    if (!body) return;

    const saveAsSection = `<div class="template-save-section">
      <h3 class="settings-section__title">Save Current Form as Template</h3>
      <div class="template-save-row">
        <input type="text" id="template-save-name" class="prop-input" placeholder="Template name...">
        <button class="btn btn--ghost" id="btn-save-template">Save</button>
      </div>
    </div>`;

    const templateGrid = TEMPLATES.map((tpl, i) => `
      <div class="template-card" data-tpl="${i}">
        <div class="template-card__icon">${getTemplateIcon(tpl.name)}</div>
        <div class="template-card__info">
          <h4 class="template-card__name">${tpl.name}</h4>
          <p class="template-card__desc">${tpl.description}</p>
          <div class="template-card__actions">
            <button class="btn btn--ghost btn--sm" data-preview-tpl="${i}">Preview</button>
            <button class="btn btn--primary btn--sm" data-load-tpl="${i}">Use Template</button>
          </div>
        </div>
      </div>
    `).join('');

    body.innerHTML = `${saveAsSection}<div class="template-grid">${templateGrid}</div><div id="template-preview-area" class="template-preview-area" style="display:none"></div>`;

    body.querySelectorAll('[data-load-tpl]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tpl = TEMPLATES[Number(btn.getAttribute('data-load-tpl'))];
        const hasContent = FF.appState.elements.length > 0;
        const doLoad = () => {
          const elements = tpl.elements.map((e, i) => {
            const el = FF.ElementFactory.create(e.type);
            el.props = Object.assign({}, el.props, e);
            el.order = i;
            return el;
          });
          const validation = FF.Validation.validateImport({formConfig:tpl.formConfig,elements,activeTheme:FF.appState.activeTheme},{strict:true});
          if (!validation.valid) { announce('Template could not be loaded: ' + validation.errors.join(' ')); return; }
          FF.dispatch({ type: FF.ACTIONS.LOAD_TEMPLATE, formConfig: tpl.formConfig, elements, name: tpl.name });
          closeModal('modal-templates');
          announce('Template "' + tpl.name + '" loaded');
        };
        if (hasContent) {
          confirm('Loading a template will replace your current form. Continue?', doLoad);
        } else {
          doLoad();
        }
      });
    });

    body.querySelectorAll('[data-preview-tpl]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tpl = TEMPLATES[Number(btn.getAttribute('data-preview-tpl'))];
        const area = document.getElementById('template-preview-area');
        if (!area) return;
        area.style.display = '';
        const fieldsList = tpl.elements.map(e => `<li>${FF.Safe.escapeHtml(e.label || e.type)}${e.required ? ' *' : ''}</li>`).join('');
        area.innerHTML = `<div class="template-preview-box">
          <h4>${FF.Safe.escapeHtml(tpl.formConfig.title)}</h4>
          <p>${FF.Safe.escapeHtml(tpl.formConfig.description)}</p>
          <ul>${fieldsList}</ul>
          <button class="btn btn--ghost btn--sm" id="btn-close-tpl-preview">Close Preview</button>
        </div>`;
        document.getElementById('btn-close-tpl-preview')?.addEventListener('click', () => { area.style.display = 'none'; });
      });
    });

    document.getElementById('btn-save-template')?.addEventListener('click', () => {
      const name = document.getElementById('template-save-name')?.value?.trim();
      if (!name) { announce('Please enter a template name.'); return; }
      if (name.length > 100) { announce('Template names must be 100 characters or fewer.'); return; }
      let inlineTemplates;
      try { inlineTemplates = JSON.parse(localStorage.getItem('ff_custom_templates') || '[]'); }
      catch (error) { announce('Saved templates could not be read; existing data was left unchanged.'); return; }
      if (!Array.isArray(inlineTemplates)) { announce('Saved templates are invalid; existing data was left unchanged.'); return; }
      if (inlineTemplates.length >= 50) { announce('A maximum of 50 custom templates can be saved.'); return; }
      const templateValidation = FF.Validation.validateImport({formConfig:FF.appState.formConfig,elements:FF.appState.elements,activeTheme:FF.appState.activeTheme},{strict:true});
      if (!templateValidation.valid) { announce('Current form cannot be saved as a template: ' + templateValidation.errors.join(' ')); return; }
      inlineTemplates.push({
        name,
        formConfig: FF.appState.formConfig,
        elements: FF.appState.elements,
        savedAt: new Date().toISOString(),
      });
      try { localStorage.setItem('ff_custom_templates', JSON.stringify(inlineTemplates)); }
      catch (error) { announce('Template could not be saved. Check available browser storage.'); return; }
      announce('Template "' + name + '" saved');
      closeModal('modal-templates');
    });
  }

  function getTemplateIcon(name) {
    const icons = {
      'Contact Form':    '&#9993;',
      'Registration Form':'&#128100;',
      'Survey':          '&#128203;',
      'Job Application': '&#128188;',
      'Feedback Form':   '&#128172;',
      'Event RSVP':      '&#128197;',
      'Order Form':      '&#128722;',
    };
    return icons[name] || '&#128196;';
  }

  function renderHistoryModal() {
    const body = document.getElementById('modal-history-body');
    if (!body) return;

    const exportCsvBtn = `<div class="modal-hint" style="display:flex;justify-content:space-between;align-items:center">
      <span>Session activity log (${FF.activityLog.length} events)</span>
      <button class="btn btn--ghost btn--sm" id="btn-export-history-csv">Export CSV</button>
    </div>`;

    const rows = FF.activityLog.length === 0
      ? '<li class="history-item">No activity yet.</li>'
      : FF.activityLog.map(entry => {
          const d = new Date(entry.timestamp);
          const time = d.toLocaleTimeString();
          return `<li class="history-item"><span class="history-item__time">${time}</span><span class="history-item__msg">${FF.Safe.escapeHtml(entry.message)}</span></li>`;
        }).join('');

    body.innerHTML = `${exportCsvBtn}<ul class="history-list" role="log" aria-live="polite">${rows}</ul>`;

    document.getElementById('btn-export-history-csv')?.addEventListener('click', () => {
      const csv = 'Timestamp,Action\n' + FF.activityLog.map(e => `"${e.timestamp}","${e.message.replace(/"/g,'""')}"`).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'formforge-history.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function announce(msg) {
    const el = document.getElementById('sr-announcer');
    if (el) { el.textContent = ''; setTimeout(() => { el.textContent = msg; }, 50); }
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function init() {
    document.getElementById('btn-settings')?.addEventListener('click', () => {
      renderSettingsModal();
      openModal('modal-settings');
    });
    document.getElementById('modal-settings-close')?.addEventListener('click', () => closeModal('modal-settings'));

    document.getElementById('btn-export')?.addEventListener('click', () => {
      openModal('modal-export');
      renderExportModal();
    });
    document.getElementById('modal-export-close')?.addEventListener('click', () => closeModal('modal-export'));

    document.getElementById('btn-import')?.addEventListener('click', () => {
      renderImportModal();
      openModal('modal-import');
    });
    document.getElementById('modal-import-close')?.addEventListener('click', () => closeModal('modal-import'));

    document.getElementById('btn-templates')?.addEventListener('click', () => {
      renderTemplatesModal();
      openModal('modal-templates');
    });
    document.getElementById('modal-templates-close')?.addEventListener('click', () => closeModal('modal-templates'));

    document.getElementById('btn-history')?.addEventListener('click', () => {
      renderHistoryModal();
      openModal('modal-history');
    });
    document.getElementById('modal-history-close')?.addEventListener('click', () => closeModal('modal-history'));

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeAllModals();
    });
  }

  return { init, confirm, openModal, closeModal, closeAllModals };
})();
