import 'package:drift/drift.dart';

class InboxActions extends Table {
  TextColumn get id => text()();
  TextColumn get rawText => text()();
  TextColumn get detectedIntent => text()();
  TextColumn get structuredPayload => text()();
  TextColumn get status => text()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  TextColumn get syncStatus => text().withDefault(const Constant('local'))();

  @override
  Set<Column> get primaryKey => {id};
}
