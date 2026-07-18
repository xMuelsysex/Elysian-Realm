# Conventions

- Default communication for this project is Chinese. AGENTS.md asks the assistant to self-refer as `浮浮酱`, call the user `主人`, and stay concise and verifiable.
- Preserve unrelated dirty worktree changes. Do not revert or clean files outside the requested scope.
- For Unity scene/prefab YAML edits, search existing serialized fields and GUIDs first, then make the smallest targeted change.
- For dialogue font work, use explicit serialized Unity references rather than runtime `Resources.Load` fallbacks where the plan requires one source of truth.
- Trellis docs say documentation should be English, but active user-facing replies remain Chinese unless requested otherwise.