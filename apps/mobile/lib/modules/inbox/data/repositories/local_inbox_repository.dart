import 'dart:convert';

import '../../../../core/database/app_database.dart' as db;
import '../../../../core/utils/id_generator.dart';
import '../../domain/models/inbox_action.dart';
import '../../domain/models/interpreted_action.dart';
import '../../domain/repositories/inbox_repository.dart';
import '../../../../core/sync/sync_queue_store.dart';

class LocalInboxRepository implements InboxRepository {
  const LocalInboxRepository(this.database, {this.syncQueue});

  final db.AppDatabase database;
  final SyncQueueStore? syncQueue;

  @override
  Future<InterpretedAction> interpret(String rawText) async {
    final intent = rawText.toLowerCase().contains('gast')
        ? 'create_expense'
        : 'unknown';
    final action = await _createDraftWithIntent(rawText, intent);
    return InterpretedAction(
      intent: action.detectedIntent,
      title: rawText,
      preview: 'Interpretación local preparada.',
      payload: action.structuredPayload,
    );
  }

  @override
  Future<InboxAction> createDraft(String rawText) {
    return _createDraftWithIntent(rawText, 'draft');
  }

  Future<InboxAction> _createDraftWithIntent(
    String rawText,
    String intent,
  ) async {
    final now = DateTime.now();
    final payload = {'raw_text': rawText};
    final action = InboxAction(
      id: localId('inbox'),
      rawText: rawText,
      detectedIntent: intent,
      structuredPayload: payload,
    );
    await database.inboxDao.insertAction(
      db.InboxActionsCompanion.insert(
        id: action.id,
        rawText: rawText,
        detectedIntent: intent,
        structuredPayload: jsonEncode(payload),
        status: 'draft',
        createdAt: now,
        updatedAt: now,
      ),
    );
    await syncQueue?.enqueue(
      entity: 'inbox_action',
      recordId: action.id,
      operation: 'upsert',
      payload: {
        'raw_text': rawText,
        'detected_intent': intent,
        'structured_payload': payload,
        'status': 'draft',
      },
    );
    return action;
  }
}
