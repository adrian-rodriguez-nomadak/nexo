import 'package:drift/drift.dart';

import '../../../../core/database/app_database.dart' as db;
import '../../../../core/utils/id_generator.dart';
import '../../domain/models/debt_item.dart';
import '../../domain/models/debt_payment.dart';
import '../../domain/repositories/debts_repository.dart';
import '../../../../core/sync/sync_queue_store.dart';

class LocalDebtsRepository implements DebtsRepository {
  const LocalDebtsRepository(this.database, {this.syncQueue});

  final db.AppDatabase database;
  final SyncQueueStore? syncQueue;

  @override
  Future<List<DebtItem>> getDebts() async {
    final rows = await database.debtsDao.getDebts();
    return rows.map(_debtFromRow).toList();
  }

  @override
  Future<List<DebtPayment>> getPayments(String debtId) async {
    final rows = await database.debtsDao.getDebtPayments(debtId);
    return rows.map(_paymentFromRow).toList();
  }

  Future<void> createDebt({
    required String name,
    required String type,
    required double amount,
    String? notes,
  }) async {
    final now = DateTime.now();
    final id = localId('debt');
    await database.debtsDao.insertDebt(
      db.DebtsCompanion.insert(
        id: id,
        name: name,
        type: type,
        totalAmount: amount,
        pendingAmount: amount,
        dueDate: Value(now.add(const Duration(days: 7))),
        status: 'pending',
        notes: Value(notes),
        createdAt: now,
        updatedAt: now,
      ),
    );
    await syncQueue?.enqueue(
      entity: 'debt',
      recordId: id,
      operation: 'upsert',
      payload: {
        'name': name,
        'type': type,
        'total_amount': amount,
        'pending_amount': amount,
        'notes': notes,
        'status': 'pending',
      },
    );
  }

  Future<void> createPayment({
    required String debtId,
    required double amount,
    String? notes,
  }) async {
    final now = DateTime.now();
    final id = localId('debt-payment');
    await database.debtsDao.insertDebtPayment(
      db.DebtPaymentsCompanion.insert(
        id: id,
        debtId: debtId,
        amount: amount,
        paymentDate: now,
        notes: Value(notes),
        createdAt: now,
        updatedAt: now,
      ),
    );
    await syncQueue?.enqueue(
      entity: 'debt_payment',
      recordId: id,
      operation: 'upsert',
      payload: {
        'debt_id': debtId,
        'amount': amount,
        'notes': notes,
        'payment_date': now.toUtc().toIso8601String(),
      },
    );
  }

  Future<void> updateDebt({
    required String id,
    required String name,
    required String type,
    required double amount,
    String? notes,
  }) async {
    await database.debtsDao.updateDebt(
      id,
      db.DebtsCompanion(
        name: Value(name),
        type: Value(type),
        totalAmount: Value(amount),
        pendingAmount: Value(amount),
        notes: Value(notes),
        syncStatus: const Value('local'),
        updatedAt: Value(DateTime.now()),
      ),
    );
    await syncQueue?.enqueue(
      entity: 'debt',
      recordId: id,
      operation: 'upsert',
      payload: {
        'name': name,
        'type': type,
        'total_amount': amount,
        'pending_amount': amount,
        'notes': notes,
      },
    );
  }

  Future<void> markAsPaid(String id) async {
    await database.debtsDao.updateDebt(
      id,
      db.DebtsCompanion(
        pendingAmount: const Value(0),
        status: const Value('paid'),
        syncStatus: const Value('local'),
        updatedAt: Value(DateTime.now()),
      ),
    );
    await syncQueue?.enqueue(
      entity: 'debt',
      recordId: id,
      operation: 'upsert',
      payload: {'pending_amount': 0, 'status': 'paid'},
    );
  }

  Future<void> deleteDebt(String id) async {
    await database.debtsDao.deleteDebt(id);
    await syncQueue?.enqueue(
      entity: 'debt',
      recordId: id,
      operation: 'delete',
      payload: null,
    );
  }

  DebtItem _debtFromRow(db.Debt row) {
    return DebtItem(
      id: row.id,
      name: row.name,
      type: row.type,
      totalAmount: row.totalAmount,
      pendingAmount: row.pendingAmount,
      dueDate: row.dueDate,
      status: row.status,
      notes: row.notes,
    );
  }

  DebtPayment _paymentFromRow(db.DebtPayment row) {
    return DebtPayment(
      id: row.id,
      debtId: row.debtId,
      amount: row.amount,
      paymentDate: row.paymentDate,
      notes: row.notes,
    );
  }
}
