import 'package:drift/drift.dart';

class Debts extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get type => text()();
  RealColumn get totalAmount => real()();
  RealColumn get pendingAmount => real()();
  DateTimeColumn get dueDate => dateTime().nullable()();
  TextColumn get status => text()();
  TextColumn get notes => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  TextColumn get syncStatus => text().withDefault(const Constant('local'))();

  @override
  Set<Column> get primaryKey => {id};
}

class DebtPayments extends Table {
  TextColumn get id => text()();
  TextColumn get debtId => text()();
  RealColumn get amount => real()();
  DateTimeColumn get paymentDate => dateTime()();
  TextColumn get notes => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  TextColumn get syncStatus => text().withDefault(const Constant('local'))();

  @override
  Set<Column> get primaryKey => {id};
}
