window.FF = window.FF || {};
FF.Validation = (() => {
  const TYPES = new Set(['text','textarea','email','number','dropdown','checkbox','radio','date','multi-select','checkbox-group','time','file','rating','toggle','slider','signature','tel','url','hidden','section-header','divider','rich-text']);
  const OPS = new Set(['equals','not_equals','contains','is_empty','is_not_empty']);
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const isEmpty = value => value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
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
    try { return { valid: new RegExp(pattern).test(value), error: null }; }
    catch (error) { return { valid: false, error: error.message }; }
  }
  function validateImport(data) {
    const errors = [];
    if (!isObject(data)) return { valid: false, errors: ['Root must be an object.'] };
    if (!isObject(data.formConfig)) errors.push('Form configuration is missing.');
    if (!Array.isArray(data.elements) || data.elements.length > 200) errors.push('Elements must be an array containing no more than 200 fields.');
    if (errors.length) return { valid: false, errors };
    const ids = new Set();
    data.elements.forEach((element, index) => {
      if (!isObject(element) || !element.props) { errors.push('Element ' + index + ' is incomplete.'); return; }
      if (!/^[A-Za-z0-9_-]{1,80}$/.test(String(element.id || ''))) errors.push('Element ' + index + ' has an invalid ID.');
      else if (ids.has(element.id)) errors.push('Duplicate element ID: ' + element.id);
      else ids.add(element.id);
      if (!TYPES.has(element.type)) errors.push('Element ' + index + ' has an unsupported type.');
    });
    if (data.formConfig.redirectUrl && !FF.Safe.isSafeRedirectUrl(data.formConfig.redirectUrl)) errors.push('Redirect URL must use HTTP or HTTPS.');
    return { valid: errors.length === 0, errors };
  }
  return { validateField, evaluateRule, evaluateConditionalLogic, testRegex, validateImport, FIELD_TYPES: TYPES };
})();
