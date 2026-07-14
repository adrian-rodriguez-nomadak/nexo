import '../models/calendar_event.dart';

abstract class CalendarRepository {
  Future<List<CalendarEvent>> getEvents();
}
