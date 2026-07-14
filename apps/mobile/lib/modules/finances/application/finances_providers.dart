import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/data_source_mode.dart';
import '../../../core/database/database_provider.dart';
import '../../auth/application/auth_providers.dart';
import '../../../core/sync/sync_providers.dart';
import '../data/repositories/api_finances_repository.dart';
import '../data/repositories/local_finances_repository.dart';
import '../data/repositories/mock_finances_repository.dart';
import '../domain/models/finance_movement.dart';
import '../domain/models/finance_summary.dart';
import '../domain/models/upcoming_payment.dart';
import '../domain/repositories/finances_repository.dart';

final financesRepositoryProvider = Provider<FinancesRepository>((ref) {
  return switch (ref.watch(dataSourceModeProvider)) {
    DataSourceMode.mock => MockFinancesRepository(),
    DataSourceMode.api => ApiFinancesRepository(
      client: ref.watch(authenticatedApiClientProvider),
    ),
    DataSourceMode.apiWithMockFallback => ApiFinancesRepository(
      client: ref.watch(authenticatedApiClientProvider),
    ),
    DataSourceMode.local => LocalFinancesRepository(
      ref.watch(appDatabaseProvider),
      syncQueue: ref.watch(syncQueueStoreProvider),
    ),
    DataSourceMode.localWithApiFallback => LocalFinancesRepository(
      ref.watch(appDatabaseProvider),
      syncQueue: ref.watch(syncQueueStoreProvider),
    ),
  };
});

final financeSummaryProvider = FutureProvider<FinanceSummary>((ref) async {
  final mode = ref.watch(dataSourceModeProvider);
  final repository = ref.watch(financesRepositoryProvider);
  if (mode != DataSourceMode.apiWithMockFallback &&
      mode != DataSourceMode.localWithApiFallback) {
    return repository.getSummary();
  }
  try {
    final value = await repository.getSummary();
    if (mode == DataSourceMode.localWithApiFallback &&
        value.incomeTotal == 0 &&
        value.expenseTotal == 0) {
      return ApiFinancesRepository(
        client: ref.read(authenticatedApiClientProvider),
      ).getSummary();
    }
    return value;
  } catch (_) {
    return MockFinancesRepository().getSummary();
  }
});

final financeMovementsProvider = FutureProvider<List<FinanceMovement>>((
  ref,
) async {
  final mode = ref.watch(dataSourceModeProvider);
  final repository = ref.watch(financesRepositoryProvider);
  if (mode != DataSourceMode.apiWithMockFallback &&
      mode != DataSourceMode.localWithApiFallback) {
    return repository.getMovements();
  }
  try {
    final value = await repository.getMovements();
    if (mode == DataSourceMode.localWithApiFallback && value.isEmpty) {
      return ApiFinancesRepository(
        client: ref.read(authenticatedApiClientProvider),
      ).getMovements();
    }
    return value;
  } catch (_) {
    return MockFinancesRepository().getMovements();
  }
});

final upcomingPaymentsProvider = FutureProvider<List<UpcomingPayment>>((
  ref,
) async {
  final mode = ref.watch(dataSourceModeProvider);
  final repository = ref.watch(financesRepositoryProvider);
  if (mode != DataSourceMode.apiWithMockFallback &&
      mode != DataSourceMode.localWithApiFallback) {
    return repository.getUpcomingPayments();
  }
  try {
    final value = await repository.getUpcomingPayments();
    if (mode == DataSourceMode.localWithApiFallback && value.isEmpty) {
      return ApiFinancesRepository(
        client: ref.read(authenticatedApiClientProvider),
      ).getUpcomingPayments();
    }
    return value;
  } catch (_) {
    return MockFinancesRepository().getUpcomingPayments();
  }
});
