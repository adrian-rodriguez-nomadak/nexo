import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/calendar_tables.dart';

part 'calendar_dao.g.dart';

@DriftAccessor(tables: [CalendarEvents])
class CalendarDao extends DatabaseAccessor<AppDatabase>
    with _$CalendarDaoMixin {
  CalendarDao(super.db);

  Future<List<CalendarEvent>> getEvents() {
    return (select(
      calendarEvents,
    )..orderBy([(table) => OrderingTerm.asc(table.startAt)])).get();
  }

  Future<void> insertEvent(CalendarEventsCompanion event) {
    return into(calendarEvents).insertOnConflictUpdate(event);
  }

  Future<void> updateEvent(String id, CalendarEventsCompanion event) {
    return (update(
      calendarEvents,
    )..where((table) => table.id.equals(id))).write(event);
  }

  Future<void> updateEventStatus(String id, String status) {
    return (update(
      calendarEvents,
    )..where((table) => table.id.equals(id))).write(
      CalendarEventsCompanion(
        status: Value(status),
        updatedAt: Value(DateTime.now()),
      ),
    );
  }

  Future<void> deleteEvent(String id) {
    return (delete(calendarEvents)..where((table) => table.id.equals(id))).go();
  }
}
