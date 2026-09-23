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

### Implementation status — audited 2026-09-22, sync contract fixed same day

`dotnet-backend` solution builds clean; 302/302 tests pass, including `BrowserHistory.E2E.Tests` (in the `.sln`, rewritten 2026-09-23 — see below). `extension/` builds clean, `bun run check` has 0 type errors.

**The extension ↔ `dotnet-backend` sync path is now live-verified end-to-end** (register two devices → submit a sync event with a URL entityId and nested data from one → confirm the other receives it over its open SSE connection with correct shape → confirm `GET /sync/events?exclude_device=true` excludes the sender). What was fixed, in order:
- The API couldn't start a JSON request at all: `JsonSerializerIsReflectionEnabledByDefault=false` was set (AOT prep) with no working source-gen resolver wired in (`ApiJsonContext` existed but was never registered and was missing/mismatched DTOs). Reflection re-enabled; `ApiJsonContext` left as dead code until AOT is actually turned back on.
- `PerformanceExtensions.AddMemoryCaching()` was defined but never called in `Program.cs`, leaving `ICacheService`'s `IMemoryCache` dependency unresolvable — now wired in.
- `/api/v1/auth/register-device` only created a `DeviceUser` in the Identity DB, never the domain `Device` aggregate in the main DB that Sync/History/Page look up — every registered device got "Device not found" on its first sync call. `RegisterDeviceCommandHandler` now creates both. (A second, unrelated `POST /api/v1/devices/register` endpoint does create the domain `Device` but nothing calls it — dead code, left alone.)
- `refresh-token` always 401'd: it validated the client's token against a stored *refresh*-token secret the client never receives. It now validates the token as the access token it actually is. Also dropped `RefreshToken`'s dead body parameter — Minimal API 400s trying to bind any complex type from a truly empty body, which is exactly how the extension calls it.
- The sync-event contract itself (route prefix, `entityType`/`entityId`/`data`/`checksum` wiring, Unix-ms timestamps instead of ISO strings, SSE query-string JWT auth, JWT-derived `DeviceId` instead of a spoofable body field, `since`/`exclude_device` query binding) — see the `fix-sync-api-contract` branch commits for the full breakdown; `SyncEvent.EntityId` is a `string` now (pages are keyed by URL, not a GUID).

Not a gap: local search is real and wired — `HistoryList.svelte`'s search box calls `HistoryService.getHistoryEntries({query, ...})`, which does substring + date-range filtering over the local IndexedDB store. `PLAN.md`'s unchecked items (`EventBus`, `SyncOrchestrator`, `BackgroundSyncService`, most domain events) are confirmed still genuinely absent from `dotnet-backend`.

### E2E test rewrite (2026-09-23)

`BrowserHistory.E2E.Tests` was excluded from the `.sln` because its 4 `Workflows/*.cs` files (~1,340 lines) targeted a defunct API (`/api/sync/upload`, `/api/sync/download`, `UploadHistoryCommand`, a `DeviceResponse.IsOnline` field) with no trace left anywhere else in the codebase — not a namespace-import fix, a full rewrite against the real API. Now done and in the `.sln`; see git log on `dotnet-backend/BrowserHistory.E2E.Tests/` for the specifics. Two real, previously-undiscovered production bugs came out of writing these for real: `SyncEvent.Create()` ignored the client's event id entirely (making resubmission/conflict-detection non-functional — fixed, the client id is now the actual EF primary key), and `ExceptionHandlingMiddleware` crashed (500 instead of 400) whenever a single field failed more than one FluentValidation rule at once.

`E2ETestWebApplicationFactory`'s in-memory SQLite setup needed a real fix too: a bare `:memory:` connection string gives every new connection its own empty database, and routing everything through one shared, already-open connection "fixes" that but isn't safe under concurrent requests (SQLite doesn't support concurrent command execution on one connection object). It now uses SQLite's shared-cache mode (`mode=memory&cache=shared`, uniquely named per factory instance) instead — every request gets its own ordinary connection, all seeing the same database.

### Root Playwright suite (`tests/e2e/`) — run for real, 2026-09-23

All 10 tests across the 3 spec files pass against a live `dotnet-backend` (`bunx playwright test tests/e2e/ --workers=1`), driving the real built extension through actual browser navigation to real external sites (example.com, httpbin.org) — capture, sync, SSE live-update, cross-device delivery, and disconnect all verified working through the UI, not just curl.

Two things worth knowing if this stops passing:
- **Run it with `--workers=1`** (`package.json`'s `test:e2e*` scripts already do). `cross-device-sync.spec.ts` launches its own extra persistent browser contexts on top of the two other files' shared one; running all three as separate parallel workers is untested.
- **Test data must stay unique across runs.** `Device.DeviceName` is unique in the database, which is the real dev SQLite file (`dotnet-backend/data/browser-history-dev.db`) and persists across test runs — every device name and the one count-comparison test's URL are now suffixed with a per-run `Date.now()`. If you add a new test that registers a device or asserts on a "count went up" pattern, give it a unique name/URL the same way or it'll 500 (device name) or silently fail to grow the count (URL revisit updates an existing HistoryNode instead of adding one) the second time the suite runs without a fresh database.

## Repository layout

This is a monorepo with two independent components plus a shared Playwright test suite:

- **`dotnet-backend/`** — .NET 9 Clean Architecture sync server. The only backend in the repo — the legacy Deno + Hono backend that used to live in `backend/` was removed (see Implementation status below); don't recreate it or reference it as if it still exists.
- **`extension/`** — WXT + Svelte 5 browser extension (Chrome MV3, Firefox MV2, Safari) that captures history and syncs against the backend.
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

Test projects mirror the layer they test (`*.Domain.Tests`, `*.Application.Tests`, `*.Infrastructure.Tests`) plus `BrowserHistory.E2E.Tests`, which spins up the full API via `WebApplicationFactory` against a shared-cache in-memory SQLite database (one per test class, not per test method — call `ClearTestDataAsync()` first if a test asserts on exact row counts) and includes FsCheck property-based tests for domain invariants.

Native AOT is configured in `BrowserHistory.Api.csproj` (`PublishAot`) but currently disabled while testing infra is built out — don't re-enable it without checking that flag first.

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
```

`playwright.config.ts`'s `webServer` starts `dotnet-backend` (`dotnet run --project BrowserHistory.Api`, port 5165) before running. Tests drive the real built extension via Playwright's persistent browser context — there's no mocking of the extension or backend. As of the 2026-09-22 audit below, these tests are expected to fail against `dotnet-backend` until the sync-contract fixes described there land — that's a known, not-yet-fixed state, not a regression to chase.
