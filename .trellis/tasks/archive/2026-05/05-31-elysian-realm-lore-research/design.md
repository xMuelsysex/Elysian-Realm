# Design: 补齐往世乐土资料

## Scope

本任务是研究资料补齐，不改应用代码。产物是 Trellis 研究文档和既有研究索引更新，用于未来 persona、memory、event、world seed、UI/debug taxonomy 和实现切片。

## Source Classes and Provenance

| Class | Examples | Trust / Use | Repository Boundary |
|---|---|---|---|
| `official-url` | HoYoverse/miHoYo announcements, official event pages | 最高优先级 URL anchor；若 JS-only，仅记录 URL 与可验证标题/用途 | 不复制正文、图像、音频、视频、活动页资源 |
| `wiki-summary` | 萌娘百科、Fandom | 二级摘要；用于交叉验证术语、角色关系、版本/章节入口 | 只写项目自写摘要，不搬运页面段落 |
| `fan-navigation` | B 站剧情合集、part labels、公开 BV metadata | 用于定位剧情片段、角色事件、回忆/刻印/关系图入口 | 不抓字幕、不存对白、不截帧 |
| `fan-analysis` | B 站剧情讲解/世界观解析 | 用于解释性假设和研究方向，低于官方/wiki | 结论需标 fan-analysis，避免当作 canon |
| `github-metadata` | ElysianRealm guide/data/plugin repos | 用于 alias、玩法关键词、数据组织、自动化边界 | 不复制 asset/image/data dump；不当 lore 权威 |
| `architecture-reference` | generative agents, AI Town 等 | 用于多智能体模拟实现参考 | 与 lore 分离 |

## Research Artifacts

新增文档：

- `research/lore-research-supplement-2026-05-31.md`
  - 本次补齐结果总表。
  - B 站新增/复核条目。
  - 萌娘百科新增/复核条目。
  - GitHub 新增/复核条目。
  - 映射到未来实现的使用建议。
  - 未完全确认项与后续人工复核建议。

更新文档：

- `archive/.../research/honkai-elysian-realm-lore-sources.md`
  - 在来源索引、已完成 artifact、推荐后续项、verification log 中指向新增补充。
- 可选更新 `implementation-research-handoff.md` 或 `pre-implementation-open-decisions.md`
  - 仅当新增资料改变未来实现入口或决策默认值。

## Data Flow

1. 读取既有研究文档，提取缺口。
2. 搜索/抓取公开元数据：优先 URL、BV、repo 名、标题、简介性 metadata。
3. 人工归类为 provenance class 和 future-use category。
4. 写入项目自写摘要，不粘贴来源正文。
5. 更新总索引，使未来任务能从旧研究目录发现本次补齐。
6. 运行验证：Trellis validate、grep 版权边界关键词、git diff 自查。

## Safety and Copyright Controls

- B 站视频只使用公开 metadata 和 source locators；不请求字幕接口，不保存 transcript。
- 萌娘百科/Fandom 只作为摘要和 URL 入口；不复制页面叙述。
- GitHub asset/data repo 只记录 repo metadata 与用途边界；不复制图像或数据文件。
- 如果来源无法可靠访问，记录为 `unconfirmed`，不编造成已验证事实。

## Completion Definition

任务完成时，研究文档应足以让未来实现者明确：

- 去哪里查往世乐土/永世乐土/英桀资料；
- 哪些来源可以做 persona 约束，哪些只能做 navigation 或 gameplay alias；
- 哪些缺口仍需人工浏览器复核；
- 哪些资料已经安全地映射到 future implementation slices。
