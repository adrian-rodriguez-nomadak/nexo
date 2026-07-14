import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/reminder_tables.dart';

part 'reminders_dao.g.dart';

@DriftAccessor(tables: [ReminderItems])
class RemindersDao extends DatabaseAccessor<AppDatabase>
    with _$RemindersDaoMixin {
  RemindersDao(super.db);

  Future<List<ReminderItem>> getReminders() {
    return (select(
      reminderItems,
    )..orderBy([(table) => OrderingTerm.asc(table.remindAt)])).get();
  }

  Future<void> insertReminder(ReminderItemsCompanion reminder) {
    return into(reminderItems).insertOnConflictUpdate(reminder);
  }

  Future<void> updateReminder(String id, ReminderItemsCompanion reminder) {
    return (update(
      reminderItems,
    )..where((table) => table.id.equals(id))).write(reminder);
  }

  Future<void> updateReminderStatus(String id, String status) {
    return (update(reminderItems)..where((table) => table.id.equals(id))).write(
      ReminderItemsCompanion(
        status: Value(status),
        updatedAt: Value(DateTime.now()),
      ),
    );
  }

  Future<void> deleteReminder(String id) {
    return (delete(reminderItems)..where((table) => table.id.equals(id))).go();
  }
}
