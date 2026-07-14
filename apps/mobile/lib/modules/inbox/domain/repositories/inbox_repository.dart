import '../models/interpreted_action.dart';
import '../models/inbox_action.dart';

abstract class InboxRepository {
  Future<InterpretedAction> interpret(String rawText);
  Future<InboxAction> createDraft(String rawText);
}
