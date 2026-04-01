// cc-glm-status test suite
// Run: node test/test.mjs

import {
  parseStdin,
  parseQuotaData,
  colorByPercentage,
  formatBar,
  formatCountdown,
  renderStatusLine,
  writeCache,
  readCache,
} from '../src/index.mjs';

import { readFileSync, unlinkSync } from 'node:fs';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    failed++;
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
  }
}

// ── parseStdin ───────────────────────────────────────────────────────

console.log('\nparseStdin:');

assert(
  parseStdin('{"model":{"display_name":"GLM-5-Turbo"},"context_window":{"used_percentage":35}}').modelName === 'GLM-5-Turbo',
  'extracts display_name'
);

assert(
  parseStdin('{"model":{"id":"GLM-5.1"}}').modelName === 'GLM-5.1',
  'falls back to model.id'
);

assert(
  parseStdin('{}').modelName === 'Unknown',
  'returns Unknown for empty object'
);

assert(
  parseStdin('invalid').modelName === 'Unknown',
  'returns Unknown for invalid JSON'
);

assert(
  parseStdin('{"context_window":{"used_percentage":42.7}}').contextUsed === 42.7,
  'extracts context percentage'
);

assert(
  parseStdin('{}').contextUsed === null,
  'returns null context for empty object'
);

// ── parseQuotaData ───────────────────────────────────────────────────

console.log('\nparseQuotaData:');

const sampleApiData = {
  level: 'lite',
  limits: [
    {
      type: 'TIME_LIMIT',
      unit: 5,
      percentage: 65,
      remaining: 0,
      nextResetTime: Date.now() + 7200000,
      usageDetails: [
        { modelCode: 'search-prime', usage: 63 },
        { modelCode: 'web-reader', usage: 21 },
      ],
    },
    {
      type: 'TOKENS_LIMIT',
      unit: 3,
      number: 5,
      percentage: 22,
      nextResetTime: Date.now() + 3600000,
    },
  ],
};

const parsed = parseQuotaData(sampleApiData);
assert(parsed.level === 'lite', 'extracts level');
assert(parsed.tokenLimit?.percentage === 22, 'extracts token percentage');
assert(parsed.tokenLimit?.number === 5, 'extracts token number');
assert(parsed.timeLimit?.percentage === 65, 'extracts time percentage');
assert(parsed.mcpUsage.length === 2, 'extracts MCP usage count');
assert(parsed.mcpUsage[0].modelCode === 'search-prime', 'extracts MCP model codes');

const emptyParsed = parseQuotaData({});
assert(emptyParsed.level === 'unknown', 'defaults level to unknown');
assert(emptyParsed.tokenLimit === null, 'handles missing limits');
assert(emptyParsed.mcpUsage.length === 0, 'handles missing usageDetails');

// ── colorByPercentage ────────────────────────────────────────────────

console.log('\ncolorByPercentage:');

assert(colorByPercentage(30) === '\x1b[32m', '<50% returns green');
assert(colorByPercentage(50) === '\x1b[33m', '50% returns yellow');
assert(colorByPercentage(75) === '\x1b[33m', '75% returns yellow');
assert(colorByPercentage(80) === '\x1b[31m', '>=80% returns red');
assert(colorByPercentage(100) === '\x1b[31m', '100% returns red');

// ── formatBar ────────────────────────────────────────────────────────

console.log('\nformatBar:');

assert(formatBar(0) === '\u2591'.repeat(10), '0% is all empty');
assert(formatBar(100) === '\u2588'.repeat(10), '100% is all filled');
assert(formatBar(50).length === 10, 'bar is always 10 chars');

// ── formatCountdown ──────────────────────────────────────────────────

console.log('\nformatCountdown:');

assert(formatCountdown(null) === null, 'returns null for null');
assert(formatCountdown(Date.now() + 3720000) === '1h02m', 'formats hours and minutes');
assert(formatCountdown(Date.now() + 2700000) === '45m', 'formats minutes only');
assert(formatCountdown(Date.now() + 30000) === '<1m', 'formats <1 minute');
assert(formatCountdown(Date.now() - 1000) === '<1m', 'handles past timestamps');

// ── renderStatusLine ─────────────────────────────────────────────────

console.log('\nrenderStatusLine:');

const stdinFull = { modelName: 'GLM-5-Turbo', contextUsed: 35 };
const quotaFull = parsed;

const output = renderStatusLine(stdinFull, quotaFull);
assert(output.includes('GLM-5-Turbo'), 'includes model name');
assert(output.includes('Tokens'), 'includes token section');
assert(output.includes('22%'), 'includes token percentage');
assert(output.includes('MCP'), 'includes MCP section');
assert(output.includes('Ctx 35%'), 'includes context');

const outputFallback = renderStatusLine({ modelName: 'GLM-5-Turbo', contextUsed: 35 }, null);
assert(outputFallback.includes('Quota ---'), 'shows fallback when no quota data');
assert(outputFallback.includes('Ctx 35%'), 'shows context in fallback');

const outputReset = renderStatusLine(
  { modelName: 'GLM-5-Turbo', contextUsed: 50 },
  { ...quotaFull, tokenLimit: { ...quotaFull.tokenLimit, percentage: 100 } }
);
assert(outputReset.includes('RESET!'), 'shows RESET! at 100%');

// ── Cache ────────────────────────────────────────────────────────────

console.log('\nCache:');

const testData = { test: true };
writeCache(testData, false);
const cached = readCache();
assert(cached?.test === true, 'writes and reads cache');

// Clean up test cache
try { unlinkSync(`${process.env.HOME}/.claude/cache/glm-status-cache.json`); } catch {}

// ── Summary ──────────────────────────────────────────────────────────

console.log(`\n\x1b[1m${passed + failed} tests: ${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
