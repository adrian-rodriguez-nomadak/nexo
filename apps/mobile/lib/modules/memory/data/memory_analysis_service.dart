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
    final installationId = await _installationId();
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

  Future<void> saveNote(MemoryEntry entry) async {
    final installationId = await _installationId();
    const client = ApiClient();
    await client.post(
      '/public/ai/memory/notes',
      {
        'id': entry.id,
        'text': entry.text,
        'occurred_at': entry.createdAt.toIso8601String(),
        'summary': entry.analysis?.summary ?? '',
        'analysis': entry.analysis?.toJson(),
        'details': entry.details,
        'tags': entry.tags,
      },
      headers: {'X-Nexo-Installation-Id': installationId},
    );
  }

  Future<String> _installationId() async {
    var installationId = await storage.read(key: _installationKey);
    if (installationId != null) return installationId;
    installationId = const Uuid().v4();
    await storage.write(key: _installationKey, value: installationId);
    return installationId;
  }
}
