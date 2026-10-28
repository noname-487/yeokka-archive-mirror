# UI revision · 2026-10-28

Taste preserve redesign for a Korean broadcast archive. Native CSS/JS retained. Design variance 3, motion 2, density 7. Existing blue/violet brand retained with flat cool surfaces and semantic color tokens; no framework, dependency or route migration.

| Surface | Before | After |
| --- | --- | --- |
| Navigation | Equally weighted controls, repeated instructions | Date controls, view selector, search and categories grouped by purpose |
| Month | Large shared thumbnail and small text; repeated counts | Per-video thumbnail/title rows, one count, compact overflow link |
| Mobile | 770px horizontal calendar inside small viewport | Seven columns fit screen; tap date for full videos and memo; short view labels |
| Personal library | Transfer actions always shown; memos only on calendar | Collapsible transfer controls; searchable memo tab using existing data |
| Memo editing | Accidental dismissal/deletion possible | Unsaved-dismiss and delete confirmation; saved state reflected in library |

## Preservation

Storage keys, library payload schema, backup/share codec and mutation implementation are unchanged. No visitor data was read or migrated. Browser interaction checks used disposable local-preview records only. Public GitHub cache/workflow stay authoritative. Latest public cache snapshots were copied to the original Sites fallback bundle. Title, description, routes, source mapping, categories, birthday, all four views and browser-only storage remain.

## Validation

- Existing cache, browser storage, Unicode transfer, merge limits, quota rollback and security tests passed.
- Source comparison verifies storage schema, transfer implementation and personal mutations are byte-for-byte unchanged.
- Browser: desktop and 320/390/768/1024px iframe viewports; light/dark; no horizontal body overflow observed at measured widths.
- Browser: date detail, memo create/edit, favorites, list creation/add/share-code generation and reload persistence verified. Week, weekday, annual/year selection checked.
- CSP regenerated from final HTML scripts/styles by existing build; no inline event handlers added.
- Cloud-browser thumbnail requests failed before and after the change; image appearance could not be fully verified in that environment. URLs remain YouTube thumbnail URLs. No Lighthouse run was available through the supported browser interface; no performance score is claimed.
