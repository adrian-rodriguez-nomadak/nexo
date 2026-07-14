import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../modules/auth/application/auth_providers.dart';
import '../database/database_provider.dart';
import 'sync_api.dart';
import 'sync_coordinator.dart';
import 'sync_queue_store.dart';
import 'sync_remote_applier.dart';

final syncQueueStoreProvider = Provider<SyncQueueStore>(
  (ref) => SyncQueueStore(ref.watch(appDatabaseProvider)),
);

final syncCoordinatorProvider = Provider<SyncCoordinator>((ref) {
  return SyncCoordinator(
    store: ref.watch(syncQueueStoreProvider),
    api: SyncApi(ref.watch(authenticatedApiClientProvider)),
    applier: SyncRemoteApplier(
      ref.watch(appDatabaseProvider),
      ref.watch(syncQueueStoreProvider),
    ),
  );
});

final syncNowProvider = FutureProvider.autoDispose<SyncRunResult>((ref) {
  return ref.watch(syncCoordinatorProvider).run();
});
