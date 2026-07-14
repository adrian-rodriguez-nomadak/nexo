# Nexo Architecture

Nexo is planned as a local-first personal operating system for day planning, finances, reminders, debts, subscriptions, and future health context.

## Product Direction

- Flutter owns the mobile UI, local security screens, notifications, widgets, and future local data.
- The backend owns AI processing, sync, backups, account-level APIs, and heavier asynchronous work.
- The current app uses Riverpod providers with mock, API, and local Drift
  repository implementations. Local mode is the active development default.
- Backend integration is available in demo mode; it is not yet authenticated or
  synchronized with local records.

## Mobile Layers

Flutter will gradually move toward:

- `presentation`: screens, bottom sheets, visual states, and user flows.
- `domain`: plain Dart models and repository contracts.
- `data`: mock repositories for development, plus local Drift and API repositories.

SQLite/Drift already provides local persistence. The next data milestone is a
conflict-safe sync protocol.

## Backend Layers

The backend starts as a modular Express API:

- `config`: environment and database configuration.
- `shared`: database client, middlewares, response helpers, validation, auth helpers.
- `modules`: auth, users, finances, subscriptions, debts, calendar, tasks, reminders, inbox, AI, and sync.

The backend is not the source of truth for the current Flutter UI yet. It is a skeleton for future auth, sync, backups, and AI.

## Roadmap

1. Keep visual prototype stable.
2. Add domain models and backend skeleton.
3. Add local database with Drift.
4. Connect API for auth and sync.
5. Add real AI interpretation and summaries.
6. Add real notifications, local security, and widgets.
