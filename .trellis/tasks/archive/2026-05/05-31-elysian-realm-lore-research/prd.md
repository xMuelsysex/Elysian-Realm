# 补齐往世乐土资料

## Goal

在现有 `.trellis/tasks/archive/2026-05/05-31-elysian-realm-agent-spec/research/` 资料基础上，继续补齐《崩坏3》往世乐土 / 逐火十三英桀相关研究索引，重点覆盖主人推荐的 B 站剧情解析、萌娘百科、GitHub 三类来源，并把新增资料以可追溯、可实现、无版权文本搬运的方式沉淀到 Trellis 任务文档中。

## User Value

- 后续实现 Elysian Realm 多智能体世界时，有更完整的来源索引、角色/事件/世界观交叉验证入口。
- 研究材料能直接服务 persona、memory、event taxonomy、world seed、source provenance 等未来实现切片。
- 避免把官方剧情文本、视频字幕、图片、音频、资产或完整对白放进仓库，降低版权与资料污染风险。

## Confirmed Facts

- 已有研究文档覆盖：总来源索引、13 英桀矩阵、MVP 三人 persona seeds、B 站剧情合集 part-level catalog、版本/章节时间线、世界种子、事件/记忆草案、实现 handoff。
- 现有推荐后续项包括：确认泛式剧情讲堂中往世乐土/人之律者相关 BV；进一步补官方/版本/章节源；继续用 GitHub 资料补 alias/gameplay metadata，但不把 asset repo 当 lore 权威。
- 本次用户明确要求创建 Trellis 任务并继续补齐资料；用户禁止删除操作。

## Requirements

### R1. Trellis 任务与研究边界

- 本次资料补齐必须有独立 Trellis 任务目录。
- 任务文档必须记录研究目标、边界、执行计划、验证方式。
- 不执行删除、发布、部署、Git 改写历史等无关高风险操作。

### R2. 来源补齐范围

- B 站：补充剧情解析/剧情讲堂/往世乐土相关视频或播放列表定位信息，优先补已有缺口：泛式剧情讲堂 ER/人之律者相关条目。
- 萌娘百科：补充往世乐土、永世乐土、逐火英桀、关键组织/计划/地点/系统条目入口与安全摘要，不复制页面正文。
- GitHub：补充与 Elysian Realm / 崩坏3数据 / guide / plugin / repo metadata 相关项目，区分 lore、gameplay、asset、automation、simulation-architecture 的可信边界。
- 允许使用官方/二级 Wiki/Fandom/搜索结果辅助交叉验证，但新增资料需标记 provenance 和可信层级。

### R3. 资料写入规范

- 仅存储 URL、BV、仓库名、标题、公开 part/title metadata、项目自写摘要、使用建议、可信边界。
- 不存储官方对白、完整剧情文本、字幕、歌词、图片、音频、视频帧、抽取资产、页面大段原文。
- 新增研究必须说明如何映射到未来 persona、memory、event、world seed、UI/debug taxonomy 或 implementation handoff。

### R4. 验证

- 至少运行 Trellis task validation。
- 对新增链接/元数据做可重复的 fetch/search 或命令记录。
- 对文档做关键词检查，确认没有明显的 transcript/dialogue/subtitle dump 意图。

## Out of Scope

- 不实现应用代码、不改 persona fixture、不创建新模拟引擎。
- 不下载、保存或转录 B 站视频字幕/音频/画面。
- 不把 GitHub asset/image repo 内容复制进仓库。
- 不强行访问需要登录、cookie 或绕过权限的内容。

## Acceptance Criteria

- [x] Trellis 任务目录存在，并包含 `prd.md`、`design.md`、`implement.md`。
- [x] 任务被启动为 `in_progress` 并通过 `task.py validate`。
- [x] 新增至少一个本次任务研究文档，汇总 B 站、萌娘百科、GitHub 补齐结果。
- [x] 现有来源索引或 handoff 文档被更新，能指向本次新增研究成果。
- [x] 对推荐后续项给出结论：已补齐、仍无法可靠确认、或保留为未来人工复核。
- [x] 文档保留版权边界，不含官方对白/字幕/剧情原文/资产搬运。
- [x] 运行最小验证：Trellis validate、文档检索、`git diff --check`；本任务未改应用代码，因此不需要 npm typecheck/test。
