import 'package:drift/drift.dart';

class FinanceMovements extends Table {
  TextColumn get id => text()();
  TextColumn get type => text()();
  RealColumn get amount => real()();
  TextColumn get categoryId => text().nullable()();
  TextColumn get categoryName => text().nullable()();
  TextColumn get description => text().nullable()();
  DateTimeColumn get movementDate => dateTime()();
  TextColumn get paymentMethod => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  TextColumn get syncStatus => text().withDefault(const Constant('local'))();

  @override
  Set<Column> get primaryKey => {id};
}

class UpcomingPayments extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  RealColumn get amount => real()();
  DateTimeColumn get dueDate => dateTime()();
  TextColumn get category => text().nullable()();
  TextColumn get status => text()();
  TextColumn get repeatType => text()();
  TextColumn get notes => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  TextColumn get syncStatus => text().withDefault(const Constant('local'))();

  @override
  Set<Column> get primaryKey => {id};
}
