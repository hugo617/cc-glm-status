// cc-glm-status test suite
// Run: node test/test.mjs

import {
  parseStdin,
  parseQuotaData,
  colorByPercentage,
  formatBar,
  formatCountdown,
  formatTokens,
  inferContextSize,
  renderStatusLine,
  writeCache,
  readCache,
} from '../src/index.mjs';

import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

let passed = 0;
let failed = 0;

function assert(condition, name, actual, expected) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    failed++;
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
    if (actual !== undefined) {
      console.log(`    \x1b[31m  got:      ${JSON.stringify(actual)}\x1b[0m`);
    }
    if (expected !== undefined) {
      console.log(`    \x1b[31m  expected: ${JSON.stringify(expected)}\x1b[0m`);
    }
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

// ── formatTokens ─────────────────────────────────────────────────────

console.log('\nformatTokens:');

assert(formatTokens(0) === '0', 'formats 0');
assert(formatTokens(500) === '500', 'formats small numbers as-is');
assert(formatTokens(999) === '999', 'formats <1000 as-is');
assert(formatTokens(1_000) === '1k', 'formats 1000 as 1k');
assert(formatTokens(70_000) === '70k', 'formats 70k');
assert(formatTokens(200_000) === '200k', 'formats 200k');
assert(formatTokens(999_499) === '999k', 'formats 999499 as 999k');
assert(formatTokens(999_500) === '1.0M', 'formats 999500 as 1.0M (boundary)');
assert(formatTokens(999_999) === '1.0M', 'formats 999999 as 1.0M');
assert(formatTokens(1_000_000) === '1.0M', 'formats 1M');
assert(formatTokens(1_500_000) === '1.5M', 'formats 1.5M');

// ── inferContextSize ─────────────────────────────────────────────────

console.log('\ninferContextSize:');

assert(inferContextSize('GLM-5-Turbo') === 200_000, 'matches GLM models');
assert(inferContextSize('claude-sonnet-4-6') === 200_000, 'matches Claude models');
assert(inferContextSize('glm-5.1') === 200_000, 'case-insensitive GLM match');
assert(inferContextSize('my-claude-wrapper') === 200_000, 'matches substring with hyphen pattern');
assert(inferContextSize('Unknown') === 200_000, 'returns default for unknown models');
assert(inferContextSize('') === 200_000, 'returns default for empty string');

// ── renderStatusLine ─────────────────────────────────────────────────

console.log('\nrenderStatusLine:');

const stdinFull = { modelName: 'GLM-5-Turbo', contextUsed: 35 };
const quotaFull = parsed;

const output = renderStatusLine(stdinFull, quotaFull);
assert(output.includes('GLM-5-Turbo'), 'includes model name');
assert(output.includes('Tokens'), 'includes token section');
assert(output.includes('22%'), 'includes token percentage');
assert(output.includes('MCP'), 'includes MCP section');
assert(output.includes('Ctx ') && output.includes('35%'), 'includes context');
assert(output.includes('70k/200k'), 'includes token count in context');

const outputFallback = renderStatusLine({ modelName: 'GLM-5-Turbo', contextUsed: 35 }, null);
assert(outputFallback.includes('Quota ---'), 'shows fallback when no quota data');
assert(outputFallback.includes('Ctx ') && outputFallback.includes('35%'), 'shows context in fallback');
assert(outputFallback.includes('70k/200k'), 'includes token count in fallback');

const outputHighCtx = renderStatusLine(
  { modelName: 'GLM-5-Turbo', contextUsed: 85 },
  { ...quotaFull }
);
assert(outputHighCtx.includes('Ctx ') && outputHighCtx.includes('85%'), 'includes high context percentage');
assert(outputHighCtx.includes('170k/200k'), 'includes high token count');
assert(outputHighCtx.includes('\x1b[31m'), 'high context shows red color');

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
try { unlinkSync(join(homedir(), '.claude', 'cache', 'glm-status-cache.json')); } catch {}

// ── writeCache return value ──────────────────────────────────────────

console.log('\nwriteCache return value:');

const writeResult = writeCache({ test: 'return' }, false);
assert(writeResult === true, 'writeCache returns true on success');

// Clean up
try { unlinkSync(join(homedir(), '.claude', 'cache', 'glm-status-cache.json')); } catch {}

// ── Cache expiry ────────────────────────────────────────────────────

console.log('\nCache expiry:');

// Write a cache entry with a manipulated timestamp to test expiry
const cachePath = join(homedir(), '.claude', 'cache', 'glm-status-cache.json');

// Normal cache: 120s — write entry 121s old, should be expired
writeFileSync(cachePath, JSON.stringify({
  data: { expired: true },
  timestamp: Date.now() - 121_000,
  isError: false,
}));
assert(readCache() === null, 'normal cache expires after 120s');

// Error cache: 30s — write entry 31s old, should be expired
writeFileSync(cachePath, JSON.stringify({
  data: { expired: true },
  timestamp: Date.now() - 31_000,
  isError: true,
}));
assert(readCache() === null, 'error cache expires after 30s');

// Error cache: 30s — write entry 25s old, should still be valid
writeFileSync(cachePath, JSON.stringify({
  data: { stillValid: true },
  timestamp: Date.now() - 25_000,
  isError: true,
}));
assert(readCache()?.stillValid === true, 'error cache valid within 30s');

// Clean up
try { unlinkSync(cachePath); } catch {}

// ── parseStdin validation ────────────────────────────────────────────

console.log('\nparseStdin validation:');

assert(
  parseStdin('{"model":{"display_name":""}}').modelName === 'Unknown',
  'empty string model name returns Unknown'
);

assert(
  parseStdin('{"model":{"display_name":null}}').modelName === 'Unknown',
  'null model name returns Unknown'
);

assert(
  parseStdin('{"model":{"display_name":123}}').modelName === 'Unknown',
  'numeric model name returns Unknown'
);

assert(
  parseStdin('{"context_window":{"used_percentage":"42"}}').contextUsed === null,
  'string context percentage returns null'
);

assert(
  parseStdin('{"context_window":{"used_percentage":-5}}').contextUsed === null,
  'negative context percentage returns null'
);

assert(
  parseStdin('{"context_window":{"used_percentage":Infinity}}').contextUsed === null,
  'Infinity context percentage returns null'
);

// ── parseQuotaData edge cases ────────────────────────────────────────

console.log('\nparseQuotaData edge cases:');

const emptyLimits = parseQuotaData({ level: 'pro', limits: [] });
assert(emptyLimits.level === 'pro', 'handles empty limits array');
assert(emptyLimits.tokenLimit === null, 'no token limit with empty limits');
assert(emptyLimits.timeLimit === null, 'no time limit with empty limits');

const unknownLimitType = parseQuotaData({ limits: [{ type: 'UNKNOWN_TYPE', percentage: 50 }] });
assert(unknownLimitType.tokenLimit === null, 'ignores unknown limit types');
assert(unknownLimitType.timeLimit === null, 'ignores unknown limit types');

// ── formatBar edge cases ────────────────────────────────────────────

console.log('\nformatBar edge cases:');

assert(formatBar(0) === '\u2591'.repeat(10), '0% is all empty (recheck)');
assert(formatBar(100) === '\u2588'.repeat(10), '100% is all filled (recheck)');
assert(formatBar(-5) === '\u2591'.repeat(10), 'negative percentage gives all empty');
assert(formatBar(150) === '\u2588'.repeat(10), 'over 100% gives all filled');

// ── colorByPercentage edge cases ────────────────────────────────────

console.log('\ncolorByPercentage edge cases:');

assert(colorByPercentage(0) === '\x1b[32m', '0% returns green');
assert(colorByPercentage(49) === '\x1b[32m', '49% returns green');
assert(colorByPercentage(79) === '\x1b[33m', '79% returns yellow');
assert(colorByPercentage(80) === '\x1b[31m', '80% returns red');

// ── Summary ──────────────────────────────────────────────────────────

console.log(`\n\x1b[1m${passed + failed} tests: ${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
