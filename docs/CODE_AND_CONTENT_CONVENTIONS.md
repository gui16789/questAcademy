# 代码与内容规范

## 1. 代码原则

- 先保证核心闭环稳定，再扩展玩法。
- 先保证数据结构清楚，再追求界面效果。
- 先支持内容可配置，再扩大题库规模。
- 避免把一次性内容写成难以复用的逻辑。

## 2. 前端实现规范

当前静态 MVP 使用：

```text
index.html
styles.css
app.js
localStorage
```

后续正式工程应保持这些设计方向：

- 页面组件化：地图、案件、题目、线索、悬案、勋章独立组件。
- 内容数据化：题目、关卡、知识卡、线索和勋章从结构化数据读取。
- 状态集中化：用户进度、答题记录、错题和勋章统一管理。
- 移动优先：答题页在手机和平板上优先保证清晰和可点击。
- 可迁移：`localStorage` 只是 MVP 存储，后续可迁移到后端用户数据。

## 3. 命名规范

推荐 ID 使用小写英文和短横线：

```text
case-carrot-badge
level-average-share
q-average-share-001
card-remainder-rule
badge-rookie-detective
```

文件命名建议：

```text
产品名 - 文档类型 - 版本号.md
```

示例：

```text
动物侦探城 - PRD - MVP v0.1.0.md
动物侦探城 - 技术方案与架构 - v0.1.0.md
```

## 4. 数据对象规范

核心对象应长期保持稳定：

- `User`
- `Case`
- `Level`
- `Question`
- `AnswerRecord`
- `WrongQuestion`
- `Clue`
- `KnowledgeCard`
- `BossChallenge`
- `Badge`
- `BadgeRecord`
- `Progress`

字段变更需要记录：

```text
字段名：
类型：
是否必填：
默认值：
兼容策略：
影响模块：
```

## 5. 题目内容规范

每道题必须包含：

```text
questionId
grade
textbookVersion
semester
unit
knowledgePoint
levelId
questionType
difficulty
stem
options
answer
explanation
wrongHint
wrongCategory
isBossQuestion
```

题目文案要求：

- 题干短，数字清楚。
- 选项不故意绕孩子。
- 解析一步一步说明。
- 错题提示温和，不使用批评式语言。
- 尽量和案件情境相关，但不能牺牲数学清晰度。

## 6. UI 实现规范

- 按钮、题目、选项、解析、进度和状态必须由前端渲染。
- 背景图只承载氛围，不承载功能。
- 角色图、背景图、图标和 UI 组件分层管理。
- 所有主要按钮点击区域不小于 `44px * 44px`。
- 题目正文和选项优先保证可读性。

## 7. 存储与兼容规范

MVP 阶段可以使用 `localStorage`。

后续如果调整数据结构，需要提供：

```text
旧版本字段：
新版本字段：
迁移规则：
无法迁移时的降级策略：
用户是否会丢失进度：
```

## 8. 测试规范

每次修改至少验证：

- 可以进入地图。
- 可以进入案件。
- 普通关卡能答题、判分、获得线索。
- 错题能进入悬案馆。
- 线索库能展示已解锁知识卡。
- 集齐线索后 Boss 解锁。
- Boss 通过后能结案。
- 勋章能正确发放。
- 刷新后学习记录不丢失。

UI 修改还需验证：

- 320px 宽手机视口不溢出。
- 主要按钮不被遮挡。
- 题干和选项可读。
- 错误反馈不刺眼。
