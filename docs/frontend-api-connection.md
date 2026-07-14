# Frontend API Connection

Status: B3 demo connection is implemented, and B4 adds local SQLite/Drift mode. The app can alternate between mock, API, and local repositories through `DataSourceMode`.

## Data Source Mode

The active mode lives in:

`apps/mobile/lib/core/config/data_source_mode.dart`

Current mode:

```dart
DataSourceMode.local
```

Available modes:

- `mock`: always uses local mock repositories.
- `api`: uses API repositories and surfaces errors.
- `apiWithMockFallback`: tries the backend first, then falls back to mock repositories.
- `local`: uses SQLite/Drift repositories.
- `localWithApiFallback`: tries SQLite first, then API/mock if local data is empty or unavailable.

## API Base URL

The API configuration lives in:

`apps/mobile/lib/core/config/api_config.dart`

Defaults:

- iOS simulator, desktop: `http://localhost:3000/api`
- Android emulator option: `http://10.0.2.2:3000/api`

For Android emulator, change `developmentBaseUrl` to `androidEmulatorBaseUrl`.

## HTTP Client

The demo client lives in:

`apps/mobile/lib/core/http/api_client.dart`

It:

- Applies a timeout.
- Decodes JSON.
- Expects the standard backend envelope `{ ok, data, message, errors }`.
- Throws when the status is not 2xx or `ok != true`.
- Does not send auth headers yet.

Because this environment could not update Flutter's global cache to install new packages, the client avoids adding a new package for now. It uses a small conditional transport: `dart:io` for mobile/desktop, `dart:html` for web, and can be switched to `package:http` later after `flutter pub get` can run.

## Providers

Providers exist by module:

- Finances: `financesRepositoryProvider`, `financeSummaryProvider`, `financeMovementsProvider`, `upcomingPaymentsProvider`
- Calendar: `calendarRepositoryProvider`, `calendarEventsProvider`
- Subscriptions: `subscriptionsRepositoryProvider`, `subscriptionsProvider`
- Debts: `debtsRepositoryProvider`, `debtsProvider`
- Tasks: `tasksRepositoryProvider`, `tasksProvider`
- Reminders: `remindersRepositoryProvider`, `remindersProvider`
- Inbox: `inboxRepositoryProvider`, `interpretInboxTextProvider`

## Connected Screens

These screens consume repository-backed providers, which can use local data,
the API, or mocks according to the selected mode:

- Dashboard: finance summary, upcoming payments, next calendar event.
- Finances: summary, movements, upcoming payments.
- Calendar: events.
- Subscriptions: subscription list.
- Debts: debt list.
- Inbox: backend mock interpretation with local fallback.

Forms save to local storage in local mode. Auth, sync, and real AI remain future
work beyond the local-first foundation. SQLite/Drift is the active B4 mode.
