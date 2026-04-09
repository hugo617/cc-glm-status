# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目简介

`cc-glm-status` 是 Claude Code 的状态行工具，为 GLM Coding Plan (Z.ai) 用户显示实时配额信息。通过 stdin 接收 Claude Code 传入的模型名和上下文窗口数据，调用 Z.ai API 获取 token 配额、MCP 用量等，渲染 ANSI 彩色状态行。

## 开发环境

- Node.js >= 18.0.0（开发环境 v24.12.0）
- npm 11.6.2
- macOS arm64 / zsh
- 无外部依赖，纯 Node.js 原生模块

## 常用命令

```bash
npm start              # 运行主程序
npm test               # 运行测试
npm run test:watch     # 监听模式运行测试
npm pack --dry-run     # 验证打包内容
```

## 发布

`package.json` 的 `files` 字段白名单仅发布 `bin/`、`src/`、`README.md`、`LICENSE`。`prepublishOnly` 钩子确保测试通过后才能发布。

### 发布流程

```bash
# 1. 确保测试通过
npm test

# 2. 升版本号（手动修改 package.json 中的 version）
#    patch 修复 → x.y.z+1
#    minor 功能 → x.y+1.0

# 3. 验证打包内容
npm pack --dry-run

# 4. 提交版本号变更并推送到 GitHub
git add package.json
git commit -m "chore: bump version to <version>"
git push

# 5. 发布到 npm（prepublishOnly 自动跑测试）
npm publish
```

### 同步状态行脚本

Claude Code 实际运行的是 `~/.claude/statusline/glm-status.mjs`，修改 `src/index.mjs` 后需要同步更新该文件。两份代码逻辑一致，区别仅在于旧副本无 `export`、无 `debug` 模式。

## CLI 选项

- `--help` / `-h`：显示中文帮助
- `--version` / `-v`：显示版本号
- `--debug`：输出诊断信息到 stderr（也可通过 `CC_GLM_DEBUG=1` 环境变量启用）

## 架构概览

零依赖 ESM 项目（Node 18+），使用原生 `fetch`。

### 数据流

```
Claude Code (stdin JSON) → parseStdin() → renderStatusLine() → stdout
                                              ↑
Z.ai API → fetchQuotaData() → parseQuotaData() → (带文件缓存)
```

### 关键文件

- **`src/index.mjs`** — 全部核心逻辑：API 调用、缓存、数据解析、ANSI 渲染。所有函数均为具名导出，供测试使用。
- **`bin/cc-glm-status.mjs`** — CLI 入口，直接 import 主模块。
- **`test/test.mjs`** — 自定义轻量测试框架（无第三方依赖），使用 `assert()` 辅助函数和 ANSI 彩色输出。

### 缓存机制

- 缓存路径：`~/.claude/cache/glm-status-cache.json`
- 正常数据缓存 120 秒，错误状态缓存 30 秒
- API 失败时回退读取过期缓存
- 写入使用 tmp + rename 保证原子性

### API 认证

按优先级读取环境变量：`ZAI_API_KEY` > `ZHIPU_API_KEY` > `ANTHROPIC_AUTH_TOKEN`

## 测试

测试使用自研的 `assert(condition, name)` 框架，不依赖任何测试库。新增测试在 `test/test.mjs` 中添加 `assert()` 调用即可。运行测试后检查退出码（0=全部通过，1=有失败）。
