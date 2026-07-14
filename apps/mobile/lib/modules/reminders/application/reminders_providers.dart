import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/data_source_mode.dart';
import '../../../core/database/database_provider.dart';
import '../../auth/application/auth_providers.dart';
import '../../../core/sync/sync_providers.dart';
import '../data/repositories/api_reminders_repository.dart';
import '../data/repositories/local_reminders_repository.dart';
import '../data/repositories/mock_reminders_repository.dart';
import '../domain/models/reminder_item.dart';
import '../domain/repositories/reminders_repository.dart';

final remindersRepositoryProvider = Provider<RemindersRepository>((ref) {
  return switch (ref.watch(dataSourceModeProvider)) {
    DataSourceMode.mock => MockRemindersRepository(),
    DataSourceMode.api => ApiRemindersRepository(
      client: ref.watch(authenticatedApiClientProvider),
    ),
    DataSourceMode.apiWithMockFallback => ApiRemindersRepository(
      client: ref.watch(authenticatedApiClientProvider),
    ),
    DataSourceMode.local => LocalRemindersRepository(
      ref.watch(appDatabaseProvider),
      syncQueue: ref.watch(syncQueueStoreProvider),
    ),
    DataSourceMode.localWithApiFallback => LocalRemindersRepository(
      ref.watch(appDatabaseProvider),
      syncQueue: ref.watch(syncQueueStoreProvider),
    ),
  };
});

final remindersProvider = FutureProvider<List<ReminderItem>>((ref) async {
  final mode = ref.watch(dataSourceModeProvider);
  final repository = ref.watch(remindersRepositoryProvider);
  if (mode != DataSourceMode.apiWithMockFallback &&
      mode != DataSourceMode.localWithApiFallback) {
    return repository.getReminders();
  }
  try {
    final value = await repository.getReminders();
    if (mode == DataSourceMode.localWithApiFallback && value.isEmpty) {
      return ApiRemindersRepository(
        client: ref.read(authenticatedApiClientProvider),
      ).getReminders();
    }
    return value;
  } catch (_) {
    return MockRemindersRepository().getReminders();
  }
});
