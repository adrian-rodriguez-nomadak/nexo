import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/data_source_mode.dart';
import '../../../core/database/database_provider.dart';
import '../../auth/application/auth_providers.dart';
import '../../../core/sync/sync_providers.dart';
import '../data/repositories/api_debts_repository.dart';
import '../data/repositories/local_debts_repository.dart';
import '../data/repositories/mock_debts_repository.dart';
import '../domain/models/debt_item.dart';
import '../domain/repositories/debts_repository.dart';

final debtsRepositoryProvider = Provider<DebtsRepository>((ref) {
  return switch (ref.watch(dataSourceModeProvider)) {
    DataSourceMode.mock => MockDebtsRepository(),
    DataSourceMode.api => ApiDebtsRepository(
      client: ref.watch(authenticatedApiClientProvider),
    ),
    DataSourceMode.apiWithMockFallback => ApiDebtsRepository(
      client: ref.watch(authenticatedApiClientProvider),
    ),
    DataSourceMode.local => LocalDebtsRepository(
      ref.watch(appDatabaseProvider),
      syncQueue: ref.watch(syncQueueStoreProvider),
    ),
    DataSourceMode.localWithApiFallback => LocalDebtsRepository(
      ref.watch(appDatabaseProvider),
      syncQueue: ref.watch(syncQueueStoreProvider),
    ),
  };
});

final debtsProvider = FutureProvider<List<DebtItem>>((ref) async {
  final mode = ref.watch(dataSourceModeProvider);
  final repository = ref.watch(debtsRepositoryProvider);
  if (mode != DataSourceMode.apiWithMockFallback &&
      mode != DataSourceMode.localWithApiFallback) {
    return repository.getDebts();
  }
  try {
    final value = await repository.getDebts();
    if (mode == DataSourceMode.localWithApiFallback && value.isEmpty) {
      return ApiDebtsRepository(
        client: ref.read(authenticatedApiClientProvider),
      ).getDebts();
    }
    return value;
  } catch (_) {
    return MockDebtsRepository().getDebts();
  }
});
