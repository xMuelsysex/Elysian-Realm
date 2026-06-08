# Obsidian Project Memory Vault MVP Design

## Vault Location

Use `knowledge/elysian-realm-vault/` so the vault can be opened directly in Obsidian while remaining versioned with the repo.

## Proposed Structure

```text
knowledge/elysian-realm-vault/
├── README.md
├── 00 Meta/
│   ├── Vault Map.md
│   └── Source Index.md
├── 01 Timeline/
│   └── Project Timeline.md
├── 02 Architecture/
│   ├── System Overview.md
│   ├── Backend Simulation Engine.md
│   ├── Frontend Admin Dashboard.md
│   ├── LLM Boundary and Safety.md
│   ├── Realm Map and Routines.md
│   └── Proposal Sandbox and Review Drafts.md
├── 03 Decisions/
│   ├── Decision Log.md
│   └── Safety and Scope Constraints.md
├── 04 Learning/
│   ├── How Trellis Workflows Are Used.md
│   ├── Simulation Engine Learning.md
│   ├── Frontend Projection Learning.md
│   ├── LLM Boundary Learning.md
│   ├── Proposal Review Learning.md
│   ├── Testing Strategy.md
│   ├── Project Maintenance Learning.md
│   └── Open Questions and Next Study.md
└── 05 Reference/
    ├── Important Code Paths.md
    ├── Trellis Task Index.md
    └── Commit Index.md
```

## Source Strategy

Use only repository evidence:

- `git log --oneline --reverse` for historical order.
- `.trellis/tasks/archive/**/{prd.md,design.md,implement.md,task.json}` for completed task intent and outcomes.
- `.trellis/workspace/Muelsyse/journal-1.md` and index for session summaries.
- `.trellis/spec/**` for durable implementation rules.
- `README.md`, `package.json`, `src/**`, `tests/**` for architecture and verification details.

## Obsidian Conventions

- Use wiki links for durable internal links: `[[Project Timeline]]`.
- Use normal Markdown links for repository file references.
- Prefer one durable topic per note.
- Keep source citations in a `Sources` section.
- Keep future work in clearly labeled notes, not mixed into factual history.

## Safety

- Do not include API keys or secrets.
- Do not invent unavailable dates or unverified motivations.
- Mark inferred summaries as derived from sources when necessary.
