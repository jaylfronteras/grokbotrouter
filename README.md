# grokbotrouter

Standalone external inference router for the official Grok Bot runtime.

It keeps Grok Bot's UI, Box/Sand environment, tools, skills, plugins/MCP, files and computer capabilities, while redirecting model inference through a user-controlled OpenAI-compatible endpoint.

## Current scope

- Loopback Connect-RPC inference proxy
- OpenAI-compatible `/chat/completions` upstream
- GrokBot tool-call translation
- Usage/audit logging
- Reversible `host-main.cjs` patch
- Restore/uninstall flow
- Windows NSIS installer build

The router is intentionally **fail-closed**. If the external inference router is unavailable, it does not silently fall back to Cursor/Grok inference.

## Environment

```cmd
set SAND_OPENAI_COMPATIBLE_BASE_URL=https://provider.example/v1
set SAND_OPENAI_COMPATIBLE_MODEL=provider-model-id
set SAND_OPENAI_COMPATIBLE_API_KEY=your-key
```

Then run:

```cmd
npm run router:start
```

See [docs/OFFICIAL-HOST-ROUTER.md](docs/OFFICIAL-HOST-ROUTER.md) for architecture and verification criteria.

> This is an unofficial project and patches undocumented Grok Bot internals. Grok Bot updates may require a router update.
