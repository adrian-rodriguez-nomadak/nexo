import 'package:drift/drift.dart';

class Subscriptions extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  RealColumn get amount => real()();
  IntColumn get billingDay => integer()();
  TextColumn get frequency => text()();
  TextColumn get category => text().nullable()();
  TextColumn get status => text()();
  TextColumn get notes => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  TextColumn get syncStatus => text().withDefault(const Constant('local'))();

  @override
  Set<Column> get primaryKey => {id};
}
