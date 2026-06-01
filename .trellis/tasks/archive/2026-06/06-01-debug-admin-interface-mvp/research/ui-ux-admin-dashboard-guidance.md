# UI/UX Admin Dashboard Guidance

## Purpose

Capture the local UI/UX Pro Max guidance used during planning for the debug/admin interface MVP. This is a planning reference for implementation and review agents.

## Source

Local skill installed at user level:

- `/home/muelsyse/.agents/skills/ui-ux-pro-max/SKILL.md`

Queries run during planning:

```bash
python3 ~/.agents/skills/ui-ux-pro-max/scripts/search.py "developer debug admin dashboard" --domain product -n 3
python3 ~/.agents/skills/ui-ux-pro-max/scripts/search.py "debug dashboard timeline controls" --domain style -n 3
python3 ~/.agents/skills/ui-ux-pro-max/scripts/search.py "admin dashboard controls forms" --domain ux -n 5
```

## Relevant guidance for this task

### Product / dashboard direction

For a developer debug/admin dashboard, the best matching product/style direction is:

- analytics/admin dashboard;
- data-dense layout;
- drill-down / real-time monitoring behavior;
- minimalism or dark/neutral shell;
- status colors used with text labels, never color-only meaning.

### UI priorities

Apply these rules in priority order:

1. Accessibility: readable contrast, focus states, keyboard navigation, accessible labels.
2. Touch/interaction: clickable controls have clear affordance and loading/disabled feedback.
3. Layout/responsive: no horizontal scroll, clear panels, readable timeline.
4. Typography/color: base text remains readable; use semantic status tokens.
5. Forms/feedback: labels, required indicators, field-level errors, submit feedback.

### Admin form guidance

The intervention forms should:

- validate field shape before submit where practical;
- show errors near the relevant field;
- show success/error feedback after submit;
- avoid placeholder-only labels;
- use appropriate input types for numbers and text;
- keep destructive/reset controls visually distinct.

### Anti-patterns

Avoid:

- emoji as status icons when text/SVG labels are clearer;
- color-only event/source status;
- hidden focus rings;
- controls that trigger state changes without visible feedback;
- local UI state that pretends a backend command succeeded before the backend returns.

## Mapping to implementation

- World header should be compact and data-dense.
- Event timeline should expose IDs, step IDs, event kinds, source badges, and payload details.
- Control panel should show loading/error states for step/reset/input submit.
- Diagnostics panel should keep rejected input/event messages visible and copyable.
- React components should remain presentational over typed admin DTOs.
