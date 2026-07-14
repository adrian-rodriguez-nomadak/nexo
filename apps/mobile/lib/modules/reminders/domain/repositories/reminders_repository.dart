import '../models/reminder_item.dart';

abstract class RemindersRepository {
  Future<List<ReminderItem>> getReminders();
}
