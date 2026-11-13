# Palantir Foundry Ontology 中文学习工作台 & 本地文档库

本仓库包含两部分内容：

1. **离线文档与架构图库（390 篇）**：位于 [`foundry/`](./foundry/) 与 [`resources/`](./resources/)，按 20 个核心目录归档了 Palantir Foundry Ontology 相关官方文档与配图（索引见 [`INDEX.md`](./INDEX.md)）。
2. **初学者交互式学习应用**：位于 [`app/`](./app/)（React 19 + TypeScript + Vite + Tailwind CSS v4），将 390 篇英文文档组织为可视化沙盒、6 阶段学习路线、应用选型/反模式避坑指南、中英黑话速查、通关自测与全量 Markdown 离线阅读器。

---

## 快速启动学习应用

> 环境要求：Node.js 20+（自带 `npm`）。

```bash
cd app
npm install
npm run dev
```

打开终端输出的地址（默认 `http://localhost:5173/`）即可开始学习。

### 其他常用命令

```bash
# 重新生成 docs-index.json 索引、类型检查并构建生产包 (dist/)
npm run build

# 启动生产预览服务
npm run preview
```

[`app/vite.config.ts`](./app/vite.config.ts) 在开发与预览模式下会自动从仓库根目录读取 [`foundry/`](./foundry/) 与 [`resources/`](./resources/)，无需复制 383 MB 媒体资源目录。

---

## 主要学习模块

- **全景概览 & 数字孪生实验室**：用「表 → 对象映射」「Search Around & Interface」「Action Submission Criteria & OSv2 冲突」「Functions 与 Scenarios」4 组交互沙盒理解核心机制。
- **6 阶段精通路线（15 节课）**：从世界观（Data + Logic + Action + Security）到基础建模、动态行为、接口多态与常见反模式，再到上层应用选型与权限分支治理。
- **选型 / 反模式 / 术语工具箱**：针对 Object Explorer、Object Views、Workshop、Quiver、Carbon、Slate、Vertex、Map、Machinery、Dynamic Scheduling 提供场景决策表与 8 大建模反模式诊断卡。
- **全量 390 篇本地文档阅读器 & `⌘K` 全局检索**：支持多语言代码标签切换（`TypeScript v2` / `Python` / `TypeScript v1`）、`:::callout` 提示块、站内互链与原图放大预览。

---

## 目录结构

```text
palantir-docs/
├── INDEX.md          # 20 个目录 390 篇文档的离线索引清单
├── foundry/          # 390 篇官方 Markdown 文档（按模块分目录）
├── resources/        # 1,344 张官方文档配图与媒体资源
└── app/              # React + TypeScript + Vite 交互式学习工作台
```
