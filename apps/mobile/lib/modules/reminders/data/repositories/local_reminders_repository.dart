import 'package:drift/drift.dart';

import '../../../../core/database/app_database.dart' as db;
import '../../../../core/utils/id_generator.dart';
import '../../domain/models/reminder_item.dart';
import '../../domain/repositories/reminders_repository.dart';
import '../../../../core/sync/sync_queue_store.dart';

class LocalRemindersRepository implements RemindersRepository {
  const LocalRemindersRepository(this.database, {this.syncQueue});

  final db.AppDatabase database;
  final SyncQueueStore? syncQueue;

  @override
  Future<List<ReminderItem>> getReminders() async {
    final rows = await database.remindersDao.getReminders();
    return rows.map(_fromRow).toList();
  }

  Future<String> createReminder({
    required String title,
    String? description,
    DateTime? remindAt,
  }) async {
    final now = DateTime.now();
    final id = localId('reminder');
    await database.remindersDao.insertReminder(
      db.ReminderItemsCompanion.insert(
        id: id,
        title: title,
        description: Value(description),
        remindAt: remindAt ?? now,
        repeatType: 'none',
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      ),
    );
    await syncQueue?.enqueue(
      entity: 'reminder',
      recordId: id,
      operation: 'upsert',
      payload: {
        'title': title,
        'description': description,
        'remind_at': (remindAt ?? now).toUtc().toIso8601String(),
        'status': 'pending',
      },
    );
    return id;
  }

  Future<void> updateReminder({
    required String id,
    required String title,
    String? description,
    required DateTime remindAt,
  }) async {
    await database.remindersDao.updateReminder(
      id,
      db.ReminderItemsCompanion(
        title: Value(title),
        description: Value(description),
        remindAt: Value(remindAt),
        syncStatus: const Value('local'),
        updatedAt: Value(DateTime.now()),
      ),
    );
    await syncQueue?.enqueue(
      entity: 'reminder',
      recordId: id,
      operation: 'upsert',
      payload: {
        'title': title,
        'description': description,
        'remind_at': remindAt.toUtc().toIso8601String(),
      },
    );
  }

  Future<void> updateStatus(String id, String status) async {
    await database.remindersDao.updateReminderStatus(id, status);
    await syncQueue?.enqueue(
      entity: 'reminder',
      recordId: id,
      operation: 'upsert',
      payload: {'status': status},
    );
  }

  Future<void> deleteReminder(String id) async {
    await database.remindersDao.deleteReminder(id);
    await syncQueue?.enqueue(
      entity: 'reminder',
      recordId: id,
      operation: 'delete',
      payload: null,
    );
  }

  ReminderItem _fromRow(db.ReminderItem row) {
    return ReminderItem(
      id: row.id,
      title: row.title,
      remindAt: row.remindAt,
      description: row.description,
      repeatType: row.repeatType,
      status: row.status,
    );
  }
}
