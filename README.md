# 动物侦探城：徽章失踪案 MVP

这是根据 `动物侦探城.md` 实现的静态单页 MVP。

## 打开方式

v0.2.0 起内容从 JSON 内容包加载，请在当前目录启动静态服务：

```bash
python -m http.server 4173 --bind 127.0.0.1
```

然后访问：

```text
http://127.0.0.1:4173
```

## MVP 已包含

- 开始页：昵称输入，默认昵称为“小侦探”
- 地图页：案件、悬案馆、线索库、勋章馆入口
- 案件详情：背景、目标、进度和继续调查
- 普通关卡：4 个知识点关卡，每关 4 题，答对 3 题通过
- Boss 挑战：集齐 4 条线索后解锁，2 道综合题
- 结案页：展示真相、学习总结和奖励
- 悬案馆：自动记录错题，可重新作答并标记已侦破
- 线索库：通关后解锁知识卡
- 勋章馆：自动发放 5 类 MVP 勋章
- 学习记录：使用 `localStorage` 保存；不可用时退回本次会话内存存储

## 主要文件

- `index.html`：页面入口
- `styles.css`：视觉样式和响应式布局
- `app.js`：内容包加载、流程、状态与数据保存
- `content/`：教材、知识图谱、案件、题目、知识卡、线索和勋章内容包
- `scripts/validate-content.mjs`：内容包结构和引用校验脚本

## 内容校验

```bash
node scripts/validate-content.mjs
```

## 协作规范

- `CONTRIBUTING.md`：分支、提交、PR、文档和内容协作规范
- `docs/README.md`：文档中心入口
- `docs/GITHUB_WORKFLOW.md`：GitHub Issue、PR、Review 和发布流程
- `docs/CODE_AND_CONTENT_CONVENTIONS.md`：代码、内容、题目、存储和测试规范
