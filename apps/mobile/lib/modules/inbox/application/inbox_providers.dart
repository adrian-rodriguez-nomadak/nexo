import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/data_source_mode.dart';
import '../../../core/database/database_provider.dart';
import '../../auth/application/auth_providers.dart';
import '../../../core/sync/sync_providers.dart';
import '../data/repositories/api_inbox_repository.dart';
import '../data/repositories/local_inbox_repository.dart';
import '../data/repositories/mock_inbox_repository.dart';
import '../domain/models/interpreted_action.dart';
import '../domain/repositories/inbox_repository.dart';

final inboxRepositoryProvider = Provider<InboxRepository>((ref) {
  return switch (ref.watch(dataSourceModeProvider)) {
    DataSourceMode.mock => MockInboxRepository(),
    DataSourceMode.api => ApiInboxRepository(
      client: ref.watch(authenticatedApiClientProvider),
    ),
    DataSourceMode.apiWithMockFallback => ApiInboxRepository(
      client: ref.watch(authenticatedApiClientProvider),
    ),
    DataSourceMode.local => LocalInboxRepository(
      ref.watch(appDatabaseProvider),
      syncQueue: ref.watch(syncQueueStoreProvider),
    ),
    DataSourceMode.localWithApiFallback => LocalInboxRepository(
      ref.watch(appDatabaseProvider),
      syncQueue: ref.watch(syncQueueStoreProvider),
    ),
  };
});

final interpretInboxTextProvider =
    FutureProvider.family<InterpretedAction, String>((ref, text) async {
      final mode = ref.watch(dataSourceModeProvider);
      final repository = ref.watch(inboxRepositoryProvider);
      if (mode != DataSourceMode.apiWithMockFallback &&
          mode != DataSourceMode.localWithApiFallback) {
        return repository.interpret(text);
      }
      try {
        return await repository.interpret(text);
      } catch (_) {
        return MockInboxRepository().interpret(text);
      }
    });
