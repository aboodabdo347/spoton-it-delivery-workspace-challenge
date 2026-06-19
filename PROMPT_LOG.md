## 2026-06-19 22:00 - Claude Code

### Goal
Move the score system from in-memory state to PostgreSQL with idempotency: one score event per (userId, action, entityId) triple, wired into real workflow actions.

### Prompt
Asked Claude Code to create a `ScoreEvent` TypeORM entity with a unique constraint on `(userId, action, entityId)` for idempotency, rewrite `ScoreService` to persist to the DB, and inject it into `ItWorkspaceService` and `ReleaseService` to award points at meaningful workflow moments: +1 for creating a work item, +1 for moving to QA, +1 for a QA check passing, +2 for moving to ready-for-release, +3 for deploying a release.

### Output Summary
Created `score-event.entity.ts` with `@Unique(['userId', 'action', 'entityId'])` — TypeORM enforces idempotency at DB level. Rewrote `ScoreService` with two methods: `awardOnce()` (checks for existing row before insert, skips silently on duplicate) used for workflow-triggered points, and `award()` (non-idempotent, generates a unique `entityId`) kept for the existing `POST /score/events` manual endpoint. The `summaryFor()` method now queries the DB and returns `createdAt` as ISO string. Injected `ScoreService` into `ItWorkspaceService` (awards `work_item_created +1`, `work_item_moved_to_qa +1`, `work_item_ready_for_release +2`, `qa_check_passed +1`) and into `ReleaseService` (awards `release_deployed +3` after successful deploy). Added `@CurrentUser()` to `PATCH /work-items/:id`, `PATCH /qa-checks/:checkId`, and `POST /releases/:id/deploy` in their respective controllers so the acting user is identified for scoring. Registered `ScoreEvent` in `TypeOrmModule.forFeature` in `app.module.ts`.

### Files Changed
- `backend-nest/src/score/score-event.entity.ts` (created)
- `backend-nest/src/score/score.service.ts` (rewritten — DB-backed)
- `backend-nest/src/it-workspace/it-workspace.service.ts` (inject ScoreService, award on workflow transitions)
- `backend-nest/src/it-workspace/it-workspace.controller.ts` (pass user to update/updateQaCheck)
- `backend-nest/src/releases/release.service.ts` (inject ScoreService, award on deploy)
- `backend-nest/src/releases/release.controller.ts` (pass user to deploy)
- `backend-nest/src/app.module.ts` (added ScoreEvent to forFeature)

### Manual Review
Ran `tsc --noEmit` on backend — zero errors. Idempotency verified by logic: `awardOnce` finds existing row → returns early; if not found → inserts. Second deploy is blocked by `ConflictException` before `awardOnce` is reached, so deploy points can't be double-awarded regardless. QA check passed points use the DB-level unique constraint as a secondary safety net.

### Related Commit
None

---

## 2026-06-19 21:15 - Claude Code

### Goal
Build Release Notes end to end — backend entity, DTOs, service with deploy idempotency and work-item validation, controller, and full frontend with list, create, and detail pages.

### Prompt
Asked Claude Code to create a `releases` table with version, releaseDate, summary, deploymentStatus, and linkedWorkItemIds (stored as JSON text to avoid TypeORM simple-array edge cases). Service must: validate that only `ready_for_release` items can be linked, block deploy if already deployed (idempotency), block deploy with zero items, and call `markAsReleased` on the linked item IDs when deployed. Frontend needs list page, create form, detail page with a work-item picker (filtered to `ready_for_release`), status controls, and a deploy button.

### Output Summary
Created `releases/release.entity.ts` using a JSON value transformer for `linkedWorkItemIds`. Created `create-release.dto.ts`, `update-release.dto.ts`, and `link-items.dto.ts` (with `@IsUUID` per-item validation). Built `release.service.ts` with `create`, `findAll`, `findOne`, `update`, `linkItems`, `deploy`, and `remove`. Deploy throws `ConflictException` if already deployed and `BadRequestException` if rolled-back or has no items. `findOne` and `findAll` call `populate()` to fetch and attach linked `WorkItem` objects. Registered `Release` entity, `ReleaseController`, and `ReleaseService` in `app.module.ts`. Added `Release` and `DeploymentStatus` types to `api.ts` plus 6 new API methods. Built `releases/page.tsx` (list with summary counts), `releases/new/page.tsx` (create form), `releases/[id]/page.tsx` (detail with status controls, link-items checkbox picker, deploy button, and a deployed success banner). Added Releases nav link to `pm/layout.tsx`.

### Files Changed
- `backend-nest/src/releases/release.entity.ts` (created)
- `backend-nest/src/releases/dto/create-release.dto.ts` (created)
- `backend-nest/src/releases/dto/update-release.dto.ts` (created)
- `backend-nest/src/releases/dto/link-items.dto.ts` (created)
- `backend-nest/src/releases/release.service.ts` (created)
- `backend-nest/src/releases/release.controller.ts` (created)
- `backend-nest/src/app.module.ts`
- `frontend-next/src/lib/api.ts`
- `frontend-next/src/app/pm/releases/page.tsx` (created)
- `frontend-next/src/app/pm/releases/new/page.tsx` (created)
- `frontend-next/src/app/pm/releases/[id]/page.tsx` (created)
- `frontend-next/src/app/pm/layout.tsx`

### Manual Review
Ran `tsc --noEmit` on both backend and frontend — zero errors. Verified idempotency guard: `ConflictException` on second deploy attempt. Verified non-ready item rejection message includes item title and current status. Verified `markAsReleased` is called after status is saved (not before) to prevent partial state on DB error.

### Related Commit
None

---

## 2026-06-19 20:30 - Claude Code

### Goal
Build QA Checks end to end — backend entity, DTOs, service (with QA readiness enforcement on `ready_for_release`), controller routes, and a frontend QA Checks section on the work item detail page.

### Prompt
Asked Claude Code to add a `qa_checks` table with full CRUD, wire it into the work item update flow so that moving to `ready_for_release` is blocked if any check is not `passed` or if zero checks exist, and build the QA section on the detail page with a progress bar, pass/fail/reset buttons per check, and an inline add-check form.

### Output Summary
Created `qa-check.entity.ts` (id, workItemId, testTitle, expectedResult, actualResult, status, tester, notes, timestamps). Created `create-qa-check.dto.ts` and `update-qa-check.dto.ts`. Rewrote `it-workspace.service.ts` to inject `QaCheck` repo alongside `WorkItem`, added `createQaCheck`, `listQaChecks`, `updateQaCheck`, `removeQaCheck`, and an `assertQaReady` guard called on every `qa → ready_for_release` transition. Added 4 QA routes to the controller (`POST /work-items/:id/qa-checks`, `GET /work-items/:id/qa-checks`, `PATCH /qa-checks/:id`, `DELETE /qa-checks/:id`). Registered `QaCheck` in `TypeOrmModule.forFeature`. Added QA types and methods to `api.ts`. Rewrote `[id]/page.tsx` to include QA checks section with progress bar (turns green when all pass), pass/fail/reset action buttons, inline add-check form, and a visual `🔒` lock on the "Ready for Release" transition button when checks aren't all passed.

### Files Changed
- `backend-nest/src/it-workspace/qa-check.entity.ts` (created)
- `backend-nest/src/it-workspace/dto/create-qa-check.dto.ts` (created)
- `backend-nest/src/it-workspace/dto/update-qa-check.dto.ts` (created)
- `backend-nest/src/it-workspace/it-workspace.service.ts`
- `backend-nest/src/it-workspace/it-workspace.controller.ts`
- `backend-nest/src/app.module.ts`
- `frontend-next/src/lib/api.ts`
- `frontend-next/src/app/pm/it-workspace/[id]/page.tsx`

### Manual Review
Ran `tsc --noEmit` on both backend and frontend — zero errors in both. Verified the `assertQaReady` logic: zero checks → blocked, any non-passed check → blocked with specific check names in the error message. Frontend shows inline readiness hint ("2/3 QA checks passed") and locks the button before the backend even rejects the request.

### Related Commit
None

---

## 2026-06-19 19:45 - Claude Code

### Goal
Build the full Work Items frontend: list page with filters, create form, and detail/edit page with status transition buttons.

### Prompt
Asked Claude Code to update the API client with full WorkItem types and CRUD methods, then build three pages: (1) list page with summary count cards, filter bar (status, priority, text search, my-work toggle), and a table; (2) create page with all required fields; (3) detail page with view/edit toggle and status transition buttons that mirror the backend's allowed transitions.

### Output Summary
Updated `api.ts` with proper `WorkItem`, `CreateWorkItemPayload`, `UpdateWorkItemPayload` types and `workItem`, `createWorkItem`, `updateWorkItem`, `deleteWorkItem` methods. Built `it-workspace/page.tsx` with clickable status count cards, filter bar with clear-filters button, and a responsive table. Built `new/page.tsx` with a clean form. Built `[id]/page.tsx` with view/edit toggle, status badge transitions pulled from a local `NEXT_STATUSES` map mirroring the backend rules, and a delete button (hidden on released items). Created `frontend-next/.env.local`. Used React `use(params)` for Next.js 16 dynamic route params. All TypeScript checks passed with zero errors.

### Files Changed
- `frontend-next/src/lib/api.ts`
- `frontend-next/src/app/pm/it-workspace/page.tsx`
- `frontend-next/src/app/pm/it-workspace/new/page.tsx` (created)
- `frontend-next/src/app/pm/it-workspace/[id]/page.tsx` (created)
- `frontend-next/.env.local` (created)

### Manual Review
Ran `tsc --noEmit` on frontend — zero errors. Verified page structure matches existing design system CSS classes (`card`, `button`, `badge`, `table`, `page-header`, `eyebrow`).

### Related Commit
None

---

## 2026-06-19 19:07 - Claude Code

### Goal
Build the full Work Items backend: TypeORM entity, Create/Update DTOs with validation, service with workflow transition enforcement, and CRUD controller with search/filter support.

### Prompt
Asked Claude Code to create the WorkItem entity (all required fields from spec), DTOs using class-validator, a service that enforces the allowed status transitions (`backlog→planned→in_progress→qa→ready_for_release→released`, with `qa→in_progress` and `ready_for_release→qa` as allowed backtracking), and a controller with POST/GET/GET:id/PATCH/DELETE endpoints plus query filters for status, priority, assignee, search text, and myWork.

### Output Summary
Created `work-item.entity.ts` with explicit TypeORM column types to avoid metadata inference issues. Created `create-work-item.dto.ts` and `update-work-item.dto.ts` with class-validator decorators. Rewrote `it-workspace.service.ts` with real CRUD, transition validation via `ALLOWED_TRANSITIONS` map, and a `markAsReleased()` helper for future release deployment. Rewrote `it-workspace.controller.ts` with all 5 REST routes. Registered `WorkItem` in `TypeOrmModule.forFeature` in `app.module.ts`. Fixed `isolatedModules`+`emitDecoratorMetadata` TS errors by using `import type` for type-only imports and dropping union type annotations on DTO fields. Fixed `DataTypeNotSupportedError` by explicitly specifying `type: 'varchar'` on all nullable string columns in the entity.

### Files Changed
- `backend-nest/src/it-workspace/work-item.entity.ts` (created)
- `backend-nest/src/it-workspace/dto/create-work-item.dto.ts` (created)
- `backend-nest/src/it-workspace/dto/update-work-item.dto.ts` (created)
- `backend-nest/src/it-workspace/it-workspace.service.ts` (replaced stub)
- `backend-nest/src/it-workspace/it-workspace.controller.ts` (replaced stub)
- `backend-nest/src/app.module.ts` (added `TypeOrmModule.forFeature([WorkItem])`)

### Manual Review
Ran `tsc --noEmit` — zero errors. Started backend and confirmed all 5 work item routes mapped and `Nest application successfully started` with no DB errors. Verified `work_items` table is auto-created by TypeORM synchronize.

### Related Commit
None

---

## 2026-06-19 18:25 - Claude Code

### Goal
Wire up TypeORM + PostgreSQL connection to the NestJS backend so all future modules can persist data.

### Prompt
Asked Claude Code to install TypeORM packages, create a .env file, and configure ConfigModule + TypeOrmModule in app.module.ts using the existing DATABASE_URL env var pointing to the Docker PostgreSQL container.

### Output Summary
Installed `@nestjs/typeorm`, `typeorm`, `@nestjs/config`. Created `backend-nest/.env` from `.env.example`. Updated `app.module.ts` to add `ConfigModule.forRoot({ isGlobal: true })` and `TypeOrmModule.forRootAsync` using ConfigService to read DATABASE_URL. Set `synchronize: true` for auto-schema creation in dev. Verified backend starts with no errors and TypeOrmCoreModule initializes successfully.

### Files Changed
- `backend-nest/.env` (created)
- `backend-nest/src/app.module.ts`
- `backend-nest/package.json` (new deps added by npm install)

### Manual Review
Confirmed backend startup log shows `TypeOrmCoreModule dependencies initialized` and `Nest application successfully started` with no connection errors. Checked that Docker PostgreSQL container was running before test.

### Related Commit
None

---

## 2026-06-19 15:15 - Claude Code

### Goal
Understand current state of the starter codebase — identify what's already implemented vs. what's missing/placeholder before starting to build.

### Prompt
Asked Claude Code to read through the project files and identify what's missing in the code specifically (not general project requirements).

### Output Summary
Detailed breakdown of the existing starter: confirmed login/JWT auth is functional, identified the IT Workspace frontend page is blank/placeholder, identified the IT Workspace backend endpoints exist but return placeholder data with no real database logic, confirmed no Work Items/QA Checks/Releases tables exist yet in the schema, and listed which files need real implementation for Levels 1-5.

### Files Changed
- None

### Manual Review
Reviewed the file list and confirmed against the README's "Existing Project Map" table — matched what Claude Code found with what the README said should exist. Used this to plan the build order.

### Related Commit
None