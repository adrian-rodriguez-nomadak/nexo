import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/finance_tables.dart';

part 'finances_dao.g.dart';

class LocalFinanceSummary {
  const LocalFinanceSummary({
    required this.totalIncome,
    required this.totalExpenses,
    required this.upcomingPayments,
    required this.availableReal,
  });

  final double totalIncome;
  final double totalExpenses;
  final double upcomingPayments;
  final double availableReal;
}

@DriftAccessor(tables: [FinanceMovements, UpcomingPayments])
class FinancesDao extends DatabaseAccessor<AppDatabase>
    with _$FinancesDaoMixin {
  FinancesDao(super.db);

  Future<LocalFinanceSummary> getSummary() async {
    final movements = await getMovements();
    final payments = await getUpcomingPayments();
    final income = movements
        .where((item) => item.type == 'income')
        .fold<double>(0, (sum, item) => sum + item.amount);
    final expenses = movements
        .where((item) => item.type == 'expense')
        .fold<double>(0, (sum, item) => sum + item.amount);
    final upcoming = payments
        .where((item) => item.status == 'pending')
        .fold<double>(0, (sum, item) => sum + item.amount);

    return LocalFinanceSummary(
      totalIncome: income,
      totalExpenses: expenses,
      upcomingPayments: upcoming,
      availableReal: income - expenses - upcoming,
    );
  }

  Future<List<FinanceMovement>> getMovements() {
    return (select(financeMovements)..orderBy([
          (table) => OrderingTerm.desc(table.movementDate),
          (table) => OrderingTerm.desc(table.createdAt),
        ]))
        .get();
  }

  Future<void> insertMovement(FinanceMovementsCompanion movement) {
    return into(financeMovements).insertOnConflictUpdate(movement);
  }

  Future<void> updateMovement(String id, FinanceMovementsCompanion movement) {
    return (update(
      financeMovements,
    )..where((table) => table.id.equals(id))).write(movement);
  }

  Future<void> deleteMovement(String id) {
    return (delete(
      financeMovements,
    )..where((table) => table.id.equals(id))).go();
  }

  Future<List<UpcomingPayment>> getUpcomingPayments() {
    return (select(
      upcomingPayments,
    )..orderBy([(table) => OrderingTerm.asc(table.dueDate)])).get();
  }

  Future<void> insertUpcomingPayment(UpcomingPaymentsCompanion payment) {
    return into(upcomingPayments).insertOnConflictUpdate(payment);
  }

  Future<void> updateUpcomingPaymentStatus(String id, String status) {
    return (update(
      upcomingPayments,
    )..where((table) => table.id.equals(id))).write(
      UpcomingPaymentsCompanion(
        status: Value(status),
        updatedAt: Value(DateTime.now()),
      ),
    );
  }

  Future<void> updateUpcomingPayment(
    String id,
    UpcomingPaymentsCompanion payment,
  ) {
    return (update(
      upcomingPayments,
    )..where((table) => table.id.equals(id))).write(payment);
  }

  Future<void> deleteUpcomingPayment(String id) {
    return (delete(
      upcomingPayments,
    )..where((table) => table.id.equals(id))).go();
  }
}
