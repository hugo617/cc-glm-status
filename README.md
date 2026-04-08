# cc-glm-status

Claude Code 实时状态行工具，为 GLM Coding Plan (Z.ai) 用户显示 token 配额、MCP 用量等。

## 快速开始

**1. 安装**

```bash
npm install -g cc-glm-status
```

或本地开发：

```bash
git clone <repo-url> cc-glm-status && cd cc-glm-status
npm link
```

**2. 配置 API Key**

任选一个环境变量设置即可（按优先级排列）：

```bash
export ZAI_API_KEY="your-key"       # 最高优先级
# 或
export ZHIPU_API_KEY="your-key"     # 智谱 (GLM) API Key
# 或
export ANTHROPIC_AUTH_TOKEN="..."    # 最低优先级
```

**3. 配置 Claude Code**

在 `~/.claude/settings.json` 中添加：

```json
{
  "status_line": "cc-glm-status"
}
```

完成！Claude Code 下次启动时会在状态行显示配额信息。

## 状态行说明

状态行各段以 `|` 分隔：

| 段 | 示例 | 说明 |
|---|---|---|
| **Model** | `GLM-5-Turbo` | 当前模型名称 |
| **Tokens** | `Tokens ███░░░░░░░ 22% (1h02m)` | Token 配额使用率 + 进度条 + 重置倒计时 |
| **MCP** | `MCP ●○ 84` | MCP 工具用量（● > 50%，○ ≤ 50%）+ 总量 |
| **Ctx** | `Ctx 35%` | 上下文窗口使用率 |

颜色：<font color="green">绿色 < 50%</font>、<font color="yellow">黄色 50–79%</font>、<font color="red">红色 ≥ 80%</font>

无配额数据时显示 `Quota ---`。

## CLI 选项

| 选项 | 说明 |
|---|---|
| `--help` / `-h` | 显示帮助信息 |
| `--version` / `-v` | 显示版本号 |
| `--debug` | 输出诊断信息到 stderr |

```bash
# 查看版本
cc-glm-status --version

# 调试模式（查看 API 调用和缓存状态）
echo '{}' | cc-glm-status --debug
```

## 环境变量

| 变量 | 说明 |
|---|---|
| `ZAI_API_KEY` | Z.ai API Key（最高优先级） |
| `ZHIPU_API_KEY` | 智谱 (GLM) API Key |
| `ANTHROPIC_AUTH_TOKEN` | Anthropic 认证令牌（最低优先级） |
| `CC_GLM_DEBUG` | 设为 `1` 启用调试输出（等同于 `--debug`） |

## 故障排查

### 状态行一直显示 "Quota ---"

1. **检查 API Key**：运行 `echo '{}' | cc-glm-status --debug`，如果看到 `未找到 API Key`，说明环境变量未设置。
2. **检查 Key 有效性**：debug 模式会显示 API 返回的具体错误（如 `认证失败` 表示 Key 无效）。
3. **清除缓存**：`rm ~/.claude/cache/glm-status-cache.json`，然后重试。

### 缓存问题

- 缓存路径：`~/.claude/cache/glm-status-cache.json`
- 正常数据缓存 120 秒，错误状态缓存 30 秒
- 手动清除：`rm ~/.claude/cache/glm-status-cache.json`

### Node.js 版本不兼容

需要 Node.js >= 18.0.0（使用原生 `fetch`）。运行 `node --version` 检查。

## 开发

```bash
npm test              # 运行测试
npm run test:watch    # 监听模式
npm start             # 运行主程序
```

零外部依赖 — 仅使用 Node.js 18+ 原生模块。

## 许可证

MIT
