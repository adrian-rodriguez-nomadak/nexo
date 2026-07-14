import '../../../../core/http/api_client.dart';
import '../../domain/models/calendar_event.dart';
import '../../domain/repositories/calendar_repository.dart';

class ApiCalendarRepository implements CalendarRepository {
  const ApiCalendarRepository({this.client = const ApiClient()});

  final ApiClient client;

  @override
  Future<List<CalendarEvent>> getEvents() async {
    final data = await client.get('/calendar/events');
    return (data as List)
        .map((item) => CalendarEvent.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<CalendarEvent> createEvent(Map<String, dynamic> body) async {
    final data = await client.post('/calendar/events', body);
    return CalendarEvent.fromJson(data as Map<String, dynamic>);
  }

  Future<CalendarEvent> updateEvent(
    String id,
    Map<String, dynamic> body,
  ) async {
    final data = await client.patch('/calendar/events/$id', body);
    return CalendarEvent.fromJson(data as Map<String, dynamic>);
  }

  Future<void> deleteEvent(String id) async {
    await client.delete('/calendar/events/$id');
  }
}
