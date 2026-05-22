# 动物侦探城：徽章失踪案 MVP

这是根据 `动物侦探城.md` 实现的静态单页 MVP。

## 打开方式

直接打开 `index.html` 即可体验；也可以在当前目录启动静态服务：

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
- `app.js`：题库、流程、状态与数据保存

## 协作规范

- `CONTRIBUTING.md`：分支、提交、PR、文档和内容协作规范
- `docs/README.md`：文档中心入口
- `docs/GITHUB_WORKFLOW.md`：GitHub Issue、PR、Review 和发布流程
- `docs/CODE_AND_CONTENT_CONVENTIONS.md`：代码、内容、题目、存储和测试规范
