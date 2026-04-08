# cc-glm-status

Claude Code 的状态行工具，为 [GLM Coding Plan](https://z.ai) 用户显示实时 token 配额、MCP 用量和上下文窗口。

效果预览：

```
GLM-5-Turbo | Tokens ████████░░ 78% (0h23m) | MCP ●○ 84 | Ctx 35%
```

## 前置条件

- [Node.js](https://nodejs.org) >= 18（运行 `node --version` 确认）
- Claude Code 已安装且正常使用
- GLM Coding Plan (Z.ai) 账号，需要能调用配额查询 API

## 安装

**方式一：从 npm 安装（推荐）**

```bash
npm install -g cc-glm-status
```

**方式二：从 GitHub 安装**

```bash
npm install -g github:hugo617/cc-glm-status
```

> 如果 npm 未安装，先安装 [Node.js](https://nodejs.org)，npm 会自带。

## 配置

只需两步。

### 第 1 步：设置 API Key

在终端中运行（**三选一**，按优先级排列）：

```bash
# 选项 A：Z.ai API Key（推荐）
echo 'export ZAI_API_KEY="你的key"' >> ~/.zshrc
source ~/.zshrc

# 选项 B：智谱 (GLM) API Key
echo 'export ZHIPU_API_KEY="你的key"' >> ~/.zshrc
source ~/.zshrc

# 选项 C：Anthropic 认证令牌
echo 'export ANTHROPIC_AUTH_TOKEN="你的key"' >> ~/.zshrc
source ~/.zshrc
```

> 写入 `~/.zshrc` 是为了让环境变量永久生效。如果你用 bash，替换为 `~/.bashrc`。
>
> API Key 获取方式：登录 [z.ai](https://z.ai) 后台，在 API Key / 开发者设置页面复制。

### 第 2 步：配置 Claude Code

编辑 `~/.claude/settings.json`，在已有配置中**添加** `status_line` 字段：

```json
{
  "其他已有配置": "...",
  "status_line": "cc-glm-status"
}
```

> 注意是**合并**，不要覆盖文件中已有的内容。

### 验证

重新打开 Claude Code，底部状态行应显示配额信息。也可在终端手动测试：

```bash
cc-glm-status --version        # 确认安装成功
echo '{}' | cc-glm-status      # 应输出带颜色的状态行（显示 Unknown 模型名）
echo '{}' | cc-glm-status --debug  # 查看详细诊断信息
```

## 状态行说明

各段以 ` | ` 分隔：

| 段 | 示例 | 说明 |
|---|---|---|
| **Model** | `GLM-5-Turbo` | 当前使用的模型 |
| **Tokens** | `Tokens ████████░░ 78% (0h23m)` | Token 配额用量 + 进度条 + 重置倒计时 |
| **MCP** | `MCP ●○ 84` | MCP 工具用量（● > 50%，○ ≤ 50%）+ 总计 |
| **Ctx** | `Ctx 35%` | 上下文窗口使用率 |

颜色含义：绿色 < 50%、黄色 50–79%、红色 ≥ 80%。

无配额数据时显示 `Quota ---`。

## 故障排查

### 状态行显示 "Quota ---"

```bash
echo '{}' | cc-glm-status --debug
```

- 看到 `未找到 API Key` → 环境变量未设置，检查第 1 步
- 看到 `认证失败` → API Key 无效，重新复制正确的 Key
- 看到 `Z.ai 服务器错误` → Z.ai 暂时故障，稍后重试
- 有数据但仍显示 `---` → 清除缓存：`rm ~/.claude/cache/glm-status-cache.json`

### Node.js 版本太旧

```bash
node --version  # 需要 v18.0.0 或更高
```

如果版本低于 18，通过 [nvm](https://github.com/nvm-sh/nvm) 升级：

```bash
nvm install 18
nvm use 18
```

### 命令未找到

```bash
which cc-glm-status  # 确认安装路径在 PATH 中
npm list -g cc-glm-status  # 确认全局安装成功
```

## CLI 选项

| 选项 | 说明 |
|---|---|
| `--help` / `-h` | 显示帮助信息 |
| `--version` / `-v` | 显示版本号 |
| `--debug` | 输出诊断信息到 stderr（排查问题用） |

## 环境变量

| 变量 | 说明 |
|---|---|
| `ZAI_API_KEY` | Z.ai API Key（最高优先级） |
| `ZHIPU_API_KEY` | 智谱 (GLM) API Key |
| `ANTHROPIC_AUTH_TOKEN` | Anthropic 认证令牌（最低优先级） |
| `CC_GLM_DEBUG` | 设为 `1` 启用调试输出（等同于 `--debug`） |

## 开发

```bash
git clone https://github.com/hugo617/cc-glm-status.git
cd cc-glm-status
npm install   # 无依赖，仅验证环境
npm test      # 运行测试
```

零外部依赖，仅使用 Node.js 18+ 原生模块。

## 许可证

MIT
