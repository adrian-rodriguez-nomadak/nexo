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
    required this.initialBalance,
  });

  final double totalIncome;
  final double totalExpenses;
  final double upcomingPayments;
  final double availableReal;
  final double initialBalance;
}

class LocalFinanceAccount {
  const LocalFinanceAccount({
    required this.id,
    required this.name,
    required this.type,
    required this.initialBalance,
  });

  final String id;
  final String name;
  final String type;
  final double initialBalance;
}

@DriftAccessor(tables: [FinanceMovements, UpcomingPayments])
class FinancesDao extends DatabaseAccessor<AppDatabase>
    with _$FinancesDaoMixin {
  FinancesDao(super.db);

  Future<LocalFinanceSummary> getSummary() async {
    final movements = await getMovements();
    final accounts = await getAccounts();
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
    final initial = accounts.fold<double>(
      0,
      (sum, item) => sum + item.initialBalance,
    );

    return LocalFinanceSummary(
      totalIncome: income,
      totalExpenses: expenses,
      upcomingPayments: upcoming,
      availableReal: initial + income - expenses - upcoming,
      initialBalance: initial,
    );
  }

  Future<List<LocalFinanceAccount>> getAccounts() async {
    final rows = await customSelect(
      'SELECT id, name, type, initial_balance FROM finance_accounts ORDER BY created_at',
      readsFrom: const {},
    ).get();
    return rows
        .map(
          (row) => LocalFinanceAccount(
            id: row.read<String>('id'),
            name: row.read<String>('name'),
            type: row.read<String>('type'),
            initialBalance: row.read<double>('initial_balance'),
          ),
        )
        .toList();
  }

  Future<void> insertAccount(LocalFinanceAccount account) => customStatement(
    '''INSERT OR REPLACE INTO finance_accounts
       (id, name, type, initial_balance, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)''',
    [
      account.id,
      account.name,
      account.type,
      account.initialBalance,
      DateTime.now().millisecondsSinceEpoch,
      DateTime.now().millisecondsSinceEpoch,
    ],
  );

  Future<void> deleteAccount(String id) =>
      customStatement('DELETE FROM finance_accounts WHERE id = ?', [id]);

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
