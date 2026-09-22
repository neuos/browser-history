# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project goal & status

This was vibe-coded and has never been run in production. The actual goal is one synced, searchable browser history across all of the owner's devices/browsers: **Firefox (PC), Firefox (Android), Orion (Mac), Chrome (Mac), Orion (iPad), Orion (iPhone)**. Treat "does this actually get us closer to that working end-to-end on those six targets" as the priority over adding backend polish (AOT, rate limiting, etc.) that doesn't serve it.

### Orion (Mac / iPad / iPhone) — researched 2026-09-22

Correcting an earlier wrong assumption in this doc: Orion does **not** need a Safari-Web-Extension Xcode wrapper. Per Kagi's own docs ([macOS](https://help.kagi.com/orion/browser-extensions/macos-extensions.html), [iOS/iPadOS](https://help.kagi.com/orion/browser-extensions/ios-ipados-extensions.html)):

- Orion is WebKit-based but implements its own WebExtensions layer and installs **real Chrome Web Store and Firefox AMO extensions directly, one-click, with no repackaging** — enable "third-party extensions" in Settings → Advanced (macOS) / Extensions → Advanced (iOS/iPadOS), then install from the store page inside Orion. This means the existing `extension/` project should be installable via its `chrome-mv3` or `firefox-mv2` WXT build as-is, on all three Orion targets — not confirmed by actually installing it yet, but no separate iOS/macOS packaging step should be required.
- Orion supports both MV2 and MV3 (own implementation, independent of Chromium's MV2 deprecation) and covers roughly 70% of the WebExtensions API on desktop; iOS/iPadOS has further Apple-imposed API restrictions on top of that, so fewer extensions are fully functional there and Kagi still calls extension support "beta" on iOS.
- Specific API coverage for this extension's dependencies (`webNavigation`, `unlimitedStorage`, MV3 `background.service_worker`) was **not confirmed** — Kagi's supported-APIs tracker is a large Google Sheet that couldn't be fully read via automated fetch. `storage`, `runtime.sendMessage`, `notifications`, `alarms`, and `idle` looked fully supported on both macOS and iOS/iPadOS from a partial read; `tabs` looked full on macOS but only partial on iOS/iPadOS. Treat all of this as needing empirical confirmation by actually loading the extension in Orion, not as settled fact.
- **Real risk, not Orion-specific but relevant**: Safari/WebKit extension background service workers on iOS have documented bugs (Apple developer forums) of being permanently killed within ~30–45s of install or once device RAM hits ~80%, and **not waking on trigger events** like `webNavigation` afterward. `extension/src/entrypoints/background.ts` in this repo runs as exactly that kind of MV3 service worker (continuous IndexedDB writes + SSE listening for sync) — this architecture may not survive backgrounded on Orion iPhone/iPad. Not confirmed to reproduce in Orion specifically. If it does, the `firefox-mv2` WXT build (non-service-worker background page) may be a more reliable target for the iOS/iPadOS Orion builds than `chrome-mv3` — worth testing both before assuming either works.

Firefox for Android's extension support/distribution model has not been investigated in this repo — don't assume the `firefox-mv2` desktop build behaves the same there without checking.

### Implementation status — audited 2026-09-22

What builds/passes right now: `dotnet-backend` solution builds clean and 248/248 tests pass (but `BrowserHistory.E2E.Tests` isn't in the `.sln` and fails to compile standalone — 13 errors from the pre-DTO-reorg namespaces, silently dropped rather than fixed). Legacy `backend/` (Deno) builds and its 57 test steps pass. `extension/` builds clean and `bun run check` has 0 type errors.

**The extension, as committed, only works against the legacy Deno `backend/` — not `dotnet-backend`.** Three independent, confirmed breaks if you point it at `dotnet-backend`:
- **Route prefix**: `SyncClient.ts` calls unprefixed paths (`/auth/register-device`, `/sync/events`, `/sse/events`) matching legacy `backend/src/main.ts`'s unprefixed mounts and `SyncSetup.svelte`'s default `http://localhost:8000`. `dotnet-backend` mounts everything under `/api/v1/...`.
- **Sync event shape**: the extension's `applySyncEvent` switches on `event.entityType`/`entityId` (history vs. page), but dotnet's `SyncEventDto` (`GetSyncEventsQuery.cs`) has no such fields — `SyncEvent` in `BrowserHistory.Domain` was never given an entity-type/entity-id concept at all. This is the core routing mechanism the whole sync protocol depends on, and it doesn't exist server-side yet. `SubmitSyncEventsCommand.cs` also hardcodes `entityType = "history" // TODO` when broadcasting, mislabeling Page syncs.
- **SSE auth**: the extension passes the JWT as `?token=` (EventSource can't set headers); dotnet's `SSEEndpoints.cs` requires standard Bearer auth via `DevicePolicy` with no query-string-token handling wired in `AuthenticationConfiguration.cs` — SSE against dotnet-backend 401s.

Also unconfirmed but likely broken: `refreshToken()` POSTs no body while dotnet's `RefreshToken` endpoint binds a required JSON body.

Not a gap: local search is real and wired — `HistoryList.svelte`'s search box calls `HistoryService.getHistoryEntries({query, ...})`, which does substring + date-range filtering over the local IndexedDB store. `PLAN.md`'s unchecked items (`EventBus`, `SyncOrchestrator`, `BackgroundSyncService`, most domain events) are confirmed still genuinely absent from `dotnet-backend`, not just stale checkboxes.

**Net**: this needs the backend integration layer rebuilt, not finishing touches — bringing `dotnet-backend` online for the extension means adding entityType/entityId as first-class sync-event data end-to-end, query-string JWT support for SSE, and reconciling the route-prefix convention, before any of the Orion/Firefox-Android platform work above is reachable.

## Repository layout

This is a monorepo with three independent components plus a shared Playwright test suite:

- **`dotnet-backend/`** — .NET 9 Clean Architecture sync server. **This is the active backend under development** (every recent commit touches only this directory).
- **`backend/`** — legacy Deno + Hono + SQLite sync server that `dotnet-backend` is replacing. Treat it as reference/legacy unless explicitly asked to change it.
- **`extension/`** — WXT + Svelte 5 browser extension (Chrome MV3, Firefox MV2, Safari) that captures history and syncs against one of the backends.
- **`tests/`** — root-level Playwright E2E suite exercising the built extension against a running backend.

Do not assume changes in one component require touching the others — they communicate only over the HTTP/SSE API contract.

## `dotnet-backend/` — primary backend

### Commands

Run from `dotnet-backend/`:

```bash
dotnet build                                    # build the whole solution
dotnet test                                     # run all test projects
dotnet test BrowserHistory.Domain.Tests         # run one test project
dotnet test --filter "FullyQualifiedName~Page"  # run tests matching a name
dotnet run --project BrowserHistory.Api         # run the API locally
docker compose -f docker-compose.dev.yml up     # run with hot reload in Docker
```

`TreatWarningsAsErrors` is enabled on every project — a warning fails the build, not just an analyzer pass.

### Architecture

Clean Architecture / CQRS, strict inward dependency direction: `Domain` → `Application` → `Infrastructure` → `Api`. `Domain` has zero project references or external package dependencies.

- **`BrowserHistory.Domain`** — entities (`Device`, `SyncEvent`, `HistoryNode`, `Page`), value objects (`DeviceId`, `Url`, `Checksum`, `Timestamp`), repository interfaces (`Repositories/`). Entities use private constructors + static `Create` factories and expose behavior methods (e.g. `Page.UpdateTitle`, `SetFavicon`) rather than public setters — mutation always goes through a validating method that also bumps `UpdatedAt`.
- **`BrowserHistory.Application`** — CQRS via MediatR. Organized by feature under `Features/{Auth,Devices,History,Pages,Sync}/`, each with `Commands/`, `Queries/`, and `Models/` (feature-scoped DTOs — this split replaced an earlier flat DTO layout because of naming collisions across features). `Common/Behaviors/ValidationBehavior.cs` runs FluentValidation validators as a MediatR pipeline behavior before every handler.
- **`BrowserHistory.Infrastructure`** — EF Core 9 + SQLite (`Data/BrowserHistoryDbContext.cs`, `Data/Configurations/`, `Data/Repositories/`), a separate `DeviceIdentityContext` for ASP.NET Core Identity/JWT auth (`Identity/`), and services (SSE via `ServerSentEventService`, caching, `DateTimeProvider`). All DI registration lives in `DependencyInjection.cs` (`AddInfrastructure`) — register new repositories/services there.
- **`BrowserHistory.Api`** — Minimal APIs only, no controllers. Each feature has an `Extensions/{Feature}Endpoints.cs` with a `Map{Feature}Endpoints()` extension called from `Program.cs`. Middleware (correlation ID, exception handling, request logging) lives in `Middleware/` and is wired via `app.UseCustomMiddleware()`.

Two SQLite databases exist side by side: the main `BrowserHistoryDbContext` (history/sync/page data) and `DeviceIdentityContext` (auth). Both are migrated independently — see `AddInfrastructure`'s `InitializeDatabaseAsync`.

Test projects mirror the layer they test (`*.Domain.Tests`, `*.Application.Tests`, `*.Infrastructure.Tests`) plus `BrowserHistory.E2E.Tests`, which spins up the full API via `WebApplicationFactory` against an isolated in-memory/SQLite database per test and includes FsCheck property-based tests for domain invariants.

Native AOT is configured in `BrowserHistory.Api.csproj` (`PublishAot`) but currently disabled while testing infra is built out — don't re-enable it without checking that flag first.

## `backend/` (legacy Deno server)

Only touch this if explicitly asked to work on the legacy server rather than `dotnet-backend`.

```bash
cd backend
deno task dev              # dev server with watch, port 8000
deno task db:migrate       # init/migrate SQLite schema
deno task test             # unit tests (src/tests/)
deno task test:integration # integration tests — requires the server already running (./test.sh)
```

Structure: `src/main.ts` entry point, `src/routes/{auth,sync,history,devices}.ts`, `src/database/database.ts` (SQLite via Deno's `node:sqlite`), `src/websocket/manager.ts`. Auth uses a shared secret for initial device registration plus JWT for subsequent requests.

## `extension/`

```bash
cd extension
bun run dev            # WXT dev server (default target: chrome-mv3)
bun run dev:firefox    # dev, Firefox target
bun run build          # production build to .output/
bun run check          # svelte-check type checking
```

Built with WXT (`wxt.config.ts`, `srcDir: 'src'`) + Svelte 5. Entry points under `src/entrypoints/`: `background.ts` (service worker — owns sync orchestration and IndexedDB writes), content scripts (`metadata-extractor.content.ts`, `spa-navigation.content.ts`, `theme.content.ts`), and `popup/` (Svelte UI).

Two library areas under `src/lib/`:
- **`HistoryTree/`** — local persistence layer. History is modeled as a tree (`Tree.ts`, `HistoryNode.ts`) rather than a flat list, so that SPA/back-forward navigation forms parent/child relationships; persisted to IndexedDB via `HistoryRepositoryIndexedDB.ts` / `PageRepositoryIndexedDB.ts` behind `IHistoryRepository`/`IPageRepository` interfaces.
- **`sync/`** — talks to the backend. `SyncClient.ts` does the actual HTTP/event-sourcing sync; `SyncService.ts`/`PopupSyncService.ts` wrap it for background vs. popup contexts. The background script's `SyncClient` accepts an `onSyncEventsApplied` callback that broadcasts a `HISTORY_UPDATED` runtime message so an open popup refreshes live instead of needing to be reopened — preserve this callback wiring when touching sync code, it's covered by the root E2E suite (`tests/e2e/cross-device-sync.spec.ts`).

## Root Playwright E2E suite (`tests/`)

Run from the repo root (needs Bun + the extension built):

```bash
bun run test:e2e              # build extension, run tests/e2e/
bun run test:e2e:core         # extension-core.spec.ts only
bun run test:e2e:sync         # cross-device-sync.spec.ts only
bun run test:e2e:headed       # headed mode
bun run test:e2e:debug        # Playwright debug mode
bun run debug:sync            # cd backend && deno run scripts/debug-sync.ts
bun run debug:db              # cd backend && deno run scripts/debug-database.ts
```

These tests currently target the legacy Deno `backend` (they start it via the scripts above, not `dotnet-backend`) and drive the real built extension via Playwright's persistent browser context — there's no mocking of the extension or backend.
