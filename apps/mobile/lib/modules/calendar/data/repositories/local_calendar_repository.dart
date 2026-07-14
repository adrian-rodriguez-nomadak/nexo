import 'package:drift/drift.dart';

import '../../../../core/database/app_database.dart' as db;
import '../../../../core/utils/id_generator.dart';
import '../../domain/models/calendar_event.dart';
import '../../domain/repositories/calendar_repository.dart';
import '../../../../core/sync/sync_queue_store.dart';

class LocalCalendarRepository implements CalendarRepository {
  const LocalCalendarRepository(this.database, {this.syncQueue});

  final db.AppDatabase database;
  final SyncQueueStore? syncQueue;

  @override
  Future<List<CalendarEvent>> getEvents() async {
    final rows = await database.calendarDao.getEvents();
    return rows.map(_fromRow).toList();
  }

  Future<void> createEvent({
    required String title,
    String? description,
    String? locationName,
    DateTime? startAt,
    DateTime? endAt,
  }) async {
    final now = DateTime.now();
    final id = localId('event');
    await database.calendarDao.insertEvent(
      db.CalendarEventsCompanion.insert(
        id: id,
        title: title,
        description: Value(description),
        startAt: startAt ?? now,
        endAt: Value(endAt),
        locationName: Value(locationName),
        repeatType: 'none',
        status: 'scheduled',
        createdAt: now,
        updatedAt: now,
      ),
    );
    await syncQueue?.enqueue(
      entity: 'calendar_event',
      recordId: id,
      operation: 'upsert',
      payload: {
        'title': title,
        'description': description,
        'location_name': locationName,
        'start_at': (startAt ?? now).toUtc().toIso8601String(),
        'end_at': endAt?.toUtc().toIso8601String(),
      },
    );
  }

  Future<void> updateEvent({
    required String id,
    required String title,
    String? description,
    String? locationName,
    required DateTime startAt,
    DateTime? endAt,
  }) async {
    await database.calendarDao.updateEvent(
      id,
      db.CalendarEventsCompanion(
        title: Value(title),
        description: Value(description),
        locationName: Value(locationName),
        startAt: Value(startAt),
        endAt: Value(endAt),
        syncStatus: const Value('local'),
        updatedAt: Value(DateTime.now()),
      ),
    );
    await syncQueue?.enqueue(
      entity: 'calendar_event',
      recordId: id,
      operation: 'upsert',
      payload: {
        'title': title,
        'description': description,
        'location_name': locationName,
        'start_at': startAt.toUtc().toIso8601String(),
        'end_at': endAt?.toUtc().toIso8601String(),
      },
    );
  }

  Future<void> deleteEvent(String id) async {
    await database.calendarDao.deleteEvent(id);
    await syncQueue?.enqueue(
      entity: 'calendar_event',
      recordId: id,
      operation: 'delete',
      payload: null,
    );
  }

  CalendarEvent _fromRow(db.CalendarEvent row) {
    return CalendarEvent(
      id: row.id,
      title: row.title,
      startAt: row.startAt,
      description: row.description,
      endAt: row.endAt,
      locationName: row.locationName,
      repeatType: row.repeatType,
      status: row.status,
    );
  }
}
