# App 3: Async AI Content Pipeline

Batch content processing via BullMQ. Users submit URLs/text, LLM uses tool calling to classify, extract entities, generate tags, and summarize. Results delivered via async webhook.

## Key AI pattern

Tool calling (function calling) with multi-tool execution. This is the foundation for app 8's agentic loop — here it's single-pass, there it's multi-turn.

## Stack

- Monorepo: `packages/api`, `packages/worker`, `packages/web`
- Next.js on Vercel, Express + BullMQ worker on Railway
- PostgreSQL on Neon, Redis on Railway
- Anthropic Claude API (tool use)

## Spec

Read `FULL_APPLICATION_SPEC.md` for full system design, DB schema, and task breakdown.

## Build order

POC → submit one URL, worker processes it with tool calling, store results → then webhook delivery → then frontend.
