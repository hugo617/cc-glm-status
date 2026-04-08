#!/usr/bin/env node

// Node 版本检查
const [major] = process.versions.node.split('.').map(Number);
if (major < 18) {
  console.error(`cc-glm-status 需要 Node.js >= 18.0.0（当前: ${process.version}）`);
  process.exit(1);
}

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

// --version / -v
if (args.includes('--version') || args.includes('-v')) {
  const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
  console.log(`cc-glm-status v${pkg.version}`);
  process.exit(0);
}

// --help / -h
if (args.includes('--help') || args.includes('-h')) {
  const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
  console.log(`cc-glm-status v${pkg.version} — Claude Code + GLM Coding Plan 实时状态行

用法:
  cc-glm-status                运行状态行工具（从 stdin 读取 JSON）
  cc-glm-status --help         显示帮助信息
  cc-glm-status --version      显示版本号
  cc-glm-status --debug        输出诊断信息到 stderr

配置:
  按优先级读取环境变量:
    ZAI_API_KEY              Z.ai API Key（最高优先级）
    ZHIPU_API_KEY            智谱 (GLM) API Key
    ANTHROPIC_AUTH_TOKEN      Anthropic 认证令牌（最低优先级）

  在 ~/.claude/settings.json 中添加:
    { "status_line": "cc-glm-status" }

缓存:
  路径: ~/.claude/cache/glm-status-cache.json
  有效期: 120秒（正常）/ 30秒（错误）
  清除: rm ~/.claude/cache/glm-status-cache.json`);
  process.exit(0);
}

// --debug: 通过环境变量传递给 src/index.mjs
if (args.includes('--debug')) {
  process.env.CC_GLM_DEBUG = '1';
}

const index = await import(join(__dirname, '..', 'src', 'index.mjs'));
