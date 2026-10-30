window.FF = window.FF || {};
FF.Safe = (() => {
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function isSafeRedirectUrl(value) {
    const raw=String(value||'').trim();
    if(!raw) return true;
    if(raw.length>2048) return false;
    try { const url=new URL(raw); return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password; }
    catch(error) { return false; }
  }
  function isSafeId(value) {
    const id=String(value||'');
    return /^[A-Za-z0-9_-]{1,80}$/.test(id)&&!['__proto__','prototype','constructor'].includes(id.toLowerCase());
  }
  return {escapeHtml,isSafeRedirectUrl,isSafeId};
})();
