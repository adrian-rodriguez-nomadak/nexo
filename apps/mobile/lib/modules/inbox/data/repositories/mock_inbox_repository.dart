import '../../domain/models/interpreted_action.dart';
import '../../domain/models/inbox_action.dart';
import '../../domain/repositories/inbox_repository.dart';

class MockInboxRepository implements InboxRepository {
  @override
  Future<InterpretedAction> interpret(String rawText) async {
    return InterpretedAction(
      intent: 'expense',
      title: 'Gasto detectado',
      preview: 'Interpretación mock para preparar la capa real.',
      payload: {'raw_text': rawText, 'amount': 180},
    );
  }

  @override
  Future<InboxAction> createDraft(String rawText) async {
    return InboxAction(
      id: 'mock-inbox-action-1',
      rawText: rawText,
      detectedIntent: 'draft',
      structuredPayload: {'raw_text': rawText},
    );
  }
}
