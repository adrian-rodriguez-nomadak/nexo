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
    required this.currentBalance,
  });

  final String id;
  final String name;
  final String type;
  final double initialBalance;
  final double currentBalance;
}

class LocalFinanceBudget {
  const LocalFinanceBudget({
    required this.id,
    required this.category,
    required this.amount,
  });

  final String id;
  final String category;
  final double amount;
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
      '''SELECT a.id, a.name, a.type, a.initial_balance,
         a.initial_balance
         + COALESCE((SELECT SUM(CASE WHEN m.type = 'income' THEN m.amount ELSE -m.amount END)
           FROM finance_movements m JOIN finance_movement_accounts ma
           ON ma.movement_id = m.id WHERE ma.account_id = a.id), 0)
         + COALESCE((SELECT SUM(t.amount) FROM finance_transfers t
           WHERE t.to_account_id = a.id), 0)
         - COALESCE((SELECT SUM(t.amount) FROM finance_transfers t
           WHERE t.from_account_id = a.id), 0) AS current_balance
         FROM finance_accounts a ORDER BY a.created_at''',
      readsFrom: const {},
    ).get();
    return rows
        .map(
          (row) => LocalFinanceAccount(
            id: row.read<String>('id'),
            name: row.read<String>('name'),
            type: row.read<String>('type'),
            initialBalance: row.read<double>('initial_balance'),
            currentBalance: row.read<double>('current_balance'),
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

  Future<void> assignMovementToAccount(String movementId, String accountId) =>
      customStatement(
        '''INSERT OR REPLACE INTO finance_movement_accounts
       (movement_id, account_id) VALUES (?, ?)''',
        [movementId, accountId],
      );

  Future<void> insertTransfer({
    required String id,
    required String fromAccountId,
    required String toAccountId,
    required double amount,
    String? notes,
  }) => customStatement(
    '''INSERT INTO finance_transfers
       (id, from_account_id, to_account_id, amount, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?)''',
    [
      id,
      fromAccountId,
      toAccountId,
      amount,
      notes,
      DateTime.now().millisecondsSinceEpoch,
    ],
  );

  Future<void> deleteAccount(String id) async {
    await customStatement(
      'DELETE FROM finance_movement_accounts WHERE account_id = ?',
      [id],
    );
    await customStatement(
      'DELETE FROM finance_transfers WHERE from_account_id = ? OR to_account_id = ?',
      [id, id],
    );
    await customStatement('DELETE FROM finance_accounts WHERE id = ?', [id]);
  }

  Future<List<LocalFinanceBudget>> getBudgets() async {
    final rows = await customSelect(
      'SELECT id, category, amount FROM finance_budgets ORDER BY category',
      readsFrom: const {},
    ).get();
    return rows
        .map(
          (row) => LocalFinanceBudget(
            id: row.read<String>('id'),
            category: row.read<String>('category'),
            amount: row.read<double>('amount'),
          ),
        )
        .toList();
  }

  Future<void> insertBudget(LocalFinanceBudget budget) => customStatement(
    '''INSERT INTO finance_budgets
       (id, category, amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(category) DO UPDATE SET amount = excluded.amount,
       updated_at = excluded.updated_at''',
    [
      budget.id,
      budget.category,
      budget.amount,
      DateTime.now().millisecondsSinceEpoch,
      DateTime.now().millisecondsSinceEpoch,
    ],
  );

  Future<void> deleteBudget(String id) =>
      customStatement('DELETE FROM finance_budgets WHERE id = ?', [id]);

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

  Future<void> deleteMovement(String id) async {
    await customStatement(
      'DELETE FROM finance_movement_accounts WHERE movement_id = ?',
      [id],
    );
    await (delete(
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
