import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:uuid/uuid.dart';

import '../../../core/http/api_client.dart';
import '../domain/memory_analysis.dart';
import '../domain/memory_entry.dart';

class MemoryAnalysisService {
  const MemoryAnalysisService({
    this.storage = const FlutterSecureStorage(),
  });

  static const _installationKey = 'nexo_memory_installation_id';
  final FlutterSecureStorage storage;

  Future<MemoryAnalysis?> analyze({
    required String text,
    required bool premium,
    required List<MemoryEntry> previousEntries,
  }) async {
    var installationId = await storage.read(key: _installationKey);
    if (installationId == null) {
      installationId = const Uuid().v4();
      await storage.write(key: _installationKey, value: installationId);
    }
    const client = ApiClient();
    final result =
        await client.post(
              '/public/ai/memory/analyze',
              {
                'text': text,
                'plan': premium ? 'premium' : 'free',
                'previous_notes': previousEntries
                    .take(10)
                    .map(
                      (entry) => {
                        'id': entry.id,
                        'text': entry.text,
                        'tags': entry.tags,
                      },
                    )
                    .toList(),
              },
              headers: {'X-Nexo-Installation-Id': installationId},
            )
            as Map<String, dynamic>;
    return MemoryAnalysis.fromJson(result);
  }
}
