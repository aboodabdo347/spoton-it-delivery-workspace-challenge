# AI Usage

## Tools Used

| Tool | Used? | Notes |
| --- | --- | --- |
| Claude | Yes | Claude Code (claude-sonnet-4-6) via CLI |
| ChatGPT / Codex / Cursor | No | |

## Summary

Claude Code implemented the full feature set. I approved all architectural decisions upfront, reviewed every generated file, tested each endpoint manually and fix some errors.

## Main Areas AI Helped With

- Generated entities, DTOs, services, controllers, and Next.js pages
- Suggested `@Unique` on `score_events` for DB-level idempotency
- Chose JSON text transformer for `linkedWorkItemIds` to avoid TypeORM issues
- Diagnosed the old stub backend still holding port 3001 on startup

## What You Reviewed Manually

- Status transition logic against the spec
- Checking visit some endpoints without login/token.
- Bugs and erros i fixed 

## What AI Got Wrong

- Bugs on locate the correct endpoints, fixed later.
- Some bugs on counting points, was fixed later.

## Commands Run

```bash
npm run install:all
docker compose up -d postgres
cd backend-nest && npm run start:dev
cd frontend-next && npm run dev
cd backend-nest && npx tsc --noEmit
npm run build
```

## Known Limitations

- Single seeded user, no registration
- `synchronize: true` instead of migrations
- No UI or UX updates

## Prompt Log

See [PROMPT_LOG.md](PROMPT_LOG.md).
