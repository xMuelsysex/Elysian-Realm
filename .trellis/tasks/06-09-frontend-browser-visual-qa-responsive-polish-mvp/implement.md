# Browser Visual QA and Responsive Polish MVP Implementation Plan

## Pre-Implementation Checklist

- [ ] Read `prd.md`, `design.md`, and this plan.
- [ ] Read frontend specs:
  - `.trellis/spec/frontend/index.md`
  - `.trellis/spec/frontend/realm-interface.md`
  - `.trellis/spec/frontend/component-guidelines.md`
  - `.trellis/spec/frontend/state-management.md`
  - `.trellis/spec/frontend/type-safety.md`
  - `.trellis/spec/frontend/quality-guidelines.md`
- [ ] Confirm active task is started before editing.
- [ ] Confirm no backend/simulation changes are required.

## Execution Checklist

1. Launch the frontend in a real browser.
2. Capture/inspect the default map observatory page at desktop wide.
3. Inspect 1280px, 980px, and 560px responsive widths.
4. Record visual findings in `research/browser-visual-qa.md`.
5. Apply focused CSS/markup fixes for observed issues.
6. Re-run browser inspection for changed breakpoints.
7. Run final validation commands.

## Validation Commands

```bash
npm run typecheck
npm test
npm run build
git diff --check
```

## Review Gates

- [ ] Browser findings are recorded before finalizing.
- [ ] Diff stays frontend-focused.
- [ ] No new backend, dependency, rendering engine, or simulation state ownership.
- [ ] Responsive layout has no obvious horizontal overflow.
- [ ] Debug/provenance/error affordances remain reachable.
