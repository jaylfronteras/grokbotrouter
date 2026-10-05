# Official-host inference router

This deployment mode keeps the official Grok Bot / Sand / Box runtime and changes only the inference transport.

## Goal

Route normal and summarization model sessions to a user-controlled OpenAI-compatible endpoint while preserving Grok Bot UI, agent orchestration, tools, skills, MCP/plugins, files, and computer capabilities.

This mode is designed to measure and minimize Grok-hosted **model inference** usage. It does not claim that Grok Bot makes zero backend requests: non-inference services may still contact Cursor/Grok infrastructure.

## Architecture

```text
Official Grok Bot / Box
  -> createCursorInferencePromptSession()
  -> localhost inference router
  -> OpenAI-compatible /v1/chat/completions
  -> translated streaming response
  -> Grok Bot agent/tool loop
```

The host patch must be fail-closed: if the local router is unavailable, it must report an inference error rather than silently falling back to Cursor/Grok inference.

## Safety and reversibility

- Back up `host-main.cjs` before modifying it.
- Refuse to patch an unknown host layout.
- Syntax-check the patched bundle before activation.
- Restore the original automatically if validation fails.
- Provide an uninstall/restore command.
- Bind the router to loopback only by default.
- Keep API keys outside source control.
- Re-apply only after verifying the expected inference hook after Grok Bot updates.

## Verification target

A successful test must separately account for:

1. main agent inference requests,
2. summarization inference requests,
3. tool-call continuations,
4. external-provider token usage,
5. residual requests to Cursor/Grok endpoints.

Only after observing the network/runtime audit should the project describe Grok model-token usage as near-zero. A generic backend request is not automatically a model-token request.
