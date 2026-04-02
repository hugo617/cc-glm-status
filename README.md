# cc-glm-status

Real-time status line for Claude Code + GLM Coding Plan (Z.ai) — shows token quota, reset countdown, MCP usage, and context window.

## Installation

```bash
# Global install
npm install -g .

# Or use npm link for local development
npm link
```

## Configuration

Set one of the following environment variables (checked in priority order):

| Variable | Description |
|---|---|
| `ZAI_API_KEY` | Z.ai API key (highest priority) |
| `ZHIPU_API_KEY` | Zhipu (GLM) API key |
| `ANTHROPIC_AUTH_TOKEN` | Anthropic auth token (lowest priority) |

## Claude Code Setup

Add the following to your Claude Code settings to enable the status line:

```json
{
  "status_line": "cc-glm-status"
}
```

Or configure the hook directly in `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "cc-glm-status"
          }
        ]
      }
    ]
  }
}
```

## Status Line Segments

The status line displays the following segments separated by `|`:

| Segment | Example | Description |
|---|---|---|
| **Model** | `GLM-5-Turbo` | Current model name from Claude Code |
| **Tokens** | `Tokens ███░░░░░░░ 22% (1h02m)` | Token quota usage with progress bar and reset countdown |
| **MCP** | `MCP ●○ 84` | MCP tool usage (● > 50%, ○ ≤ 50%) with total count |
| **Ctx** | `Ctx 35%` | Context window usage percentage |

Color coding: green (< 50%), yellow (50–79%), red (≥ 80%).

## Development

```bash
npm test              # Run tests
npm run test:watch    # Watch mode
npm start             # Run main program
```

Zero dependencies — uses only Node.js 18+ native modules.
