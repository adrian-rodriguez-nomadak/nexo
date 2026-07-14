import '../../../../core/http/api_client.dart';
import '../../domain/models/inbox_action.dart';
import '../../domain/models/interpreted_action.dart';
import '../../domain/repositories/inbox_repository.dart';

class ApiInboxRepository implements InboxRepository {
  const ApiInboxRepository({this.client = const ApiClient()});

  final ApiClient client;

  @override
  Future<InterpretedAction> interpret(String rawText) async {
    final data = await client.post('/inbox/interpret', {'text': rawText});
    return InterpretedAction.fromJson(data as Map<String, dynamic>);
  }

  @override
  Future<InboxAction> createDraft(String rawText) {
    throw UnimplementedError(
      'API inbox drafts are prepared but not wired yet.',
    );
  }
}
