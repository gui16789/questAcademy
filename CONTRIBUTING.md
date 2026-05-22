# 贡献与协作规范

本文档用于规范《动物侦探城》在 GitHub 上的需求、文档、代码和发布协作流程。

## 基本原则

- 文档先行：涉及产品范围、内容规则、数据结构、架构选择的变更，先更新文档再开发。
- 小步提交：每次提交聚焦一个清晰目标，避免把无关修改混在一起。
- 主闭环优先：任何功能都应服务“接案 -> 学习 -> 闯关 -> 线索 -> 错题复习 -> Boss -> 结案”的核心闭环。
- 儿童友好优先：交互、文案、视觉和反馈不得制造挫败感或高压感。
- 内容可审核：题目、解析、知识卡和 Boss 内容必须保留人工审核空间。

## 分支规范

默认主分支：

```text
main
```

建议分支命名：

```text
docs/<topic>
feature/<module>
fix/<issue>
chore/<task>
content/<case-or-unit>
```

示例：

```text
docs/tech-architecture-v0
feature/wrong-case-review
content/badge-missing-case-v0
fix/mobile-option-layout
```

## 提交信息规范

采用简化 Conventional Commits：

```text
type(scope): summary
```

常用类型：

- `docs`: 文档变更
- `feat`: 新功能
- `fix`: Bug 修复
- `style`: 样式调整，不改变逻辑
- `refactor`: 重构，不改变行为
- `content`: 题目、知识卡、剧情、线索等内容资产
- `test`: 测试相关
- `chore`: 工程配置、依赖、构建杂项

示例：

```text
docs(workflow): add github collaboration rules
feat(wrongs): support solved wrong question status
content(case): add badge missing boss questions
```

## Pull Request 规范

每个 PR 应包含：

- 变更目的
- 影响范围
- 验证方式
- 是否影响文档、内容、数据结构或已有学习记录
- 截图或录屏，若涉及 UI

合并前至少检查：

- 核心流程没有被阻断
- 文案适合低年级儿童
- 题目答案和解析准确
- 移动端布局可用
- 相关文档已同步更新

## 文档变更规则

以下变更必须先更新或新增文档：

- 产品范围、版本目标、不做清单变化
- 页面流程或核心交互变化
- 数据结构、题库字段、状态机变化
- 视觉规范、组件规范、资产规则变化
- 内容生产模板或审核流程变化
- 发布节奏、验收标准、指标口径变化

## 代码变更规则

- 保持实现简单直接，优先复用现有结构。
- 不把题目、按钮、用户数据和状态文字做进图片。
- 所有用户可见文案应便于后续配置和审核。
- 涉及学习记录的数据变更，需要说明兼容策略。
- 不引入排行榜、商城、复杂养成等当前阶段明确不做的功能。

## 内容变更规则

题目、知识卡、线索、Boss 和勋章内容需要满足：

- 绑定教材版本、年级、单元和知识点。
- 有明确答案、解析和错题分类。
- 语言短句化，适合二年级学生。
- Boss 是综合应用，不是单纯提高难度。
- 错题反馈使用“悬案”“再调查”等低压力表达。

## 发布规则

版本号遵循：

```text
MAJOR.MINOR.PATCH
```

发布前必须确认：

- 版本范围已冻结。
- 无 P0 / P1 Bug。
- 教研内容已审核。
- 核心流程可完整跑通。
- 发布说明和回滚方案已准备。
