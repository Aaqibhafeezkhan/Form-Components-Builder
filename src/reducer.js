window.FF = window.FF || {};

FF.ACTIONS = {
  ADD_ELEMENT:        'ADD_ELEMENT',
  REMOVE_ELEMENT:     'REMOVE_ELEMENT',
  UPDATE_ELEMENT:     'UPDATE_ELEMENT',
  REORDER_ELEMENTS:   'REORDER_ELEMENTS',
  DUPLICATE_ELEMENT:  'DUPLICATE_ELEMENT',
  MOVE_ELEMENT:       'MOVE_ELEMENT',
  SELECT_ELEMENT:     'SELECT_ELEMENT',
  MULTI_SELECT:       'MULTI_SELECT',
  CLEAR_SELECTION:    'CLEAR_SELECTION',
  BULK_DELETE:        'BULK_DELETE',
  BULK_DUPLICATE:     'BULK_DUPLICATE',
  BULK_MOVE:          'BULK_MOVE',
  UPDATE_FORM_CONFIG: 'UPDATE_FORM_CONFIG',
  SET_THEME:          'SET_THEME',
  SET_ZOOM:           'SET_ZOOM',
  SET_PREVIEW_DEVICE: 'SET_PREVIEW_DEVICE',
  LOAD_TEMPLATE:      'LOAD_TEMPLATE',
  IMPORT_FORM:        'IMPORT_FORM',
  CLEAR_CANVAS:       'CLEAR_CANVAS',
  MARK_SAVED:         'MARK_SAVED',
  UNDO:               'UNDO',
  REDO:               'REDO',
};

FF.activityLog = [];

function logActivity(message) {
  FF.activityLog.unshift({ message, timestamp: new Date().toISOString() });
  if (FF.activityLog.length > 200) FF.activityLog.length = 200;
}

function cloneElements(elements) {
  return elements.map(el => JSON.parse(JSON.stringify(el, (k, v) => v instanceof Set ? [...v] : v)));
}

function captureSnapshot(state) {
  return {
    elements: cloneElements(state.elements),
    formConfig: JSON.parse(JSON.stringify(state.formConfig)),
    selectedElementId: state.selectedElementId,
    multiSelectedIds: [...state.multiSelectedIds],
    activeTheme: state.activeTheme,
  };
}

function restoreSnapshot(state, snapshot) {
  state.elements = cloneElements(snapshot.elements);
  state.formConfig = JSON.parse(JSON.stringify(snapshot.formConfig));
  state.activeTheme = ['default','dark','minimal','corporate'].includes(snapshot.activeTheme) ? snapshot.activeTheme : 'default';
  const ids = new Set(state.elements.map(element => element.id));
  state.selectedElementId = ids.has(snapshot.selectedElementId) ? snapshot.selectedElementId : null;
  state.multiSelectedIds = new Set((snapshot.multiSelectedIds || []).filter(id => ids.has(id)));
}

function pushUndo(state) {
  state.undoStack.push(captureSnapshot(state));
  if (state.undoStack.length > FF.MAX_HISTORY) state.undoStack.shift();
  state.redoStack = [];
}

FF.dispatch = function dispatch(action) {
  const state = FF.appState;
  const A = FF.ACTIONS;

  switch (action.type) {

    case A.ADD_ELEMENT: {
      const el = action.element;
      if (!el || !el.props || !FF.Validation.FIELD_TYPES.has(el.type) || state.elements.length >= 200 || !FF.Safe.isSafeId(el.id) || state.elements.some(existing => existing.id === el.id)) break;
      pushUndo(state);
      const requestedIndex = Number.isInteger(action.insertIndex) ? action.insertIndex : state.elements.length;
      const insertAt = Math.max(0, Math.min(state.elements.length, requestedIndex));
      const newElements = [...state.elements];
      newElements.splice(insertAt, 0, el);
      newElements.forEach((e, i) => { e.order = i; });
      state.elements = newElements;
      state.selectedElementId = el.id;
      state.multiSelectedIds = new Set();
      state.isDirty = true;
      state.changeCount = (state.changeCount || 0) + 1;
      logActivity('Added element: ' + el.props.label + ' (' + el.type + ')');
      break;
    }

    case A.REMOVE_ELEMENT: {
      const idx = state.elements.findIndex(e => e.id === action.id);
      if (idx !== -1) {
        pushUndo(state);
        const removed = state.elements[idx];
        state.elements = state.elements.filter(e => e.id !== action.id);
        state.elements.forEach((e, i) => { e.order = i; });
        if (state.selectedElementId === action.id) state.selectedElementId = null;
        state.multiSelectedIds.delete(action.id);
        state.isDirty = true;
        state.changeCount = (state.changeCount || 0) + 1;
        logActivity('Removed element: ' + removed.props.label);
      }
      break;
    }

    case A.UPDATE_ELEMENT: {
      const elIdx = state.elements.findIndex(e => e.id === action.id);
      if (elIdx !== -1) {
        if (!action.silent) pushUndo(state);
        state.elements[elIdx] = Object.assign({}, state.elements[elIdx]);
        if (action.props) {
          state.elements[elIdx].props = Object.assign({}, state.elements[elIdx].props, action.props);
          if (action.props.validation !== undefined) {
            state.elements[elIdx].props.validation = Object.assign(
              {}, state.elements[elIdx].props.validation, action.props.validation
            );
          }
        }
        if (action.conditionalLogic !== undefined) {
          state.elements[elIdx].conditionalLogic = action.conditionalLogic;
        }
        if (action.meta !== undefined) {
          state.elements[elIdx].meta = Object.assign({}, state.elements[elIdx].meta, action.meta);
        }
        state.elements[elIdx].meta.updatedAt = new Date().toISOString();
        state.isDirty = true;
        logActivity('Updated element: ' + state.elements[elIdx].props.label);
      }
      break;
    }

    case A.REORDER_ELEMENTS: {
      const { fromIndex, toIndex } = action;
      if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex) || fromIndex < 0 || fromIndex >= state.elements.length || toIndex < 0 || toIndex >= state.elements.length || fromIndex === toIndex) break;
      pushUndo(state);
      const arr = [...state.elements];
      const [moved] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, moved);
      arr.forEach((e, i) => { e.order = i; });
      state.elements = arr;
      state.isDirty = true;
      logActivity('Reordered elements');
      break;
    }

    case A.DUPLICATE_ELEMENT: {
      const src = state.elements.find(e => e.id === action.id);
      if (src && state.elements.length < 200) {
        pushUndo(state);
        const copy = JSON.parse(JSON.stringify(src));
        copy.id = FF.Storage.generateId();
        copy.props.label = src.props.label + ' (Copy)';
        copy.meta = Object.assign({}, copy.meta, {createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
        const srcIdx = state.elements.findIndex(e => e.id === action.id);
        state.elements.splice(srcIdx + 1, 0, copy);
        state.elements.forEach((e, i) => { e.order = i; });
        state.selectedElementId = copy.id;
        state.isDirty = true;
        state.changeCount = (state.changeCount || 0) + 1;
        logActivity('Duplicated element: ' + src.props.label);
      }
      break;
    }

    case A.MOVE_ELEMENT: {
      const { id, direction } = action;
      const idx = state.elements.findIndex(e => e.id === id);
      if (idx === -1 || !['up','down'].includes(direction)) break;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= state.elements.length) break;
      pushUndo(state);
      const arr = [...state.elements];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      arr.forEach((e, i) => { e.order = i; });
      state.elements = arr;
      state.isDirty = true;
      logActivity('Moved element ' + direction);
      break;
    }

    case A.SELECT_ELEMENT: {
      state.selectedElementId = state.elements.some(element => element.id === action.id) ? action.id : null;
      state.multiSelectedIds = new Set();
      break;
    }

    case A.MULTI_SELECT: {
      if (!state.elements.some(element => element.id === action.id)) break;
      const ids = new Set(state.multiSelectedIds);
      if (ids.has(action.id)) ids.delete(action.id);
      else ids.add(action.id);
      state.multiSelectedIds = ids;
      state.selectedElementId = null;
      break;
    }

    case A.CLEAR_SELECTION: {
      state.selectedElementId = null;
      state.multiSelectedIds = new Set();
      break;
    }

    case A.BULK_DELETE: {
      const requested = Array.isArray(action.ids) ? action.ids : [...state.multiSelectedIds];
      const toDelete = new Set(requested.filter(id => state.elements.some(element => element.id === id)));
      if (!toDelete.size) break;
      pushUndo(state);
      state.elements = state.elements.filter(e => !toDelete.has(e.id));
      state.elements.forEach((e, i) => { e.order = i; });
      state.selectedElementId = null;
      state.multiSelectedIds = new Set();
      state.isDirty = true;
      state.changeCount = (state.changeCount || 0) + toDelete.size;
      logActivity('Bulk deleted ' + toDelete.size + ' elements');
      break;
    }

    case A.BULK_DUPLICATE: {
      const requested = Array.isArray(action.ids) ? action.ids : [...state.multiSelectedIds];
      const selected = new Set(requested);
      const sources = state.elements.filter(element => selected.has(element.id));
      const copies = sources.slice(0, Math.max(0, 200 - state.elements.length));
      if (!copies.length) break;
      pushUndo(state);
      const nextElements = [];
      const copiedIds = new Set();
      state.elements.forEach(element => {
        nextElements.push(element);
        if (!selected.has(element.id) || !copies.includes(element)) return;
        const copy = JSON.parse(JSON.stringify(element));
        copy.id = FF.Storage.generateId();
        copy.props.label = (copy.props.label || copy.type) + ' (Copy)';
        copy.meta = Object.assign({}, copy.meta, {createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
        nextElements.push(copy);
        copiedIds.add(copy.id);
      });
      state.elements = nextElements;
      state.elements.forEach((element,index)=>{element.order=index;});
      state.selectedElementId = null;
      state.multiSelectedIds = copiedIds;
      state.isDirty = true;
      state.changeCount = (state.changeCount || 0) + copies.length;
      logActivity('Bulk duplicated ' + copies.length + ' elements');
      break;
    }

    case A.BULK_MOVE: {
      const selected = new Set(action.ids || [...state.multiSelectedIds]);
      if (!selected.size || !['up','down'].includes(action.direction)) break;
      const indexes = state.elements.map((element,index)=>selected.has(element.id)?index:-1).filter(index=>index!==-1);
      if (!indexes.length || (action.direction==='up'&&indexes[0]===0) || (action.direction==='down'&&indexes[indexes.length-1]===state.elements.length-1)) break;
      pushUndo(state);
      const nextElements = [...state.elements];
      if (action.direction==='up') {
        indexes.forEach(index=>{
          if(index>0&&!selected.has(nextElements[index-1].id)) [nextElements[index-1],nextElements[index]]=[nextElements[index],nextElements[index-1]];
        });
      } else {
        indexes.slice().reverse().forEach(index=>{
          if(index<nextElements.length-1&&!selected.has(nextElements[index+1].id)) [nextElements[index],nextElements[index+1]]=[nextElements[index+1],nextElements[index]];
        });
      }
      nextElements.forEach((element,index)=>{element.order=index;});
      state.elements=nextElements;
      state.isDirty=true;
      logActivity('Bulk moved ' + indexes.length + ' elements ' + action.direction);
      break;
    }

    case A.UPDATE_FORM_CONFIG: {
      if (!action.silent) pushUndo(state);
      state.formConfig = Object.assign({}, state.formConfig, action.config);
      state.isDirty = true;
      logActivity('Updated form settings');
      break;
    }

    case A.SET_THEME: {
      if (!['default','dark','minimal','corporate'].includes(action.theme)) break;
      state.activeTheme = action.theme;
      state.isDirty = true;
      logActivity('Changed theme to: ' + action.theme);
      break;
    }

    case A.SET_ZOOM: {
      const levels = FF.ZOOM_LEVELS;
      const cur = levels.indexOf(state.zoomLevel);
      if (action.level !== undefined) {
        state.zoomLevel = action.level;
      } else if (action.direction === 'in' && cur < levels.length - 1) {
        state.zoomLevel = levels[cur + 1];
      } else if (action.direction === 'out' && cur > 0) {
        state.zoomLevel = levels[cur - 1];
      }
      break;
    }

    case A.SET_PREVIEW_DEVICE: {
      state.previewDevice = action.device;
      break;
    }

    case A.LOAD_TEMPLATE:
    case A.IMPORT_FORM: {
      pushUndo(state);
      state.formConfig = Object.assign({}, FF.DEFAULT_FORM_CONFIG, action.formConfig || {});
      state.elements = (action.elements || []).map((e, i) => Object.assign({}, e, { order: i }));
      state.selectedElementId = null;
      state.multiSelectedIds = new Set();
      state.isDirty = true;
      state.changeCount = (state.changeCount || 0) + 1;
      if (action.theme) state.activeTheme = action.theme;
      logActivity(action.type === A.LOAD_TEMPLATE ? 'Loaded template: ' + (action.name || '') : 'Imported form');
      break;
    }

    case A.CLEAR_CANVAS: {
      pushUndo(state);
      state.elements = [];
      state.selectedElementId = null;
      state.multiSelectedIds = new Set();
      state.isDirty = true;
      logActivity('Cleared canvas');
      break;
    }

    case A.MARK_SAVED: {
      state.isDirty = false;
      state.lastSaved = new Date().toISOString();
      break;
    }

    case A.UNDO: {
      if (!state.undoStack.length) break;
      const snapshot = state.undoStack.pop();
      state.redoStack.push(captureSnapshot(state));
      restoreSnapshot(state, snapshot);
      state.isDirty = true;
      logActivity('Undo');
      break;
    }

    case A.REDO: {
      if (!state.redoStack.length) break;
      const snapshot = state.redoStack.pop();
      state.undoStack.push(captureSnapshot(state));
      restoreSnapshot(state, snapshot);
      state.isDirty = true;
      logActivity('Redo');
      break;
    }

    default:
      console.warn('[Reducer] Unknown action type:', action.type);
  }

  FF.EventBus.emit('state:changed', { action: action.type });
};
