import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/debt_tables.dart';

part 'debts_dao.g.dart';

@DriftAccessor(tables: [Debts, DebtPayments])
class DebtsDao extends DatabaseAccessor<AppDatabase> with _$DebtsDaoMixin {
  DebtsDao(super.db);

  Future<List<Debt>> getDebts() {
    return (select(
      debts,
    )..orderBy([(table) => OrderingTerm.desc(table.createdAt)])).get();
  }

  Future<void> insertDebt(DebtsCompanion debt) {
    return into(debts).insertOnConflictUpdate(debt);
  }

  Future<void> updateDebt(String id, DebtsCompanion debt) {
    return (update(debts)..where((table) => table.id.equals(id))).write(debt);
  }

  Future<void> deleteDebt(String id) {
    return (delete(debts)..where((table) => table.id.equals(id))).go();
  }

  Future<void> insertDebtPayment(DebtPaymentsCompanion payment) {
    return transaction(() async {
      await into(debtPayments).insertOnConflictUpdate(payment);
      await markDebtPaidIfNeeded(payment.debtId.value, payment.amount.value);
    });
  }

  Future<List<DebtPayment>> getDebtPayments(String debtId) {
    return (select(debtPayments)
          ..where((table) => table.debtId.equals(debtId))
          ..orderBy([(table) => OrderingTerm.desc(table.paymentDate)]))
        .get();
  }

  Future<void> markDebtPaidIfNeeded(String debtId, double amount) async {
    final debt = await (select(
      debts,
    )..where((table) => table.id.equals(debtId))).getSingleOrNull();
    if (debt == null) return;

    final nextPending = (debt.pendingAmount - amount).clamp(0, double.infinity);
    await (update(debts)..where((table) => table.id.equals(debtId))).write(
      DebtsCompanion(
        pendingAmount: Value(nextPending.toDouble()),
        status: Value(nextPending <= 0 ? 'paid' : 'pending'),
        updatedAt: Value(DateTime.now()),
      ),
    );
  }
}
