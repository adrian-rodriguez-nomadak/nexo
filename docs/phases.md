# Nexo Phases

## Fase 1: UI Prototype

Build the premium Flutter prototype with mock data, bottom sheets, details, and simulated actions.

## Fase 2: Domain Models + Backend Skeleton

Prepare Dart domain contracts and a modular Node/Express API without connecting the UI yet.

Status: completed.

## B2: Backend CRUD + Validations + Demo Seed

Implement CRUD endpoints with Zod validation, consistent JSON responses, demo user data, and prepared Flutter API repositories without wiring UI screens.

Status: completed.

## B3: Flutter API Connection Demo

Connect Flutter screens to the backend in demo mode with mock fallback, Riverpod providers, API repositories, and UI-safe loading states.

Status: completed.

## B4: Local-First With Drift

Add SQLite/Drift storage, local repositories, demo local seed, local data source mode, and local form saves without implementing sync yet.

Status: completed. Drift files are generated and local repositories are active.

## B4.1: Stabilization and Empty Local Mode

Make the existing mobile foundation reliable before expanding scope: clean analysis,
passing tests, repository hygiene, current documentation, and an empty local database
for manual flow validation. Demo seeds remain opt-in development tooling.

Status: in progress.

## Fase 3: Manual Flow Validation

Install the app with no preloaded data and validate creation, editing, deletion,
persistence, navigation, forms, and empty states using real user-entered records.

## Fase 4: Backend Real + Sync

Implement real auth, cloud sync, backups, and account APIs.

Status: in progress. The backend now has register/login, rotating refresh
sessions, authenticated per-user CRUD isolation, versioned push/pull sync,
idempotent operations, conflict responses, and a PostgreSQL migration. Flutter
has secure sessions, authenticated retry, a persistent raw-SQL sync queue,
per-record server versions, push/pull, remote staging and guarded application
for all local entities. Manual two-device and real PostgreSQL validation, backup
automation and a user-facing conflict resolver remain pending.

## Fase 5: Auth Real

Implement account registration, login, secure session storage, and per-user data.

## Fase 6: IA Real Para Interpretar Acciones

Connect AI parsing for inbox actions, summaries, insights, and user-confirmed structured records.

## Fase 7: Notificaciones, Seguridad, Widgets

Add real notifications, local security, biometrics, lock flows, and home screen widgets.

## Fase 8: Salud, Mapas y Alarmas Inteligentes

Expand into health context, location-aware planning, maps, and smarter alarms.
