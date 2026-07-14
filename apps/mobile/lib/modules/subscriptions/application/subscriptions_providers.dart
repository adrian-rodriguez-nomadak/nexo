import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/data_source_mode.dart';
import '../../../core/database/database_provider.dart';
import '../../auth/application/auth_providers.dart';
import '../../../core/sync/sync_providers.dart';
import '../data/repositories/api_subscriptions_repository.dart';
import '../data/repositories/local_subscriptions_repository.dart';
import '../data/repositories/mock_subscriptions_repository.dart';
import '../domain/models/subscription_item.dart';
import '../domain/repositories/subscriptions_repository.dart';

final subscriptionsRepositoryProvider = Provider<SubscriptionsRepository>((
  ref,
) {
  return switch (ref.watch(dataSourceModeProvider)) {
    DataSourceMode.mock => MockSubscriptionsRepository(),
    DataSourceMode.api => ApiSubscriptionsRepository(
      client: ref.watch(authenticatedApiClientProvider),
    ),
    DataSourceMode.apiWithMockFallback => ApiSubscriptionsRepository(
      client: ref.watch(authenticatedApiClientProvider),
    ),
    DataSourceMode.local => LocalSubscriptionsRepository(
      ref.watch(appDatabaseProvider),
      syncQueue: ref.watch(syncQueueStoreProvider),
    ),
    DataSourceMode.localWithApiFallback => LocalSubscriptionsRepository(
      ref.watch(appDatabaseProvider),
      syncQueue: ref.watch(syncQueueStoreProvider),
    ),
  };
});

final subscriptionsProvider = FutureProvider<List<SubscriptionItem>>((
  ref,
) async {
  final mode = ref.watch(dataSourceModeProvider);
  final repository = ref.watch(subscriptionsRepositoryProvider);
  if (mode != DataSourceMode.apiWithMockFallback &&
      mode != DataSourceMode.localWithApiFallback) {
    return repository.getSubscriptions();
  }
  try {
    final value = await repository.getSubscriptions();
    if (mode == DataSourceMode.localWithApiFallback && value.isEmpty) {
      return ApiSubscriptionsRepository(
        client: ref.read(authenticatedApiClientProvider),
      ).getSubscriptions();
    }
    return value;
  } catch (_) {
    return MockSubscriptionsRepository().getSubscriptions();
  }
});
