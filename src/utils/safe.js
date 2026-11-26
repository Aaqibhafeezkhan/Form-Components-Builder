window.FF = window.FF || {};
FF.Safe = (() => {
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function jsxString(value) {
    return '{' + JSON.stringify(String(value == null ? '' : value)).replace(/\//g,'\\u002f') + '}';
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
  function hasDangerousKeys(value) {
    const seen=new WeakSet();
    let nodes=0;
    function visit(item,depth) {
      nodes++;
      if(nodes>5000||depth>12) return true;
      if(item===null||typeof item!=='object') return false;
      if(seen.has(item)) return true;
      seen.add(item);
      let keys;
      try { keys=Object.keys(item); } catch(error) { return true; }
      for(const key of keys) {
        if(key==='__proto__'||key==='constructor'||key==='prototype') return true;
        let child;
        try { child=item[key]; } catch(error) { return true; }
        if(visit(child,depth+1)) return true;
      }
      return false;
    }
    return visit(value,0);
  }
  function checkCustomCss(css) {
    const raw=String(css==null?'':css);
    if(raw.length>20000) return {ok:false,reason:'Custom CSS must be 20,000 characters or fewer.'};
    if(raw.includes('\\')) return {ok:false,reason:'Custom CSS cannot contain backslashes.'};
    if(/@import|url\s*\(|expression\s*\(|javascript\s*:|behavior\s*:|-moz-binding|<\/style/i.test(raw)) return {ok:false,reason:'Custom CSS contains a disallowed construct.'};
    return {ok:true,reason:''};
  }
  return {escapeHtml,jsxString,isSafeRedirectUrl,isSafeId,hasDangerousKeys,checkCustomCss};
})();