import '../../domain/models/reminder_item.dart';
import '../../domain/repositories/reminders_repository.dart';

class MockRemindersRepository implements RemindersRepository {
  @override
  Future<List<ReminderItem>> getReminders() async {
    return [
      ReminderItem(
        id: 'mock-reminder-1',
        title: 'Pagar gym',
        remindAt: DateTime(2026, 7, 8, 18),
      ),
    ];
  }
}
