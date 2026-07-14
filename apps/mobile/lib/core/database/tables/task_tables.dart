import 'package:drift/drift.dart';

class TaskItems extends Table {
  TextColumn get id => text()();
  TextColumn get title => text()();
  TextColumn get description => text().nullable()();
  DateTimeColumn get dueDate => dateTime().nullable()();
  TextColumn get priority => text()();
  TextColumn get status => text()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  TextColumn get syncStatus => text().withDefault(const Constant('local'))();

  @override
  Set<Column> get primaryKey => {id};
}
