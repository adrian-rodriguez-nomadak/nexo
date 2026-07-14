import 'sync_api.dart';
import 'sync_queue_store.dart';
import 'sync_remote_applier.dart';

class SyncRunResult {
  const SyncRunResult({
    required this.pushed,
    required this.staged,
    required this.conflicts,
    required this.applied,
  });
  final int pushed;
  final int staged;
  final int conflicts;
  final int applied;
}

class SyncCoordinator {
  const SyncCoordinator({
    required this.store,
    required this.api,
    required this.applier,
  });

  final SyncQueueStore store;
  final SyncApi api;
  final SyncRemoteApplier applier;

  Future<SyncRunResult> run() async {
    var pushed = 0;
    var conflicts = 0;
    final pending = await store.pending();
    if (pending.isNotEmpty) {
      final response = await api.push(pending);
      final results = response['results'] as List<dynamic>;
      for (final raw in results) {
        final result = raw as Map<String, dynamic>;
        final id = result['operation_id'] as String;
        if (result['status'] == 'accepted') {
          final operation = pending.firstWhere(
            (item) => item.operationId == id,
          );
          await store.setVersion(
            operation.entity,
            operation.recordId,
            result['version'] as int,
          );
          await store.remove(id);
          pushed++;
        } else if (result['status'] == 'conflict') {
          await store.markFailure(id, 'conflict');
          conflicts++;
        }
      }
    }

    final pull = await api.pull(await store.cursor());
    final changes = (pull['changes'] as List<dynamic>)
        .cast<Map<String, dynamic>>();
    await store.stageRemote(changes, pull['next_cursor'] as int);
    final applied = await applier.applyStaged();
    return SyncRunResult(
      pushed: pushed,
      staged: changes.length,
      conflicts: conflicts,
      applied: applied,
    );
  }
}
