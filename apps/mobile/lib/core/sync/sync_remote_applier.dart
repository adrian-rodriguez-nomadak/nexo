import 'dart:convert';

import 'package:drift/drift.dart';

import '../database/app_database.dart' as db;
import '../database/daos/finances_dao.dart';
import 'sync_queue_store.dart';

class SyncRemoteApplier {
  const SyncRemoteApplier(this.database, this.store);

  final db.AppDatabase database;
  final SyncQueueStore store;

  Future<int> applyStaged() async {
    var applied = 0;
    for (final change in await store.staged()) {
      final entity = change['entity'] as String;
      final id = change['record_id'] as String;
      if (await store.hasPending(entity, id)) continue;
      if (change['operation'] == 'delete') {
        await _delete(entity, id);
      } else {
        await _upsert(
          entity,
          id,
          change['payload'] as Map<String, dynamic>? ?? const {},
        );
      }
      await store.setVersion(entity, id, change['version'] as int);
      await store.removeStaged(change['cursor'] as int);
      applied++;
    }
    return applied;
  }

  DateTime _date(Object? value, [DateTime? fallback]) => value is String
      ? DateTime.parse(value).toLocal()
      : (fallback ?? DateTime.now());

  Future<void> _upsert(String entity, String id, Map<String, dynamic> p) async {
    final now = DateTime.now();
    switch (entity) {
      case 'calendar_event':
        await database.calendarDao.insertEvent(
          db.CalendarEventsCompanion.insert(
            id: id,
            title: p['title']?.toString() ?? 'Evento',
            startAt: _date(p['start_at']),
            description: Value(p['description']?.toString()),
            endAt: Value(p['end_at'] == null ? null : _date(p['end_at'])),
            locationName: Value(p['location_name']?.toString()),
            repeatType: p['repeat_type']?.toString() ?? 'none',
            status: p['status']?.toString() ?? 'scheduled',
            createdAt: now,
            updatedAt: now,
            syncStatus: const Value('synced'),
          ),
        );
        return;
      case 'task':
        await database.tasksDao.insertTask(
          db.TaskItemsCompanion.insert(
            id: id,
            title: p['title']?.toString() ?? 'Tarea',
            description: Value(p['description']?.toString()),
            dueDate: Value(p['due_date'] == null ? null : _date(p['due_date'])),
            priority: p['priority']?.toString() ?? 'medium',
            status: p['status']?.toString() ?? 'pending',
            createdAt: now,
            updatedAt: now,
            syncStatus: const Value('synced'),
          ),
        );
        return;
      case 'reminder':
        await database.remindersDao.insertReminder(
          db.ReminderItemsCompanion.insert(
            id: id,
            title: p['title']?.toString() ?? 'Recordatorio',
            description: Value(p['description']?.toString()),
            remindAt: _date(p['remind_at']),
            repeatType: p['repeat_type']?.toString() ?? 'none',
            status: p['status']?.toString() ?? 'pending',
            createdAt: now,
            updatedAt: now,
            syncStatus: const Value('synced'),
          ),
        );
        return;
      case 'subscription':
        await database.subscriptionsDao.insertSubscription(
          db.SubscriptionsCompanion.insert(
            id: id,
            name: p['name']?.toString() ?? 'Suscripción',
            amount: (p['amount'] as num?)?.toDouble() ?? 0,
            billingDay: (p['billing_day'] as num?)?.toInt() ?? 1,
            frequency: p['frequency']?.toString() ?? 'monthly',
            category: Value(p['category']?.toString()),
            status: p['status']?.toString() ?? 'active',
            notes: Value(p['notes']?.toString()),
            createdAt: now,
            updatedAt: now,
            syncStatus: const Value('synced'),
          ),
        );
        return;
      case 'debt':
        final total = (p['total_amount'] as num?)?.toDouble() ?? 0;
        await database.debtsDao.insertDebt(
          db.DebtsCompanion.insert(
            id: id,
            name: p['name']?.toString() ?? 'Deuda',
            type: p['type']?.toString() ?? 'i_owe',
            totalAmount: total,
            pendingAmount: (p['pending_amount'] as num?)?.toDouble() ?? total,
            dueDate: Value(p['due_date'] == null ? null : _date(p['due_date'])),
            status: p['status']?.toString() ?? 'pending',
            notes: Value(p['notes']?.toString()),
            createdAt: now,
            updatedAt: now,
            syncStatus: const Value('synced'),
          ),
        );
        return;
      case 'debt_payment':
        await database.debtsDao.insertDebtPayment(
          db.DebtPaymentsCompanion.insert(
            id: id,
            debtId: p['debt_id']?.toString() ?? '',
            amount: (p['amount'] as num?)?.toDouble() ?? 0,
            paymentDate: _date(p['payment_date']),
            notes: Value(p['notes']?.toString()),
            createdAt: now,
            updatedAt: now,
            syncStatus: const Value('synced'),
          ),
        );
        return;
      case 'finance_movement':
        await database.financesDao.insertMovement(
          db.FinanceMovementsCompanion.insert(
            id: id,
            type: p['type']?.toString() ?? 'expense',
            amount: (p['amount'] as num?)?.toDouble() ?? 0,
            categoryName: Value(p['category_name']?.toString()),
            description: Value(p['description']?.toString()),
            movementDate: _date(p['movement_date']),
            paymentMethod: Value(p['payment_method']?.toString()),
            createdAt: now,
            updatedAt: now,
            syncStatus: const Value('synced'),
          ),
        );
        final accountId = p['account_id']?.toString();
        if (accountId != null && accountId.isNotEmpty) {
          await database.financesDao.assignMovementToAccount(id, accountId);
        }
        return;
      case 'finance_account':
        final initial = (p['initial_balance'] as num?)?.toDouble() ?? 0;
        await database.financesDao.insertAccount(
          LocalFinanceAccount(
            id: id,
            name: p['name']?.toString() ?? 'Cuenta',
            type: p['type']?.toString() ?? 'Efectivo',
            initialBalance: initial,
            currentBalance: initial,
          ),
        );
        return;
      case 'finance_budget':
        await database.financesDao.insertBudget(
          LocalFinanceBudget(
            id: id,
            category: p['category']?.toString() ?? 'Otros',
            amount: (p['amount'] as num?)?.toDouble() ?? 0,
          ),
        );
        return;
      case 'finance_category':
        await database.customStatement(
          '''INSERT OR REPLACE INTO finance_categories (id, name, created_at)
             VALUES (?, ?, ?)''',
          [id, p['name']?.toString() ?? 'Otros', now.millisecondsSinceEpoch],
        );
        return;
      case 'finance_transfer':
        await database.financesDao.insertTransfer(
          id: id,
          fromAccountId: p['from_account_id']?.toString() ?? '',
          toAccountId: p['to_account_id']?.toString() ?? '',
          amount: (p['amount'] as num?)?.toDouble() ?? 0,
          notes: p['notes']?.toString(),
        );
        return;
      case 'upcoming_payment':
        await database.financesDao.insertUpcomingPayment(
          db.UpcomingPaymentsCompanion.insert(
            id: id,
            name: p['name']?.toString() ?? 'Pago',
            amount: (p['amount'] as num?)?.toDouble() ?? 0,
            dueDate: _date(p['due_date'], now),
            category: Value(p['category']?.toString()),
            status: p['status']?.toString() ?? 'pending',
            repeatType: p['repeat_type']?.toString() ?? 'none',
            notes: Value(p['notes']?.toString()),
            createdAt: now,
            updatedAt: now,
            syncStatus: const Value('synced'),
          ),
        );
        return;
      case 'inbox_action':
        await database.inboxDao.insertAction(
          db.InboxActionsCompanion.insert(
            id: id,
            rawText: p['raw_text']?.toString() ?? '',
            detectedIntent: p['detected_intent']?.toString() ?? 'unknown',
            structuredPayload: jsonEncode(p['structured_payload'] ?? const {}),
            status: p['status']?.toString() ?? 'draft',
            createdAt: now,
            updatedAt: now,
            syncStatus: const Value('synced'),
          ),
        );
        return;
    }
  }

  Future<void> _delete(String entity, String id) async {
    if (entity == 'finance_account') {
      await database.financesDao.deleteAccount(id);
      return;
    }
    if (entity == 'finance_movement') {
      await database.financesDao.deleteMovement(id);
      return;
    }
    final table = switch (entity) {
      'calendar_event' => 'calendar_events',
      'task' => 'task_items',
      'reminder' => 'reminder_items',
      'subscription' => 'subscriptions',
      'debt' => 'debts',
      'debt_payment' => 'debt_payments',
      'finance_budget' => 'finance_budgets',
      'finance_category' => 'finance_categories',
      'finance_transfer' => 'finance_transfers',
      'upcoming_payment' => 'upcoming_payments',
      'inbox_action' => 'inbox_actions',
      _ => null,
    };
    if (table != null) {
      await database.customStatement('DELETE FROM $table WHERE id = ?', [id]);
    }
  }
}
