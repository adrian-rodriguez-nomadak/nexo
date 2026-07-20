import '../../../core/config/api_config.dart';
import '../../../core/http/api_client.dart';
import '../../auth/data/auth_repository.dart';
import 'memory_context_repository.dart';
import '../domain/memory_analysis.dart';
import '../domain/memory_entry.dart';

class MemoryAnalysisService {
  const MemoryAnalysisService({
    this.contextRepository = const MemoryContextRepository(),
    this.authRepository = const AuthRepository(),
  });

  final MemoryContextRepository contextRepository;
  final AuthRepository authRepository;

  Future<MemoryAnalysis?> analyze({
    required String text,
    required bool premium,
    required List<MemoryEntry> previousEntries,
  }) async {
    final session = await authRepository.restore();
    if (session == null) {
      throw const ApiClientException('Authentication required', statusCode: 401);
    }
    final client = ApiClient(
      config: ApiConfig(timeout: Duration(seconds: 45)),
      accessToken: () async => session.accessToken,
    );
    MemoryContext memoryContext;
    try {
      memoryContext = await contextRepository.load();
    } catch (_) {
      memoryContext = const MemoryContext();
    }
    final result =
        await client.post(
              '/ai/memory/analyze',
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
            )
            as Map<String, dynamic>;
    final analysis = MemoryAnalysis.fromJson(result);
    try {
      await contextRepository.save(analysis.contextUpdate);
    } catch (_) {
      // The OpenAI result remains valid even if the local context cache fails.
    }
    return analysis;
  }

  Future<void> saveNote(MemoryEntry entry) async {
    final session = await authRepository.restore();
    if (session == null) return;
    final client = ApiClient(accessToken: () async => session.accessToken);
    await client.post(
      '/ai/memory/notes',
      {
        'id': entry.id,
        'text': entry.text,
        'occurred_at': entry.createdAt.toIso8601String(),
        'summary': entry.analysis?.summary ?? '',
        'analysis': entry.analysis?.toJson(),
        'details': entry.details,
        'tags': entry.tags,
      },
    );
  }
}
