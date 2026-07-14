// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'finances_dao.dart';

// ignore_for_file: type=lint
mixin _$FinancesDaoMixin on DatabaseAccessor<AppDatabase> {
  $FinanceMovementsTable get financeMovements =>
      attachedDatabase.financeMovements;
  $UpcomingPaymentsTable get upcomingPayments =>
      attachedDatabase.upcomingPayments;
  FinancesDaoManager get managers => FinancesDaoManager(this);
}

class FinancesDaoManager {
  final _$FinancesDaoMixin _db;
  FinancesDaoManager(this._db);
  $$FinanceMovementsTableTableManager get financeMovements =>
      $$FinanceMovementsTableTableManager(
        _db.attachedDatabase,
        _db.financeMovements,
      );
  $$UpcomingPaymentsTableTableManager get upcomingPayments =>
      $$UpcomingPaymentsTableTableManager(
        _db.attachedDatabase,
        _db.upcomingPayments,
      );
}
