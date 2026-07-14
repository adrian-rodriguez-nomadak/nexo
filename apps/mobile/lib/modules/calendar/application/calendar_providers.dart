import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/data_source_mode.dart';
import '../../../core/database/database_provider.dart';
import '../../auth/application/auth_providers.dart';
import '../../../core/sync/sync_providers.dart';
import '../data/repositories/api_calendar_repository.dart';
import '../data/repositories/local_calendar_repository.dart';
import '../data/repositories/mock_calendar_repository.dart';
import '../domain/models/calendar_event.dart';
import '../domain/repositories/calendar_repository.dart';

final calendarRepositoryProvider = Provider<CalendarRepository>((ref) {
  return switch (ref.watch(dataSourceModeProvider)) {
    DataSourceMode.mock => MockCalendarRepository(),
    DataSourceMode.api => ApiCalendarRepository(
      client: ref.watch(authenticatedApiClientProvider),
    ),
    DataSourceMode.apiWithMockFallback => ApiCalendarRepository(
      client: ref.watch(authenticatedApiClientProvider),
    ),
    DataSourceMode.local => LocalCalendarRepository(
      ref.watch(appDatabaseProvider),
      syncQueue: ref.watch(syncQueueStoreProvider),
    ),
    DataSourceMode.localWithApiFallback => LocalCalendarRepository(
      ref.watch(appDatabaseProvider),
      syncQueue: ref.watch(syncQueueStoreProvider),
    ),
  };
});

final calendarEventsProvider = FutureProvider<List<CalendarEvent>>((ref) async {
  final mode = ref.watch(dataSourceModeProvider);
  final repository = ref.watch(calendarRepositoryProvider);
  if (mode != DataSourceMode.apiWithMockFallback &&
      mode != DataSourceMode.localWithApiFallback) {
    return repository.getEvents();
  }
  try {
    final value = await repository.getEvents();
    if (mode == DataSourceMode.localWithApiFallback && value.isEmpty) {
      return ApiCalendarRepository(
        client: ref.read(authenticatedApiClientProvider),
      ).getEvents();
    }
    return value;
  } catch (_) {
    return MockCalendarRepository().getEvents();
  }
});
