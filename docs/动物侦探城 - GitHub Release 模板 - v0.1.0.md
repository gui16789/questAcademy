# 动物侦探城 - GitHub Release 模板 - v0.1.0

## 1. 文档信息

| 项目 | 内容 |
| --- | --- |
| 文档名称 | 动物侦探城 - GitHub Release 模板 |
| 文档版本 | v0.1.0 |
| 文档状态 | 草稿 |
| 适用阶段 | 产品版本发布 |
| 更新日期 | 2026-05-22 |
| 维护负责人 | 项目负责人 + 技术负责人 |

## 2. 文档目的

本文档定义 GitHub Release 的填写模板和发布前检查要求。

每个产品版本 tag 必须对应一个 GitHub Release：

```text
tag: v0.2.0
release: v0.2.0
```

内容包版本不作为产品 tag，但必须记录在 Release 中。

## 3. 已确认关键决策

| 编号 | 决策 | 说明 |
| --- | --- | --- |
| D1 | 每个产品版本 tag 必须有 Release | `v0.2.0 tag -> GitHub Release v0.2.0` |
| D2 | Release 记录产品版本 | 内容包版本作为引用字段 |
| D3 | Release 必填版本、范围、内容包、验证、已知问题、回滚和下一步 | 便于追踪 |
| D4 | v0.2.0 需要特别记录内容包、校验、localStorage 兼容和是否新增玩法 | 内容抽取版本重点 |
| D5 | Release 只能在发布条件满足后创建 | Milestone、PR、测试、校验、tag、回滚方案 |
| D6 | 提供可复制 Markdown 模板 | 直接用于 GitHub Release |

## 4. Release 发布前条件

创建 Release 前必须满足：

```text
Milestone 必做 Issue 完成
PR 全部合并
功能测试通过
内容校验通过
无 P0 / P1 Bug
tag 已创建
回滚方案已写
Release Notes 已准备
```

## 5. 通用 Release 模板

以下模板可直接复制到 GitHub Release。

```markdown
# 动物侦探城 vX.Y.Z

## 版本信息

- 产品版本：
- Git tag：
- 发布日期：
- 发布负责人：
- 对应 Milestone：
- 发布类型：Major / Minor / Patch / Pre-release

## 版本目标

<!-- 本版本最核心要解决什么问题 -->

## 产品范围

### 本次包含

-

### 本次不包含

-

## 内容包版本

| 内容包 | 版本 | 状态 |
| --- | --- | --- |
|  |  |  |

## 新增

-

## 优化

-

## 修复

-

## 文档更新

-

## 验证方式

-

## 测试结果

| 测试项 | 结果 | 备注 |
| --- | --- | --- |
| 功能测试 | 通过 / 未通过 |  |
| 内容测试 | 通过 / 未通过 |  |
| 学习闭环测试 | 通过 / 未通过 |  |
| 兼容性测试 | 通过 / 未通过 |  |
| 数据保存测试 | 通过 / 未通过 |  |

## 已知问题

-

## 是否影响学习记录

- 是否影响 localStorage：
- 是否需要数据迁移：
- 是否存在数据丢失风险：

## 回滚方案

-

## 下一版本计划

-
```

## 6. v0.2.0 Release 特殊模板

v0.2.0 是内容抽取版本，需要额外记录：

```markdown
# 动物侦探城 v0.2.0

## 版本信息

- 产品版本：v0.2.0
- Git tag：v0.2.0
- 发布日期：
- 发布负责人：
- 对应 Milestone：v0.2.0
- 发布类型：Minor

## 版本目标

将 v0.1.0 静态 MVP 中写死在 `app.js` 的内容抽取为 JSON 内容包，保持当前页面体验基本不变。

## 产品范围

### 本次包含

- 新增 `content/` 内容包目录。
- 新增 `manifest.json`、`textbook.json`、`knowledge-map.json`。
- 抽取案件、关卡、线索、知识卡、勋章。
- 抽取题目和 Boss。
- 增加 JSON 内容包加载器。
- 增加内容校验脚本。
- 增加 `dataVersion / contentPackageId / contentVersion`。
- 兼容 v0.1.0 localStorage 数据。

### 本次不包含

- 不新增玩法。
- 不扩展新案件。
- 不扩展新单元。
- 不接后端。
- 不做账号系统。
- 不做内容后台。
- 不切 React / Vite。

## 内容包版本

| 内容包 | 版本 | 状态 |
| --- | --- | --- |
| math.bsd.g2.s2.unit-1-division | 0.1.0 | draft / approved / published |

## 内容校验结果

```text
node scripts/validate-content.mjs
结果：
```

## localStorage 兼容情况

- 是否兼容 v0.1.0 数据：
- 是否新增 dataVersion：
- 是否新增 contentPackageId：
- 是否新增 contentVersion：
- 是否存在数据丢失风险：

## 页面体验变化

- 是否改变主流程：否 / 是
- 是否改变 UI：否 / 是
- 是否新增玩法：否

## 验证方式

- 本地静态服务：

```bash
python -m http.server 4173 --bind 127.0.0.1
```

- 访问：

```text
http://127.0.0.1:4173
```

## 测试结果

| 测试项 | 结果 | 备注 |
| --- | --- | --- |
| 内容加载 | 通过 / 未通过 |  |
| 内容校验 | 通过 / 未通过 |  |
| 核心流程 | 通过 / 未通过 |  |
| 错题复习 | 通过 / 未通过 |  |
| Boss 流程 | 通过 / 未通过 |  |
| localStorage 兼容 | 通过 / 未通过 |  |
| 移动端 320px | 通过 / 未通过 |  |

## 已知问题

-

## 回滚方案

- 回滚到 tag：
- 回滚内容包版本：
- 是否需要清理 localStorage：

## 下一版本计划

- v1.0.0 或后续计划：
```

## 7. Release 标题规范

建议：

```text
动物侦探城 v0.2.0 - 内容抽取版
动物侦探城 v1.0.0 - 除法正式体验版
```

## 8. Release 类型

| 类型 | 使用场景 |
| --- | --- |
| Pre-release | alpha / beta / rc |
| Stable release | 正式发布 |
| Patch release | Bug 修复或内容小修 |

## 9. 回滚记录要求

如果发生回滚，必须在 Release 或后续 Patch Release 中记录：

```text
回滚原因：
影响范围：
回滚到哪个 tag：
回滚到哪个内容包版本：
是否影响学习记录：
后续修复 Issue：
```

## 10. 修订记录

| 版本 | 日期 | 说明 |
| --- | --- | --- |
| v0.1.0 | 2026-05-22 | 创建 GitHub Release 模板 |
