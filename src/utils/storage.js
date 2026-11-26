window.FF = window.FF || {};

FF.Storage = (() => {
  const STORAGE_KEY = 'formforge_enterprise_v1';
  let loadStatus = 'empty';

  function generateId() {
    const cryptoApi=typeof crypto!=='undefined'?crypto:null;
    if(cryptoApi&&typeof cryptoApi.randomUUID==='function') return cryptoApi.randomUUID();
    if(cryptoApi&&typeof cryptoApi.getRandomValues==='function') {
      const bytes=new Uint8Array(16);
      cryptoApi.getRandomValues(bytes);
      bytes[6]=(bytes[6]&0x0f)|0x40;
      bytes[8]=(bytes[8]&0x3f)|0x80;
      const hex=Array.from(bytes,value=>value.toString(16).padStart(2,'0')).join('');
      return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
      const r=(Math.random()*16)|0;
      return (c==='x'?r:(r&0x3)|0x8).toString(16);
    });
  }

  function save(state) {
    if (loadStatus === 'invalid' || loadStatus === 'unsupported') return false;
    try {
      const payload = {
        version: FF.SCHEMA_VERSION,
        savedAt: new Date().toISOString(),
        data: {
          formConfig: state.formConfig,
          elements: state.elements,
          activeTheme: state.activeTheme,
        },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      loadStatus = 'loaded';
      return true;
    } catch (err) {
      console.warn('[Storage] Save failed:', err);
      return false;
    }
  }

  function load() {
    let raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      loadStatus = 'invalid';
      console.warn('[Storage] Read failed:', err);
      return null;
    }
    if (!raw) {
      loadStatus = 'empty';
      return null;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      loadStatus = 'invalid';
      console.warn('[Storage] Load failed:', err);
      return null;
    }
    if (!parsed || typeof parsed !== 'object' || parsed.version !== FF.SCHEMA_VERSION) {
      loadStatus = 'unsupported';
      return null;
    }
    const validation = FF.Validation.validateImport(parsed.data);
    if (!validation.valid) {
      loadStatus = 'invalid';
      return null;
    }
    const data=parsed.data;
    if(data.formConfig.customCss!==undefined&&!FF.Safe.checkCustomCss(data.formConfig.customCss).ok) {
      data.formConfig.customCss='';
      loadStatus='sanitized';
    } else {
      loadStatus='loaded';
    }
    return data;
  }

  function clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      loadStatus = 'empty';
    } catch (err) {
      console.warn('[Storage] Clear failed:', err);
    }
  }

  function getLoadStatus() {
    return loadStatus;
  }

  function formatSaveTime(date) {
    if (!date) return 'Not saved yet';
    const diff = Date.now() - new Date(date).getTime();
    if (diff < 5000) return 'Just saved';
    if (diff < 60000) return Math.floor(diff / 1000) + 's ago';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    return new Date(date).toLocaleTimeString();
  }

  return { generateId, save, load, clear, getLoadStatus, formatSaveTime };
})();