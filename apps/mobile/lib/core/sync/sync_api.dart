import 'package:uuid/uuid.dart';

import '../http/api_client.dart';
import 'sync_queue_store.dart';

class SyncApi {
  const SyncApi(this.client);

  final ApiClient client;

  Future<Map<String, dynamic>> push(List<PendingSyncOperation> changes) async {
    final data = await client.post('/sync/push', {
      'device_id': 'nexo-mobile',
      'batch_id': const Uuid().v4(),
      'changes': changes.map((change) => change.toApiJson()).toList(),
    });
    return data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> pull(int cursor) async {
    final data = await client.get(
      '/sync/pull',
      queryParameters: {'cursor': cursor, 'limit': 200},
    );
    return data as Map<String, dynamic>;
  }
}
