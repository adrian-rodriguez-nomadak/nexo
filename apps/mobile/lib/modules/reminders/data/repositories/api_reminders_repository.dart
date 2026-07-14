import '../../../../core/http/api_client.dart';
import '../../domain/models/reminder_item.dart';
import '../../domain/repositories/reminders_repository.dart';

class ApiRemindersRepository implements RemindersRepository {
  const ApiRemindersRepository({this.client = const ApiClient()});

  final ApiClient client;

  @override
  Future<List<ReminderItem>> getReminders() async {
    final data = await client.get('/reminders');
    return (data as List)
        .map((item) => ReminderItem.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<ReminderItem> createReminder(Map<String, dynamic> body) async {
    final data = await client.post('/reminders', body);
    return ReminderItem.fromJson(data as Map<String, dynamic>);
  }

  Future<ReminderItem> updateReminder(
    String id,
    Map<String, dynamic> body,
  ) async {
    final data = await client.patch('/reminders/$id', body);
    return ReminderItem.fromJson(data as Map<String, dynamic>);
  }

  Future<void> deleteReminder(String id) async {
    await client.delete('/reminders/$id');
  }
}
