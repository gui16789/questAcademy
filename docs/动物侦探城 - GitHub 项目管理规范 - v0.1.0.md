# 动物侦探城 - GitHub 项目管理规范 - v0.1.0

## 1. 文档信息

| 项目 | 内容 |
| --- | --- |
| 文档名称 | 动物侦探城 - GitHub 项目管理规范 |
| 文档版本 | v0.1.0 |
| 文档状态 | 草稿 |
| 适用阶段 | 全项目生命周期 |
| 更新日期 | 2026-05-22 |
| 维护负责人 | 项目负责人 + 技术负责人 |

## 2. 文档目的

本文档定义《动物侦探城》在 GitHub 上的日常项目管理方式，包括 Issue 类型、Project 看板状态、Label 体系、Milestone、PR 规则和 Review 要求。

本文档与以下文档配合使用：

- `CONTRIBUTING.md`
- `docs/GITHUB_WORKFLOW.md`
- `动物侦探城 - 版本规则与发布流程 - v0.1.0.md`

## 3. 已确认关键决策

| 编号 | 决策 | 说明 |
| --- | --- | --- |
| D1 | Issue 类型固定 | docs、product、architecture、content、design、frontend、backend、test、bug、release、research |
| D2 | Project 看板状态固定 | Backlog、Ready、In Progress、In Review、Blocked、Done |
| D3 | Label 分为 type、area、priority、status | 便于筛选和排期 |
| D4 | 每个产品版本一个 Milestone | 如 v0.2.0、v1.0.0 |
| D5 | PR 必须关联 Issue 并说明验证方式 | 禁止无范围、无验收 PR |
| D6 | v0.2.0 Issue 详细拆分另写文档 | 本文只定义管理规则 |

## 4. 基本管理原则

- 所有工作先有 Issue。
- 每个 Issue 必须有范围和验收标准。
- 每个开发分支从 `main` 创建。
- 每个 PR 尽量只解决一个 Issue。
- `main` 只接受 PR 合并。
- 不把无关格式化、重构、文档和功能混在同一个 PR。
- 版本范围冻结后，不随意插入新需求。

## 5. Issue 类型

| 类型 | 用途 |
| --- | --- |
| docs | 文档补充、修订、整理 |
| product | 产品需求、范围、流程、验收标准 |
| architecture | 架构、Schema、数据模型、工程路线 |
| content | 教材、知识点、题目、知识卡、线索、Boss |
| design | UI、UX、视觉、角色、地图、资产 |
| frontend | 页面、组件、交互、状态、内容加载 |
| backend | API、数据库、账号、服务端逻辑 |
| test | 测试计划、测试用例、回归、儿童测试 |
| bug | 缺陷 |
| release | 版本发布、Tag、Release Notes、回滚 |
| research | 调研、用户反馈、技术验证 |

## 6. Issue 模板要求

每个 Issue 应包含：

```text
背景：
目标：
范围：
不做：
验收标准：
关联文档：
关联版本：
风险：
```

Bug Issue 应包含：

```text
问题描述：
复现步骤：
预期结果：
实际结果：
影响范围：
严重等级：
截图或录屏：
```

## 7. Project 看板状态

建议使用 GitHub Project 管理状态：

| 状态 | 含义 |
| --- | --- |
| Backlog | 已记录，尚未排期 |
| Ready | 已明确范围和验收标准，可以开始 |
| In Progress | 正在开发或编写 |
| In Review | PR 已提交，等待 Review |
| Blocked | 被依赖、决策或资源阻塞 |
| Done | 已合并或已完成 |

状态流：

```text
Backlog
-> Ready
-> In Progress
-> In Review
-> Done
```

遇到阻塞：

```text
In Progress / In Review
-> Blocked
```

## 8. Label 体系

### 8.1 type 标签

```text
type:docs
type:feature
type:bug
type:content
type:test
type:release
type:research
```

### 8.2 area 标签

```text
area:product
area:architecture
area:ui
area:frontend
area:backend
area:content
area:data
area:github
```

### 8.3 priority 标签

```text
priority:P0
priority:P1
priority:P2
priority:P3
```

含义：

| 优先级 | 含义 |
| --- | --- |
| P0 | 阻断核心流程或发布 |
| P1 | 严重影响体验、数据或内容准确性 |
| P2 | 有价值但不阻断发布 |
| P3 | 优化、清理、锦上添花 |

### 8.4 status 标签

```text
status:blocked
status:needs-review
status:ready
```

## 9. Milestone 规则

每个产品版本创建一个 Milestone：

```text
v0.1.0
v0.2.0
v1.0.0
v1.1.0
```

Issue 必须挂到对应 Milestone，除非它只是长期想法。

长期想法放入：

```text
Backlog
```

并可以不绑定 Milestone。

## 10. 分支规则

分支从 `main` 创建。

命名格式：

```text
docs/<issue-id>-<topic>
feature/<issue-id>-<module>
fix/<issue-id>-<bug>
content/<issue-id>-<case-or-unit>
test/<issue-id>-<scope>
release/<version>
```

示例：

```text
docs/12-release-flow
feature/23-content-loader
fix/42-boss-unlock
content/31-carrot-badge-package
test/55-mvp-regression
release/v0.2.0
```

## 11. PR 规则

### 11.1 基本要求

每个 PR 必须：

- 关联 Issue。
- 尽量只解决一个 Issue。
- 标题遵循提交规范。
- 说明变更目的。
- 说明影响范围。
- 说明验证方式。
- 标明是否影响文档、内容、数据结构或学习记录。

### 11.2 禁止

PR 不允许：

- 混入无关格式化。
- 混入无关重构。
- 同时做多个不相关需求。
- 没有验收标准。
- 没有验证说明。
- 直接改变版本范围。

### 11.3 特殊要求

涉及 UI：

```text
需要截图或说明不同视口表现。
```

涉及内容：

```text
需要说明内容审核状态。
```

涉及数据结构：

```text
需要说明兼容策略。
```

涉及发布：

```text
需要说明版本号、内容包版本和回滚方案。
```

## 12. Review 规则

### 12.1 Review 重点

产品：

- 是否符合版本目标。
- 是否强化核心学习闭环。
- 是否超出当前范围。

内容：

- 是否绑定教材和知识点。
- 答案和解析是否正确。
- 是否适合低年级孩子。

技术：

- 是否破坏数据结构。
- 是否影响已有进度。
- 是否可维护、可扩展。

UI：

- 是否移动端可用。
- 孩子是否知道下一步。
- 是否符合 UI 规范。

### 12.2 合并条件

PR 合并前必须：

- 关联 Issue。
- 验收标准满足。
- 自测通过。
- 无 P0 / P1。
- 文档同步。
- Review 通过。

## 13. 版本发布管理

每个发布版本需要：

```text
Milestone 中所有必做 Issue 完成
发布检查清单通过
创建 release/vX.Y.Z 分支，如需要
打 Git tag
创建 GitHub Release
记录内容包版本
记录回滚方案
```

## 14. v0.2.0 项目管理建议

v0.2.0 建议创建 Milestone：

```text
v0.2.0
```

并创建 6 个核心 Issue：

```text
建立内容包基础
抽取案件、关卡、线索、知识卡、勋章
抽取题目和 Boss
增加内容加载器
增加内容校验脚本
补数据版本并回归测试
```

详细拆分在：

```text
动物侦探城 - v0.2.0 Issue 拆分清单.md
```

## 15. 待确认问题

1. 是否立即在 GitHub 创建 Project 看板。
2. 是否立即创建 labels。
3. 是否开启 branch protection。
4. 是否要求至少 1 个 Review 才能合并。
5. 是否由项目负责人统一关闭 Milestone。

## 16. 修订记录

| 版本 | 日期 | 说明 |
| --- | --- | --- |
| v0.1.0 | 2026-05-22 | 创建 GitHub 项目管理规范草稿 |
