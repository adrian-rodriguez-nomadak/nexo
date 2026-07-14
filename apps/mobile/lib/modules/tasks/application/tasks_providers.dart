import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/data_source_mode.dart';
import '../../../core/database/database_provider.dart';
import '../../auth/application/auth_providers.dart';
import '../../../core/sync/sync_providers.dart';
import '../data/repositories/api_tasks_repository.dart';
import '../data/repositories/local_tasks_repository.dart';
import '../data/repositories/mock_tasks_repository.dart';
import '../domain/models/task_item.dart';
import '../domain/repositories/tasks_repository.dart';

final tasksRepositoryProvider = Provider<TasksRepository>((ref) {
  return switch (ref.watch(dataSourceModeProvider)) {
    DataSourceMode.mock => MockTasksRepository(),
    DataSourceMode.api => ApiTasksRepository(
      client: ref.watch(authenticatedApiClientProvider),
    ),
    DataSourceMode.apiWithMockFallback => ApiTasksRepository(
      client: ref.watch(authenticatedApiClientProvider),
    ),
    DataSourceMode.local => LocalTasksRepository(
      ref.watch(appDatabaseProvider),
      syncQueue: ref.watch(syncQueueStoreProvider),
    ),
    DataSourceMode.localWithApiFallback => LocalTasksRepository(
      ref.watch(appDatabaseProvider),
      syncQueue: ref.watch(syncQueueStoreProvider),
    ),
  };
});

final tasksProvider = FutureProvider<List<TaskItem>>((ref) async {
  final mode = ref.watch(dataSourceModeProvider);
  final repository = ref.watch(tasksRepositoryProvider);
  if (mode != DataSourceMode.apiWithMockFallback &&
      mode != DataSourceMode.localWithApiFallback) {
    return repository.getTasks();
  }
  try {
    final value = await repository.getTasks();
    if (mode == DataSourceMode.localWithApiFallback && value.isEmpty) {
      return ApiTasksRepository(
        client: ref.read(authenticatedApiClientProvider),
      ).getTasks();
    }
    return value;
  } catch (_) {
    return MockTasksRepository().getTasks();
  }
});
