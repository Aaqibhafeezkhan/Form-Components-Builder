window.FF = window.FF || {};
FF.Validation = (() => {
  const TYPES = new Set(['text','textarea','email','number','dropdown','checkbox','radio','date','multi-select','checkbox-group','time','file','rating','toggle','slider','signature','tel','url','hidden','section-header','divider','rich-text']);
  const OPS = new Set(['equals','not_equals','contains','is_empty','is_not_empty']);
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const isEmpty = value => value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
  const stringWithin = (object,key,max) => object[key] === undefined || (typeof object[key] === 'string' && object[key].length <= max);
  function validateField(element, value) {
    const props = isObject(element && element.props) ? element.props : {};
    const rules = isObject(props.validation) ? props.validation : {};
    const label = props.label || 'This field';
    const fail = message => ({ valid: false, message: rules.customMessage || message });
    if (props.required && isEmpty(value)) return fail(label + ' is required.');
    if (isEmpty(value)) return { valid: true, message: '' };
    const text = Array.isArray(value) ? value.join(',') : String(value);
    if (rules.minLength !== undefined && text.length < Number(rules.minLength)) return fail(label + ' is too short.');
    if (rules.maxLength !== undefined && text.length > Number(rules.maxLength)) return fail(label + ' is too long.');
    if (['number','slider'].includes(element.type)) {
      const number = Number(value);
      if (!Number.isFinite(number)) return fail(label + ' must be a number.');
      if (rules.min !== undefined && number < Number(rules.min)) return fail(label + ' is below the minimum.');
      if (rules.max !== undefined && number > Number(rules.max)) return fail(label + ' is above the maximum.');
    }
    if (typeof value === 'string' && rules.pattern !== undefined && String(rules.pattern).length <= 200 && value.length <= 2000) {
      try {
        if (!new RegExp(rules.pattern).test(value)) return fail(label + ' does not match the required format.');
      } catch(error) {}
    }
    return { valid: true, message: '' };
  }
  function evaluateRule(rule, values) {
    if (!rule || !OPS.has(rule.operator)) return false;
    const current = values && typeof values.get === 'function' ? values.get(rule.field) : values && values[rule.field];
    if (rule.operator === 'is_empty') return isEmpty(current);
    if (rule.operator === 'is_not_empty') return !isEmpty(current);
    if (rule.operator === 'contains' && Array.isArray(current)) return current.map(String).includes(String(rule.value));
    if (rule.operator === 'contains') return String(current == null ? '' : current).includes(String(rule.value));
    if (rule.operator === 'equals') return String(current) === String(rule.value);
    if (rule.operator === 'not_equals') return String(current) !== String(rule.value);
    return false;
  }
  function evaluateConditionalLogic(element, values) {
    const baseRequired = !!(element && element.props && element.props.required);
    const result = { visible: true, required: baseRequired, disabled: false };
    const logic = element && element.conditionalLogic;
    if (!logic || !logic.enabled || !Array.isArray(logic.rules) || !logic.rules.length) return result;
    const matches = logic.logicOperator === 'OR' ? logic.rules.some(rule => evaluateRule(rule, values)) : logic.rules.every(rule => evaluateRule(rule, values));
    const action = logic.action || (logic.rules[0] && logic.rules[0].action) || 'show';
    if (action === 'show') result.visible = matches;
    if (action === 'hide') result.visible = !matches;
    if (action === 'require') result.required = matches || baseRequired;
    if (action === 'disable') result.disabled = matches;
    return result;
  }
  function testRegex(pattern, value) {
    const source=String(pattern==null?'':pattern);
    const input=String(value==null?'':value);
    if(source.length>200) return {valid:false,error:'Pattern must be 200 characters or fewer.'};
    if(input.length>2000) return {valid:false,error:'Test value must be 2,000 characters or fewer.'};
    try { return { valid: new RegExp(source).test(input), error: null }; }
    catch (error) { return { valid: false, error: error.message }; }
  }
  function validateImport(data, options) {
    const strict=!!(options&&options.strict);
    const errors = [];
    if (!isObject(data)) return { valid: false, errors: ['Root must be an object.'] };
    if (FF.Safe.hasDangerousKeys(data)) return {valid:false,errors:['Import contains a dangerous object key or exceeds the supported nesting limits.']};
    if (!isObject(data.formConfig)) errors.push('Form configuration is missing.');
    if (!Array.isArray(data.elements) || data.elements.length > 200) errors.push('Elements must be an array containing no more than 200 fields.');
    if (errors.length) return { valid: false, errors };
    const ids = new Set();
    const allIds = new Set(data.elements.filter(isObject).map(element=>String(element.id||'')));
    data.elements.forEach((element, index) => {
      if (!isObject(element) || !isObject(element.props)) { errors.push('Element ' + index + ' is incomplete.'); return; }
      if (!FF.Safe.isSafeId(element.id)) errors.push('Element ' + index + ' has an invalid ID.');
      else if (ids.has(element.id)) errors.push('Duplicate element ID: ' + element.id);
      else ids.add(element.id);
      if (!TYPES.has(element.type)) errors.push('Element ' + index + ' has an unsupported type.');
      if (strict) {
        ['label','placeholder','helperText'].forEach(key=>{
          if(!stringWithin(element.props,key,500)) errors.push('Element '+index+' '+key+' must be a string of at most 500 characters.');
        });
        if(element.props.options!==undefined&&(!Array.isArray(element.props.options)||element.props.options.length>200||element.props.options.some(option=>typeof option!=='string'||option.length>200))) errors.push('Element '+index+' options must contain no more than 200 strings of at most 200 characters each.');
        if(element.conditionalLogic!==undefined) {
          const rules=element.conditionalLogic&&element.conditionalLogic.rules;
          if(!isObject(element.conditionalLogic)||!Array.isArray(rules)||rules.length>20||rules.some(rule=>!isObject(rule)||!FF.Safe.isSafeId(rule.field)||!OPS.has(rule.operator))) errors.push('Element '+index+' has invalid conditional logic rules.');
        }
      }
    });
    if (data.formConfig.redirectUrl && !FF.Safe.isSafeRedirectUrl(data.formConfig.redirectUrl)) errors.push('Redirect URL must use HTTP or HTTPS.');
    if (strict) {
      const cfg=data.formConfig;
      [['title',200],['description',2000],['submitLabel',100],['successMessage',1000]].forEach(([key,max])=>{
        if(!stringWithin(cfg,key,max)) errors.push('Form '+key+' must be a string of at most '+max+' characters.');
      });
      if(cfg.pages!==undefined&&(!Array.isArray(cfg.pages)||cfg.pages.length>50)) errors.push('Form pages must contain no more than 50 entries.');
      if(cfg.customCss!==undefined&&!FF.Safe.checkCustomCss(cfg.customCss).ok) errors.push('Custom CSS contains a disallowed construct or exceeds 20,000 characters.');
    }
    return { valid: errors.length === 0, errors };
  }
  return { validateField, evaluateRule, evaluateConditionalLogic, testRegex, validateImport, FIELD_TYPES: TYPES };
})();