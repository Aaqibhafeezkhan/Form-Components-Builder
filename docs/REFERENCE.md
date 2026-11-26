# Reference

## Form data model

A form JSON export contains `formConfig`, `elements`, `activeTheme`, `exportedAt` and `version`. The storage envelope contains `version`, `savedAt` and `data`.

Each element contains `id`, `type`, `order`, `props`, `conditionalLogic` and `meta`. The CSS class override is stored under `meta.cssClass`, not `props`.

## Field type identifiers

- `text`
- `textarea`
- `email`
- `number`
- `dropdown`
- `checkbox`
- `radio`
- `date`
- `multi-select`
- `checkbox-group`
- `time`
- `file`
- `rating`
- `toggle`
- `slider`
- `signature`
- `tel`
- `url`
- `hidden`
- `section-header`
- `divider`
- `rich-text`

## Validation and conditional logic

Validation properties include `minLength`, `maxLength`, `pattern`, `min`, `max` and `customMessage`. Conditional rules use a field ID, an operator (`equals`, `not_equals`, `contains`, `is_empty`, `is_not_empty`), a value and an action (`show`, `hide`, `require`, `disable`). Rules combine with `AND` or `OR`.

## Themes

The supported themes are `default`, `dark`, `minimal` and `corporate`.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+Z | Undo |
| Ctrl+Y or Ctrl+Shift+Z | Redo |
| Ctrl+S | Save |
| Ctrl+P | Open Preview |
| Ctrl+D | Duplicate selected element |
| Delete or Backspace | Delete selected element |
| F12 | Toggle high contrast |
| Escape | Close modal |

## Storage

The storage key is `formforge_enterprise_v1`; the schema version is `1.0`. Undo and redo history is capped at 50 snapshots. Autosave is scheduled after 2,000 milliseconds.
