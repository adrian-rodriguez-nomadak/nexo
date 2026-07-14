import 'package:drift/drift.dart';

import '../../../../core/database/app_database.dart' as db;
import '../../../../core/database/daos/finances_dao.dart';
import '../../../../core/utils/id_generator.dart';
import '../../domain/models/finance_movement.dart';
import '../../domain/models/finance_account.dart';
import '../../domain/models/finance_budget.dart';
import '../../domain/models/finance_summary.dart';
import '../../domain/models/upcoming_payment.dart';
import '../../domain/repositories/finances_repository.dart';
import '../../../../core/sync/sync_queue_store.dart';

class LocalFinancesRepository implements FinancesRepository {
  const LocalFinancesRepository(this.database, {this.syncQueue});

  final db.AppDatabase database;
  final SyncQueueStore? syncQueue;

  @override
  Future<FinanceSummary> getSummary() async {
    final summary = await database.financesDao.getSummary();
    return FinanceSummary(
      availableAmount: summary.availableReal,
      incomeTotal: summary.totalIncome,
      expenseTotal: summary.totalExpenses,
      upcomingPaymentsTotal: summary.upcomingPayments,
    );
  }

  @override
  Future<List<FinanceMovement>> getMovements() async {
    final rows = await database.financesDao.getMovements();
    return rows.map(_movementFromRow).toList();
  }

  Future<List<FinanceAccount>> getAccounts() async {
    final rows = await database.financesDao.getAccounts();
    return rows
        .map(
          (row) => FinanceAccount(
            id: row.id,
            name: row.name,
            type: row.type,
            initialBalance: row.initialBalance,
            currentBalance: row.currentBalance,
          ),
        )
        .toList();
  }

  Future<void> createAccount({
    required String name,
    required String type,
    required double initialBalance,
  }) async {
    final id = localId('account');
    await database.financesDao.insertAccount(
      LocalFinanceAccount(
        id: id,
        name: name,
        type: type,
        initialBalance: initialBalance,
        currentBalance: initialBalance,
      ),
    );
    await syncQueue?.enqueue(
      entity: 'finance_account',
      recordId: id,
      operation: 'upsert',
      payload: {'name': name, 'type': type, 'initial_balance': initialBalance},
    );
  }

  Future<void> deleteAccount(String id) async {
    await database.financesDao.deleteAccount(id);
    await syncQueue?.enqueue(
      entity: 'finance_account',
      recordId: id,
      operation: 'delete',
      payload: null,
    );
  }

  Future<List<FinanceBudget>> getBudgets({required String period}) async {
    final budgets = await database.financesDao.getBudgets();
    final movements = await database.financesDao.getMovements();
    final start = _periodStart(period, DateTime.now());
    return budgets.map((budget) {
      final spent = movements
          .where(
            (movement) =>
                movement.type == 'expense' &&
                !movement.movementDate.isBefore(start) &&
                (movement.categoryName ?? 'General').toLowerCase() ==
                    budget.category.toLowerCase(),
          )
          .fold<double>(0, (sum, movement) => sum + movement.amount);
      return FinanceBudget(
        id: budget.id,
        category: budget.category,
        limit: budget.amount,
        spent: spent,
      );
    }).toList();
  }

  Future<void> saveBudget({
    required String category,
    required double amount,
  }) async {
    final id = localId('budget');
    await database.financesDao.insertBudget(
      LocalFinanceBudget(id: id, category: category.trim(), amount: amount),
    );
    await syncQueue?.enqueue(
      entity: 'finance_budget',
      recordId: id,
      operation: 'upsert',
      payload: {'category': category.trim(), 'amount': amount},
    );
  }

  Future<void> deleteBudget(String id) async {
    await database.financesDao.deleteBudget(id);
    await syncQueue?.enqueue(
      entity: 'finance_budget',
      recordId: id,
      operation: 'delete',
      payload: null,
    );
  }

  DateTime _periodStart(String period, DateTime now) {
    if (period == 'Mensual') return DateTime(now.year, now.month);
    if (period == 'Semanal') {
      final day = DateTime(now.year, now.month, now.day);
      return day.subtract(Duration(days: now.weekday - DateTime.monday));
    }
    return DateTime(now.year, now.month, now.day <= 15 ? 1 : 16);
  }

  @override
  Future<List<UpcomingPayment>> getUpcomingPayments() async {
    final rows = await database.financesDao.getUpcomingPayments();
    return rows.map(_paymentFromRow).toList();
  }

  Future<void> createMovement({
    required String type,
    required double amount,
    String? description,
    String? categoryName,
    String? paymentMethod,
    String? accountId,
  }) async {
    final now = DateTime.now();
    final id = localId('movement');
    await database.financesDao.insertMovement(
      db.FinanceMovementsCompanion.insert(
        id: id,
        type: type,
        amount: amount,
        categoryName: Value(categoryName),
        description: Value(description),
        movementDate: now,
        paymentMethod: Value(paymentMethod),
        createdAt: now,
        updatedAt: now,
      ),
    );
    if (accountId != null) {
      await database.financesDao.assignMovementToAccount(id, accountId);
    }
    await syncQueue?.enqueue(
      entity: 'finance_movement',
      recordId: id,
      operation: 'upsert',
      payload: {
        'type': type,
        'amount': amount,
        'description': description,
        'category_name': categoryName,
        'payment_method': paymentMethod,
        'movement_date': now.toUtc().toIso8601String(),
        'account_id': accountId,
      },
    );
  }

  Future<void> createTransfer({
    required String fromAccountId,
    required String toAccountId,
    required double amount,
    String? notes,
  }) async {
    final id = localId('transfer');
    await database.financesDao.insertTransfer(
      id: id,
      fromAccountId: fromAccountId,
      toAccountId: toAccountId,
      amount: amount,
      notes: notes,
    );
    await syncQueue?.enqueue(
      entity: 'finance_transfer',
      recordId: id,
      operation: 'upsert',
      payload: {
        'from_account_id': fromAccountId,
        'to_account_id': toAccountId,
        'amount': amount,
        'notes': notes,
      },
    );
  }

  Future<(String, DateTime)> createUpcomingPayment({
    required String name,
    required double amount,
    required DateTime dueDate,
    String? category,
  }) async {
    final now = DateTime.now();
    final id = localId('payment');
    await database.financesDao.insertUpcomingPayment(
      db.UpcomingPaymentsCompanion.insert(
        id: id,
        name: name,
        amount: amount,
        dueDate: dueDate,
        category: Value(category),
        status: 'pending',
        repeatType: 'none',
        createdAt: now,
        updatedAt: now,
      ),
    );
    await syncQueue?.enqueue(
      entity: 'upcoming_payment',
      recordId: id,
      operation: 'upsert',
      payload: {
        'name': name,
        'amount': amount,
        'category': category,
        'status': 'pending',
        'due_date': dueDate.toUtc().toIso8601String(),
      },
    );
    return (id, dueDate);
  }

  Future<void> updateMovement({
    required String id,
    required double amount,
    required String type,
    String? description,
    String? categoryName,
    String? paymentMethod,
  }) async {
    await database.financesDao.updateMovement(
      id,
      db.FinanceMovementsCompanion(
        type: Value(type),
        amount: Value(amount),
        description: Value(description),
        categoryName: Value(categoryName),
        paymentMethod: Value(paymentMethod),
        updatedAt: Value(DateTime.now()),
        syncStatus: const Value('local'),
      ),
    );
    await syncQueue?.enqueue(
      entity: 'finance_movement',
      recordId: id,
      operation: 'upsert',
      payload: {
        'type': type,
        'amount': amount,
        'description': description,
        'category_name': categoryName,
        'payment_method': paymentMethod,
      },
    );
  }

  Future<void> deleteMovement(String id) async {
    await database.financesDao.deleteMovement(id);
    await syncQueue?.enqueue(
      entity: 'finance_movement',
      recordId: id,
      operation: 'delete',
      payload: null,
    );
  }

  Future<void> updateUpcomingPayment({
    required String id,
    required String name,
    required double amount,
    String? category,
    String status = 'pending',
  }) async {
    await database.financesDao.updateUpcomingPayment(
      id,
      db.UpcomingPaymentsCompanion(
        name: Value(name),
        amount: Value(amount),
        category: Value(category),
        status: Value(status),
        updatedAt: Value(DateTime.now()),
        syncStatus: const Value('local'),
      ),
    );
    await syncQueue?.enqueue(
      entity: 'upcoming_payment',
      recordId: id,
      operation: 'upsert',
      payload: {
        'name': name,
        'amount': amount,
        'category': category,
        'status': status,
      },
    );
  }

  Future<void> updateUpcomingPaymentStatus(String id, String status) async {
    await database.financesDao.updateUpcomingPaymentStatus(id, status);
    await syncQueue?.enqueue(
      entity: 'upcoming_payment',
      recordId: id,
      operation: 'upsert',
      payload: {'status': status},
    );
  }

  Future<void> deleteUpcomingPayment(String id) async {
    await database.financesDao.deleteUpcomingPayment(id);
    await syncQueue?.enqueue(
      entity: 'upcoming_payment',
      recordId: id,
      operation: 'delete',
      payload: null,
    );
  }

  FinanceMovement _movementFromRow(db.FinanceMovement row) {
    return FinanceMovement(
      id: row.id,
      type: row.type,
      amount: row.amount,
      movementDate: row.movementDate,
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      description: row.description,
      paymentMethod: row.paymentMethod,
    );
  }

  UpcomingPayment _paymentFromRow(db.UpcomingPayment row) {
    return UpcomingPayment(
      id: row.id,
      name: row.name,
      amount: row.amount,
      dueDate: row.dueDate,
      category: row.category,
      status: row.status,
      repeatType: row.repeatType,
      notes: row.notes,
    );
  }
}
