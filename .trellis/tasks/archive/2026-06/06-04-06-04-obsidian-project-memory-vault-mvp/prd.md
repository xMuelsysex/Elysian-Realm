# Obsidian Project Memory Vault MVP

## Goal

Create an Obsidian-compatible project memory vault that captures long-term memory and learning materials for Elysian Realm from the beginning of the project through the current state, not just today's work.

## Requirements

- Create a repository-local Obsidian vault for project memory.
- Suggested path: `knowledge/elysian-realm-vault/`.
- Source the first version from project evidence, including:
  - git commit history;
  - Trellis archived task PRDs/design/implementation notes;
  - developer journal entries;
  - README and project specs;
  - current source tree and tests where needed for architecture accuracy.
- Cover the project from its start through the latest pushed state.
- Include cross-linked Markdown notes suitable for Obsidian.
- Separate factual project memory from future ideas and TODOs.
- Do not include secrets, API keys, local-only credentials, or fabricated history.
- Prefer concise, durable notes over copied raw logs.
- Keep generated knowledge traceable to source files/commits where practical.

## Acceptance Criteria

- [ ] An Obsidian-compatible vault exists under `knowledge/elysian-realm-vault/`.
- [ ] Vault has a clear `README.md` / entry note for navigation.
- [ ] Vault includes a chronological project timeline from the beginning to now.
- [ ] Vault includes architecture notes for backend simulation, frontend dashboard, LLM boundary, map/routines, and proposal review flow.
- [ ] Vault includes decision records for major constraints and tradeoffs.
- [ ] Vault includes learning/resource notes explaining important concepts and local implementation patterns.
- [ ] Vault includes source/index notes pointing to commits, Trellis tasks, journal entries, specs, and important code paths.
- [ ] Vault avoids secrets and does not depend on live network calls.
- [ ] Markdown links are usable in Obsidian.
- [ ] `git diff --check` and a basic file/link smoke check pass.

## Notes

- This is documentation/knowledge work; do not change runtime code unless a broken reference or tooling issue requires it.
- The first vault can be committed with the active Trellis task files after review.
