import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nexo_mobile/core/sync/sync_coordinator.dart';
import 'package:nexo_mobile/core/sync/sync_providers.dart';

void main() {
  test('tracks successful syncs and conflicts', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final controller = container.read(syncStatusProvider.notifier);

    controller.markSyncing();
    expect(container.read(syncStatusProvider).phase, SyncPhase.syncing);

    controller.markSuccess(
      const SyncRunResult(pushed: 1, staged: 1, conflicts: 0, applied: 1),
    );
    expect(container.read(syncStatusProvider).phase, SyncPhase.synced);
    expect(container.read(syncStatusProvider).lastSyncedAt, isNotNull);

    controller.markSuccess(
      const SyncRunResult(pushed: 0, staged: 0, conflicts: 1, applied: 0),
    );
    expect(container.read(syncStatusProvider).phase, SyncPhase.conflict);
  });
}
