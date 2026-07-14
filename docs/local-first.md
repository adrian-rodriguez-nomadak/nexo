# Local-First Storage

B4 adds a local-first layer for Flutter using Drift and SQLite.

## Data Source Mode

`apps/mobile/lib/core/config/data_source_mode.dart` now supports:

- `mock`: local mock repositories only.
- `api`: backend API repositories only.
- `apiWithMockFallback`: backend first, mock fallback.
- `local`: SQLite/Drift repositories.
- `localWithApiFallback`: SQLite first, then API/mock if local is empty or fails.

Current mode:

```dart
DataSourceMode.local
```

## Database

The database lives under:

`apps/mobile/lib/core/database/`

It defines Drift tables for:

- Finance movements and upcoming payments.
- Subscriptions.
- Debts and debt payments.
- Calendar events.
- Tasks.
- Reminders.
- Inbox actions.

Every table includes `syncStatus`, `createdAt`, and `updatedAt` to prepare future sync without implementing sync yet.

## DAOs

Simple DAOs live in:

`apps/mobile/lib/core/database/daos/`

They expose local CRUD-style methods for each module. They do not talk to the backend.

## Local Repositories

Each module has a local repository in its `data/repositories` folder. These repositories translate Drift rows into existing domain models, keeping the UI and providers stable.

## Demo Seed

`LocalSeedService.seedIfEmpty()` is available as opt-in development tooling. It
must not run automatically when validating real user flows, so a fresh install
starts with an empty local database.

The seed is intentionally small and mirrors the existing prototype data.

## Pending Sync Work

The local database is ready for sync, but B4 does not implement:

- Pull/push sync.
- Conflict resolution.
- Auth-bound local scopes.
- Background sync.
- Offline queue replay.
