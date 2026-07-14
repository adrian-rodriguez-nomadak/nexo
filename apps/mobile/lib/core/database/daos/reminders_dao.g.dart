// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'reminders_dao.dart';

// ignore_for_file: type=lint
mixin _$RemindersDaoMixin on DatabaseAccessor<AppDatabase> {
  $ReminderItemsTable get reminderItems => attachedDatabase.reminderItems;
  RemindersDaoManager get managers => RemindersDaoManager(this);
}

class RemindersDaoManager {
  final _$RemindersDaoMixin _db;
  RemindersDaoManager(this._db);
  $$ReminderItemsTableTableManager get reminderItems =>
      $$ReminderItemsTableTableManager(_db.attachedDatabase, _db.reminderItems);
}
