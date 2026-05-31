# Implement: 补齐往世乐土资料

## Checklist

1. Planning setup
   - [x] Create Trellis task.
   - [x] Write PRD with requirements and acceptance criteria.
   - [x] Write design with source/provenance boundary.
   - [x] Start task as `in_progress`.
2. Existing research audit
   - [x] Review current source index and recommended next passes.
   - [x] Identify concrete gaps for Bilibili, Moegirl, and GitHub.
3. External source pass
   - [x] Query/fetch Bilibili metadata/search results for ER-specific analysis and 泛式剧情讲堂 gap.
   - [x] Query/fetch Moegirl pages for Elysian Realm / Elysium Everlasting / Flame-Chaser organization and related systems.
   - [x] Query/fetch GitHub repositories for ER guide/data/plugin/metadata references and classify safe use.
4. Documentation
   - [x] Create `research/lore-research-supplement-2026-05-31.md`.
   - [x] Update existing lore source index to reference the supplement.
   - [x] Update handoff/open-decision docs only if new implementation-relevant guidance changes.
5. Verification
   - [x] Run `python3 ./.trellis/scripts/task.py validate 05-31-elysian-realm-lore-research`.
   - [x] Grep new/updated docs for forbidden storage patterns and source categories.
   - [x] Run `git diff --check`.

## Validation Commands

```bash
python3 ./.trellis/scripts/task.py validate 05-31-elysian-realm-lore-research
rg -n "transcript|subtitle|字幕|对白|台词|lyrics|asset|dump|原文|全文" .trellis/tasks/05-31-elysian-realm-lore-research .trellis/tasks/archive/2026-05/05-31-elysian-realm-agent-spec/research
rg -n "lore-research-supplement|泛式|萌娘|GitHub|github-metadata|fan-analysis|fan-navigation" .trellis/tasks/05-31-elysian-realm-lore-research .trellis/tasks/archive/2026-05/05-31-elysian-realm-agent-spec/research/honkai-elysian-realm-lore-sources.md
git diff --check
```

No npm typecheck/test is required unless application code changes. If only Markdown research docs change, record that explicitly in the verification log.

## Risk / Rollback Points

- Do not delete or overwrite existing research docs wholesale; update targeted sections only.
- Do not fetch Bilibili subtitles or download media.
- Do not copy Moegirl/Fandom prose; summarize in project-authored words.
- Do not copy GitHub asset/data files; record repository metadata and safe-use boundaries only.
