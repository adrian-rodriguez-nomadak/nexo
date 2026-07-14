import '../../domain/models/calendar_event.dart';
import '../../domain/repositories/calendar_repository.dart';

class MockCalendarRepository implements CalendarRepository {
  @override
  Future<List<CalendarEvent>> getEvents() async {
    return [
      CalendarEvent(
        id: 'mock-event-1',
        title: 'Reunión semanal',
        startAt: DateTime(2026, 7, 8, 9),
        endAt: DateTime(2026, 7, 8, 10),
        locationName: 'Oficina',
      ),
    ];
  }
}
