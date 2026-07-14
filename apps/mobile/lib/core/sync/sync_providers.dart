import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../modules/auth/application/auth_providers.dart';
import '../database/database_provider.dart';
import 'sync_api.dart';
import 'sync_coordinator.dart';
import 'sync_queue_store.dart';
import 'sync_remote_applier.dart';

enum SyncPhase { idle, syncing, synced, conflict, offline }

class SyncStatus {
  const SyncStatus({
    this.phase = SyncPhase.idle,
    this.lastSyncedAt,
    this.lastResult,
  });

  final SyncPhase phase;
  final DateTime? lastSyncedAt;
  final SyncRunResult? lastResult;
}

class SyncStatusController extends Notifier<SyncStatus> {
  @override
  SyncStatus build() => const SyncStatus();

  void markSyncing() {
    state = SyncStatus(
      phase: SyncPhase.syncing,
      lastSyncedAt: state.lastSyncedAt,
      lastResult: state.lastResult,
    );
  }

  void markSuccess(SyncRunResult result) {
    state = SyncStatus(
      phase: result.conflicts > 0 ? SyncPhase.conflict : SyncPhase.synced,
      lastSyncedAt: DateTime.now(),
      lastResult: result,
    );
  }

  void markOffline() {
    state = SyncStatus(
      phase: SyncPhase.offline,
      lastSyncedAt: state.lastSyncedAt,
      lastResult: state.lastResult,
    );
  }
}

final syncStatusProvider = NotifierProvider<SyncStatusController, SyncStatus>(
  SyncStatusController.new,
);

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
