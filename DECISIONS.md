# Technical Decisions

## Summary

All five levels completed: Work Items CRUD + workflow (L1–L2), QA Checks with readiness gate (L3), Release Notes with deploy idempotency (L4), Score persistence with idempotent event sourcing (L5).

## Database Design

Four tables: `work_items`, `qa_checks`, `releases`, `score_events`.

- `qa_checks` belong to a work item via `workItemId`
- `releases.linkedWorkItemIds` stored as JSON text (avoids TypeORM `simple-array` edge cases)
- `score_events` has `@Unique(['userId', 'action', 'entityId'])` for DB-level idempotency
- `synchronize: true` — fine for dev, would use migrations in production

## API Design

Standard REST under `/work-items`, `/qa-checks`, `/releases`, `/score`. JWT required on all routes except `POST /auth/login`. Key non-obvious endpoints: `POST /releases/:id/link-items` and `POST /releases/:id/deploy`.

## Frontend Design

Three sections under `/pm`: IT Workspace (list + create + detail with QA checks inline), Releases (list + create + detail with deploy button), Score (summary + event log). Reused existing design system classes — no new CSS.

## Workflow Rules

- **Transitions**: `backlog→planned→in_progress→qa→ready_for_release→released`, with `qa↔in_progress` and `ready_for_release→qa` as allowed backtracks. Anything else throws 400.
- **QA gate**: moving to `ready_for_release` blocked if zero checks exist or any check isn't `passed`.
- **Deploy guard**: second deploy throws 409 `ConflictException`. Also blocked with zero linked items.
- **Score idempotency**: `awardOnce()` checks for existing row before insert; `@Unique` constraint is the safety net.

## Tradeoffs

- Single seeded user — credentials in `.env` as bcrypt hash, no plaintext in source
- No pagination — returns all rows, fine at this scale
- No loading states / optimistic UI — pages refetch on every action

## Unfinished Work

- Migration files instead of `synchronize: true`
- Role-based access control
- Pagination for large datasets
- E2E tests (Playwright)
