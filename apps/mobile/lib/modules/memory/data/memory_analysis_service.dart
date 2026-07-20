import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:uuid/uuid.dart';

import '../../../core/http/api_client.dart';
import 'memory_context_repository.dart';
import '../domain/memory_analysis.dart';
import '../domain/memory_entry.dart';

class MemoryAnalysisService {
  const MemoryAnalysisService({
    this.storage = const FlutterSecureStorage(),
    this.contextRepository = const MemoryContextRepository(),
  });

  static const _installationKey = 'nexo_memory_installation_id';
  final FlutterSecureStorage storage;
  final MemoryContextRepository contextRepository;

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
    final memoryContext = await contextRepository.load();
    final result =
        await client.post(
              '/public/ai/memory/analyze',
              {
                'text': text,
                'plan': premium ? 'premium' : 'free',
                'memory_context': memoryContext.toJson(),
                'previous_notes': previousEntries
                    .take(10)
                    .map(
                      (entry) => {
                        'id': entry.id,
                        'text': entry.text,
                      'tags': entry.tags,
                      'summary': entry.analysis?.summary ?? '',
                      'details': entry.details,
                      },
                    )
                    .toList(),
              },
              headers: {'X-Nexo-Installation-Id': installationId},
            )
            as Map<String, dynamic>;
    final analysis = MemoryAnalysis.fromJson(result);
    await contextRepository.save(analysis.contextUpdate);
    return analysis;
  }
}
