// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'inbox_dao.dart';

// ignore_for_file: type=lint
mixin _$InboxDaoMixin on DatabaseAccessor<AppDatabase> {
  $InboxActionsTable get inboxActions => attachedDatabase.inboxActions;
  InboxDaoManager get managers => InboxDaoManager(this);
}

class InboxDaoManager {
  final _$InboxDaoMixin _db;
  InboxDaoManager(this._db);
  $$InboxActionsTableTableManager get inboxActions =>
      $$InboxActionsTableTableManager(_db.attachedDatabase, _db.inboxActions);
}
