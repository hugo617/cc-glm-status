#!/usr/bin/env node
// cc-glm-status — Real-time status line for Claude Code + GLM Coding Plan
// Zero-dependency ESM script using Node 18+ native fetch

import { readFileSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';

// ── Constants ────────────────────────────────────────────────────────

const API_URL = 'https://api.z.ai/api/monitor/usage/quota/limit';
const CACHE_DIR = `${process.env.HOME}/.claude/cache`;
const CACHE_PATH = `${CACHE_DIR}/glm-status-cache.json`;
const CACHE_MAX_AGE_MS = 120_000;
const CACHE_ERROR_AGE_MS = 30_000;
const API_TIMEOUT_MS = 5_000;

// ── ANSI Colors ──────────────────────────────────────────────────────

const C = Object.freeze({
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
});

const SEP = `${C.dim} | `;

// ── API Key ──────────────────────────────────────────────────────────

export function getApiKey() {
  const env = process.env;
  return (
    env.ZAI_API_KEY ||
    env.ZHIPU_API_KEY ||
    env.ANTHROPIC_AUTH_TOKEN ||
    null
  );
}

// ── Cache ────────────────────────────────────────────────────────────

export function readCache() {
  try {
    const raw = readFileSync(CACHE_PATH, 'utf8');
    const entry = JSON.parse(raw);
    if (typeof entry.timestamp !== 'number') return null;
    const maxAge = entry.isError ? CACHE_ERROR_AGE_MS : CACHE_MAX_AGE_MS;
    if (Date.now() - entry.timestamp > maxAge) return null;
    return entry.data;
  } catch {
    return null;
  }
}

export function writeCache(data, isError = false) {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    const tmp = `${CACHE_PATH}.${Date.now()}.tmp`;
    const content = JSON.stringify({ data, timestamp: Date.now(), isError });
    writeFileSync(tmp, content, 'utf8');
    renameSync(tmp, CACHE_PATH);
  } catch {
    // Silently ignore cache write failures
  }
}

// ── API Client ───────────────────────────────────────────────────────

export async function fetchQuotaData(token) {
  const res = await fetch(API_URL, {
    headers: { Authorization: token },
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`API returned ${res.status}`);
  }

  const json = await res.json();
  if (!json.success || json.code !== 200) {
    throw new Error(`API error: code=${json.code}`);
  }

  return json.data;
}

// ── Data Parsing ─────────────────────────────────────────────────────

export function parseQuotaData(data) {
  const result = {
    level: data.level || 'unknown',
    timeLimit: null,
    tokenLimit: null,
    mcpUsage: [],
  };

  for (const limit of data.limits || []) {
    if (limit.type === 'TIME_LIMIT') {
      result.timeLimit = {
        unit: limit.unit,
        percentage: limit.percentage,
        remaining: limit.remaining ?? null,
        nextResetTime: limit.nextResetTime ?? null,
      };
      result.mcpUsage = (limit.usageDetails || []).map((d) => ({
        modelCode: d.modelCode,
        usage: d.usage,
      }));
    } else if (limit.type === 'TOKENS_LIMIT') {
      result.tokenLimit = {
        unit: limit.unit,
        number: limit.number,
        percentage: limit.percentage,
        nextResetTime: limit.nextResetTime ?? null,
      };
    }
  }

  return result;
}

export function parseStdin(input) {
  try {
    const data = JSON.parse(input);
    return {
      modelName: data.model?.display_name || data.model?.id || 'Unknown',
      contextUsed: data.context_window?.used_percentage ?? null,
    };
  } catch {
    return { modelName: 'Unknown', contextUsed: null };
  }
}

// ── Formatting ───────────────────────────────────────────────────────

export function colorByPercentage(pct) {
  if (pct >= 80) return C.red;
  if (pct >= 50) return C.yellow;
  return C.green;
}

export function formatBar(pct, width = 10) {
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  return '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
}

export function formatCountdown(timestampMs) {
  if (!timestampMs) return null;
  const diffMs = Math.max(0, timestampMs - Date.now());
  const totalMin = Math.floor(diffMs / 60_000);

  if (totalMin >= 60) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h}h${m.toString().padStart(2, '0')}m`;
  }

  if (totalMin > 0) return `${totalMin}m`;
  return '<1m';
}

// ── Renderer ─────────────────────────────────────────────────────────

export function renderStatusLine(stdinData, quotaData) {
  const parts = [];

  // Model name
  parts.push(`${C.cyan}${stdinData.modelName}${C.reset}`);

  // Token quota
  if (quotaData?.tokenLimit) {
    const { percentage, nextResetTime } = quotaData.tokenLimit;
    const color = colorByPercentage(percentage);
    const bar = formatBar(percentage);
    const countdown = formatCountdown(nextResetTime);
    const label = percentage >= 100 ? 'RESET!' : `${percentage}%`;
    const timeStr = countdown ? ` ${C.dim}(${countdown})` : '';

    parts.push(`${C.dim}Tokens ${color}${bar} ${label}${timeStr}${C.reset}`);
  } else if (quotaData) {
    parts.push(`${C.dim}Tokens ---${C.reset}`);
  }

  // MCP usage
  if (quotaData?.mcpUsage?.length > 0) {
    const totalUsage = quotaData.mcpUsage.reduce((sum, m) => sum + m.usage, 0);
    const dots = quotaData.mcpUsage
      .map((m) => (m.usage > 50 ? '\u25CF' : '\u25CB'))
      .join('');
    parts.push(`${C.magenta}MCP ${dots} ${totalUsage}${C.reset}`);
  }

  // Context window
  if (stdinData.contextUsed !== null) {
    const pct = Math.round(stdinData.contextUsed);
    parts.push(`${C.dim}Ctx ${pct}%${C.reset}`);
  }

  // Quota unavailable fallback
  if (!quotaData) {
    const ctxPart =
      stdinData.contextUsed !== null
        ? ` | ${C.dim}Ctx ${Math.round(stdinData.contextUsed)}%${C.reset}`
        : '';
    return `${C.cyan}${stdinData.modelName}${C.reset}${SEP}${C.dim}Quota ---${C.reset}${ctxPart}`;
  }

  return parts.join(SEP);
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  // Read stdin (with 1s timeout for Claude Code piped input)
  let input = '';
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      process.stdin.destroy();
      resolve();
    }, 1000);

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      input += chunk;
    });
    process.stdin.on('end', () => {
      clearTimeout(timer);
      resolve();
    });
  });

  const stdinData = parseStdin(input);

  // Try cache first
  let quotaData = readCache();

  if (!quotaData) {
    const token = getApiKey();
    if (token) {
      try {
        const rawData = await fetchQuotaData(token);
        quotaData = parseQuotaData(rawData);
        writeCache(quotaData, false);
      } catch {
        // On error, try stale cache as fallback
        try {
          const raw = readFileSync(CACHE_PATH, 'utf8');
          const entry = JSON.parse(raw);
          quotaData = entry.data;
        } catch {
          quotaData = null;
        }
        writeCache(quotaData, true);
      }
    }
  }

  const output = renderStatusLine(stdinData, quotaData);
  process.stdout.write(output + '\n');
}

main().catch(() => process.exit(0));
