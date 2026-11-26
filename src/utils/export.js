window.FF = window.FF || {};

FF.Export = (() => {
  const escape=FF.Safe.escapeHtml;
  const validNumber=value=>value!==undefined&&value!==null&&value!==''&&Number.isFinite(Number(value));
  const numberAttr=(name,value)=>validNumber(value)?' '+name+'="'+escape(Number(value))+'"':'';
  const validPattern=value=>{
    const pattern=String(value==null?'':value);
    if(!pattern||pattern.length>200) return '';
    try { new RegExp(pattern); return pattern; } catch(error) { return ''; }
  };
  const widthValue=value=>[25,50,75,100].includes(Number(value))?Number(value):100;

  function buildJsonSchema(state) {
    const { formConfig, elements } = state;
    const props = {};
    const required = [];
    elements.forEach(el => {
      if (!el||!FF.Safe.isSafeId(el.id)||['divider','section-header','rich-text'].includes(el.type)) return;
      const p=el.props||{};
      const schema = { type: 'string', title: p.label||'' };
      if (p.helperText) schema.description = p.helperText;
      if (p.defaultValue !== undefined && p.defaultValue !== '') schema.default = p.defaultValue;
      if (el.type === 'number' || el.type === 'slider') schema.type = 'number';
      else if (el.type === 'checkbox') schema.type = 'boolean';
      else if (el.type === 'multi-select' || el.type === 'checkbox-group') {
        schema.type = 'array';
        schema.items = { type: 'string', enum: Array.isArray(p.options)?p.options:[] };
      } else if (['dropdown','radio'].includes(el.type)) schema.enum = Array.isArray(p.options)?p.options:[];
      if (el.type==='email') schema.format='email';
      if (el.type==='url') schema.format='uri';
      if (el.type==='date') schema.format='date';
      if (el.type==='time') schema.format='time';
      const rules=p.validation||{};
      if(validNumber(rules.minLength)) schema.minLength=Number(rules.minLength);
      if(validNumber(rules.maxLength)) schema.maxLength=Number(rules.maxLength);
      if(validPattern(rules.pattern)) schema.pattern=validPattern(rules.pattern);
      if(validNumber(rules.min)) schema.minimum=Number(rules.min);
      if(validNumber(rules.max)) schema.maximum=Number(rules.max);
      props[el.id] = schema;
      if (p.required) required.push(el.id);
    });
    return JSON.stringify({
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: formConfig.title,
      description: formConfig.description,
      type: 'object',
      properties: props,
      required,
    }, null, 2);
  }

  function renderPreviewField(el) {
    if(!el||!FF.Safe.isSafeId(el.id)) return '';
    const {type,props={},id}=el;
    const label=escape(props.label||'');
    const ph=escape(props.placeholder||'');
    const helper=props.helperText?'<p style="font-size:12px;color:#6B7280;margin-top:4px">'+escape(props.helperText)+'</p>':'';
    const width=widthValue(props.width);
    const req=props.required?' required':'';
    const reqMark=props.required?'<span style="color:#EF4444">*</span>':'';
    const validation=props.validation||{};
    const min=numberAttr('min',validation.min),max=numberAttr('max',validation.max);
    const pattern=validPattern(validation.pattern);
    const patternAttr=pattern?' pattern="'+escape(pattern)+'"':'';
    const minLength=validNumber(validation.minLength)?numberAttr('minlength',validation.minLength):'';
    const maxLength=validNumber(validation.maxLength)?numberAttr('maxlength',validation.maxLength):'';
    const rows=validNumber(props.rows)?Number(props.rows):4;
    const common='id="'+escape(id)+'" name="'+escape(id)+'"';
    const wrap=inner=>'<div style="margin-bottom:16px;width:'+width+'%"><label for="'+escape(id)+'" style="display:block;font-weight:500;margin-bottom:4px;font-size:14px">'+label+' '+reqMark+'</label>'+inner+helper+'</div>';
    const style=' style="width:100%;padding:8px 12px;border:1px solid #D1D5DB;border-radius:6px;font-size:14px;box-sizing:border-box"';
    if(['text','email','tel','url'].includes(type)) return wrap('<input type="'+type+'" '+common+' placeholder="'+ph+'"'+req+minLength+maxLength+patternAttr+style+'>');
    if(type==='textarea') return wrap('<textarea '+common+' placeholder="'+ph+'" rows="'+rows+'"'+req+minLength+maxLength+patternAttr+style+'></textarea>');
    if(type==='number'||type==='slider') return wrap('<input type="'+(type==='slider'?'range':'number')+'" '+common+' placeholder="'+ph+'"'+min+max+req+patternAttr+style+'>');
    if(type==='dropdown'||type==='multi-select') {
      const options=(Array.isArray(props.options)?props.options:[]).map(o=>'<option value="'+escape(o)+'">'+escape(o)+'</option>').join('');
      return wrap('<select '+common+(type==='multi-select'?' multiple':'')+req+style+'>'+(type==='dropdown'?'<option value="">-- Select --</option>':'')+options+'</select>');
    }
    if(type==='radio') {
      const radios=(Array.isArray(props.options)?props.options:[]).map((o,i)=>'<label style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><input type="radio" name="'+escape(id)+'" value="'+escape(o)+'"'+(i===0&&props.required?req:'')+'> '+escape(o)+'</label>').join('');
      return wrap(radios);
    }
    if(type==='checkbox') return '<div style="margin-bottom:16px;display:flex;align-items:center;gap:8px"><input type="checkbox" '+common+req+'><label for="'+escape(id)+'" style="font-size:14px">'+label+'</label></div>';
    if(type==='checkbox-group') {
      const checks=(Array.isArray(props.options)?props.options:[]).map(o=>'<label style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><input type="checkbox" name="'+escape(id)+'" value="'+escape(o)+'"> '+escape(o)+'</label>').join('');
      return wrap('<div data-required-group="'+(props.required?'true':'false')+'">'+checks+'</div>');
    }
    if(type==='date'||type==='time'||type==='file') return wrap('<input type="'+type+'" '+common+req+' style="font-size:14px">');
    if(type==='toggle') return '<div style="margin-bottom:16px;display:flex;align-items:center;gap:12px"><input type="checkbox" '+common+' role="switch"'+req+'><label for="'+escape(id)+'" style="font-size:14px;font-weight:500">'+label+'</label></div>';
    if(type==='rating') return wrap('<div style="display:flex;gap:8px">'+[1,2,3,4,5].map(n=>'<label style="cursor:pointer;font-size:24px"><input type="radio" name="'+escape(id)+'" value="'+n+'" style="position:absolute;opacity:0"> &#9733;</label>').join('')+'</div>');
    if(type==='divider') return '<hr style="margin:16px 0;border:none;border-top:1px solid #E5E7EB">';
    if(type==='section-header') return '<h3 style="font-size:18px;font-weight:600;margin:24px 0 8px">'+label+'</h3>';
    if(type==='rich-text') return '<div style="font-size:14px;color:#374151;margin-bottom:16px">'+label+'</div>';
    if(type==='hidden') return '<input type="hidden" '+common+' value="'+escape(props.defaultValue==null?'':props.defaultValue)+'">';
    if(type==='signature') return wrap('<canvas '+common+' width="400" height="120" style="border:1px solid #D1D5DB;border-radius:6px;cursor:crosshair;display:block"></canvas>');
    return '';
  }

  function buildHtml(state) {
    const {formConfig,elements}=state;
    const cfg=formConfig||{};
    const fields=(Array.isArray(elements)?elements:[]).map(renderPreviewField).filter(Boolean).join('\n');
    return '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>'+escape(cfg.title||'')+'</title>\n  <style>\n    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }\n    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #F3F4F6; color: #111827; padding: 40px 20px; }\n    .form-wrap { max-width: 680px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,.08); padding: 40px; }\n    h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }\n    .form-desc { color: #6B7280; font-size: 14px; margin-bottom: 32px; }\n    .form-fields { display: flex; flex-wrap: wrap; gap: 0; }\n    .btn-submit { background: #4F46E5; color: #fff; border: none; padding: 12px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 24px; }\n    .btn-submit:hover { background: #4338CA; }\n    .success-msg { display:none; background:#D1FAE5; border:1px solid #6EE7B7; border-radius:8px; padding:16px; color:#065F46; font-weight:500; margin-top:16px; }\n  </style>\n</head>\n<body>\n  <div class="form-wrap">\n    <h1>'+escape(cfg.title||'')+'</h1>\n    '+(cfg.description?'<p class="form-desc">'+escape(cfg.description)+'</p>':'')+'\n    <form id="main-form">\n      <div class="form-fields">\n        '+fields+'\n      </div>\n      <button type="submit" class="btn-submit">'+escape(cfg.submitLabel||'Submit')+'</button>\n      <div class="success-msg" id="success-msg">'+escape(cfg.successMessage||'Thank you!')+'</div>\n    </form>\n  </div>\n  <script>\n    const form = document.getElementById("main-form");\n    const validateRequiredGroups = () => {\n      form.querySelectorAll("[data-required-group=true]").forEach(group => {\n        const checkboxes = [...group.querySelectorAll("input[type=checkbox]")];\n        if (checkboxes[0]) {\n          checkboxes[0].setCustomValidity(checkboxes.some(input => input.checked) ? "" : "Select at least one option.");\n        }\n      });\n    };\n    form.addEventListener("change", event => {\n      if (event.target.closest("[data-required-group=true]")) validateRequiredGroups();\n    });\n    form.addEventListener("submit", function(e) {\n      validateRequiredGroups();\n      if (!form.reportValidity()) {\n        e.preventDefault();\n        return;\n      }\n      e.preventDefault();\n      document.getElementById("success-msg").style.display = "block";\n    });\n  </script>\n</body>\n</html>';
  }

  function buildReactJsx(state) {
    const {formConfig,elements}=state;
    const cfg=formConfig||{};
    const q=FF.Safe.jsxString;
    const fieldJsx=(Array.isArray(elements)?elements:[]).map(el=>{
      if(!el||!FF.Safe.isSafeId(el.id)) return '';
      const p=el.props||{},id=el.id,label=p.label||'',ph=p.placeholder||'',helper=p.helperText||'';
      const req=p.required?' required={true}':'';
      const labelLine='<label htmlFor='+q(id)+'>'+q(String(label)+(p.required?' *':''))+'</label>';
      const helperLine=helper?'<p className="helper">'+q(helper)+'</p>':'';
      if(['text','email','tel','url','number'].includes(el.type)) return '      <div className="field-wrap">\n        '+labelLine+'\n        <input type="'+el.type+'" id='+q(id)+' name='+q(id)+' placeholder='+q(ph)+req+' />\n        '+helperLine+'\n      </div>';
      if(el.type==='textarea') return '      <div className="field-wrap">\n        '+labelLine+'\n        <textarea id='+q(id)+' name='+q(id)+' placeholder='+q(ph)+' rows={4}'+req+' />\n        '+helperLine+'\n      </div>';
      if(el.type==='dropdown') {
        const opts=(Array.isArray(p.options)?p.options:[]).map(o=>'          <option value='+q(o)+'>{'+JSON.stringify(String(o)).replace(/\//g,'\\u002f')+'}</option>').join('\n');
        return '      <div className="field-wrap">\n        '+labelLine+'\n        <select id='+q(id)+' name='+q(id)+req+'>\n          <option value="">-- Select --</option>\n'+opts+'\n        </select>\n      </div>';
      }
      if(el.type==='checkbox') return '      <div className="field-wrap field-wrap--check">\n        <input type="checkbox" id='+q(id)+' name='+q(id)+req+' />\n        <label htmlFor='+q(id)+'>'+q(label)+'</label>\n      </div>';
      if(el.type==='radio') {
        const radios=(Array.isArray(p.options)?p.options:[]).map(o=>'          <label><input type="radio" name='+q(id)+' value='+q(o)+' /> {'+JSON.stringify(String(o)).replace(/\//g,'\\u002f')+'}</label>').join('\n');
        return '      <div className="field-wrap">\n        <fieldset><legend>'+q(label)+'</legend>\n'+radios+'\n        </fieldset>\n      </div>';
      }
      if(el.type==='date') return '      <div className="field-wrap">\n        '+labelLine+'\n        <input type="date" id='+q(id)+' name='+q(id)+req+' />\n      </div>';
      if(el.type==='divider') return '      <hr />';
      if(el.type==='section-header') return '      <h3>'+q(label)+'</h3>';
      if(el.type==='rich-text') return '      <p>'+q(label)+'</p>';
      return '';
    }).filter(Boolean).join('\n');
    let component=String(cfg.title||'').replace(/[^a-zA-Z0-9]/g,'');
    if(!component) component='GeneratedForm';
    if(/^\d/.test(component)) component='Form'+component;
    if(!component.endsWith('Form')) component+='Form';
    return 'import React, { useState } from "react";\n\nexport default function '+component+'() {\n  const [submitted, setSubmitted] = useState(false);\n\n  const handleSubmit = (e) => {\n    e.preventDefault();\n    setSubmitted(true);\n  };\n\n  if (submitted) {\n    return <div className="success">'+q(cfg.successMessage||'Thank you!')+'</div>;\n  }\n\n  return (\n    <form onSubmit={handleSubmit} noValidate>\n      <h2>'+q(cfg.title||'')+'</h2>\n      '+(cfg.description?'<p className="form-desc">'+q(cfg.description)+'</p>':'')+'\n'+fieldJsx+'\n      <button type="submit">'+q(cfg.submitLabel||'Submit')+'</button>\n    </form>\n  );\n}';
  }

  function buildFormJson(state) {
    return JSON.stringify({
      formConfig: state.formConfig,
      elements: state.elements,
      activeTheme: state.activeTheme,
      exportedAt: new Date().toISOString(),
      version: FF.SCHEMA_VERSION,
    }, null, 2);
  }
  return {buildJsonSchema,buildHtml,buildReactJsx,buildFormJson};
})();