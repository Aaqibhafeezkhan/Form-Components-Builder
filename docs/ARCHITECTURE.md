# Architecture

## Runtime

Form Components Builder is a static browser application. Classic scripts load in dependency order and attach modules to the shared `window.FF` namespace. There is no bundler or runtime dependency, so the repository can be opened through a static host and relative asset paths continue to work under a project subpath.

## Script load order

1. `src/eventBus.js`
2. `src/state.js`
3. `src/utils/safe.js`
4. `src/utils/storage.js`
5. `src/utils/validation.js`
6. `src/utils/dragDrop.js`
7. `src/utils/export.js`
8. `src/reducer.js`
9. `src/components/palette.js`
10. `src/components/canvas.js`
11. `src/components/propertiesPanel.js`
12. `src/components/preview.js`
13. `src/components/toolbar.js`
14. `src/templates.js`
15. `src/components/modals.js`
16. `src/main.js`

## Module map

| Module | Responsibility |
|---|---|
| `eventBus.js` | Synchronous publish/subscribe events |
| `state.js` | Schema version, constants and initial state |
| `utils/safe.js` | HTML escaping, safe IDs, redirect and CSS policy, dangerous-key detection |
| `utils/storage.js` | Versioned localStorage persistence and UUID generation |
| `utils/validation.js` | Field constraints, conditional logic and import validation |
| `utils/dragDrop.js` | Native drag-and-drop interactions |
| `utils/export.js` | JSON Schema, HTML, React JSX and form JSON generation |
| `reducer.js` | State transitions, undo and redo |
| `components/palette.js` | Field palette and element factory |
| `components/canvas.js` | Canvas rendering and element controls |
| `components/propertiesPanel.js` | Field property editors |
| `components/preview.js` | Interactive local preview |
| `components/toolbar.js` | Toolbar, keyboard shortcuts and theme application |
| `templates.js` | Built-in template data |
| `components/modals.js` | Import, export, settings, templates and history dialogs |
| `main.js` | Initialization and autosave scheduling |

## Dispatch flow

A user action calls `FF.dispatch({type, ...payload})`. The reducer updates `FF.appState`, records snapshots for undoable actions, and emits `state:changed`. Canvas, property panel and toolbar listeners render the new state. The main module schedules a debounced save to localStorage when the state is dirty.

## Persistence and recovery

The storage envelope contains `version`, `savedAt` and `data`. The storage key and schema version are compatibility boundaries. Invalid JSON, invalid form data and unknown schema versions are preserved; autosave is blocked for invalid or unsupported data. Existing saved custom CSS that fails the CSS policy is blanked in memory while the rest of the saved form remains available.

## Validation tiers

The default import validation is non-strict to retain compatibility with localStorage data. User-triggered imports and custom template loads use strict validation, which applies size limits to field text, options, conditional rules, form settings, pages and custom CSS. Both modes reject dangerous own keys and unsupported field types.

## Output encoding and CSS policy

Generated HTML text and attributes are encoded with `FF.Safe.escapeHtml`. JSX strings are emitted as JSON-encoded JSX expressions. Unsafe field IDs are omitted from generated output. Custom CSS is length-limited and rejects imports, URL functions, expressions, script-like URL schemes, legacy behavior bindings, closing style tags and backslashes. This is a conservative filter, not a complete CSS parser or sandbox.

## Trade-offs

Classic scripts preserve the no-build, static-host setup but make script order explicit. Browser storage keeps form data local to the current browser but does not synchronize it. The HTML export is a field-rendering artifact, not a complete runtime form engine. JSX generation intentionally omits unsupported field types rather than emitting comment placeholders.
