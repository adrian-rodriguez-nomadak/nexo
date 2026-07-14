import 'package:drift/drift.dart';

import 'app_database.dart';

class LocalSeedService {
  const LocalSeedService(this.database);

  final AppDatabase database;

  Future<void> seedIfEmpty() async {
    final existing = await database.financesDao.getMovements();
    if (existing.isNotEmpty) return;

    final now = DateTime.now();
    await database.financesDao.insertMovement(
      FinanceMovementsCompanion.insert(
        id: 'local-income-1',
        type: 'income',
        amount: 8420,
        description: const Value('Ingreso nómina'),
        movementDate: DateTime(2026, 7, 7),
        paymentMethod: const Value('transfer'),
        createdAt: now,
        updatedAt: now,
      ),
    );
    await database.financesDao.insertMovement(
      FinanceMovementsCompanion.insert(
        id: 'local-expense-1',
        type: 'expense',
        amount: 180,
        categoryName: const Value('Alimentos'),
        description: const Value('Gasto en comida'),
        movementDate: DateTime(2026, 7, 8),
        paymentMethod: const Value('card'),
        createdAt: now,
        updatedAt: now,
      ),
    );
    await database.financesDao.insertUpcomingPayment(
      UpcomingPaymentsCompanion.insert(
        id: 'local-payment-1',
        name: 'Spotify',
        amount: 129,
        dueDate: DateTime(2026, 7, 9),
        category: const Value('Suscripción'),
        status: 'pending',
        repeatType: 'monthly',
        createdAt: now,
        updatedAt: now,
      ),
    );
    await database.subscriptionsDao.insertSubscription(
      SubscriptionsCompanion.insert(
        id: 'local-subscription-1',
        name: 'Spotify',
        amount: 129,
        billingDay: 12,
        frequency: 'monthly',
        category: const Value('Entretenimiento'),
        status: 'active',
        createdAt: now,
        updatedAt: now,
      ),
    );
    await database.debtsDao.insertDebt(
      DebtsCompanion.insert(
        id: 'local-debt-1',
        name: 'Tarjeta Nu',
        type: 'i_owe',
        totalAmount: 8500,
        pendingAmount: 8500,
        dueDate: Value(DateTime(2026, 7, 10)),
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      ),
    );
    await database.calendarDao.insertEvent(
      CalendarEventsCompanion.insert(
        id: 'local-event-1',
        title: 'Reunión semanal',
        startAt: DateTime(2026, 7, 8, 9),
        endAt: Value(DateTime(2026, 7, 8, 10)),
        locationName: const Value('Oficina'),
        repeatType: 'none',
        status: 'scheduled',
        createdAt: now,
        updatedAt: now,
      ),
    );
    await database.tasksDao.insertTask(
      TaskItemsCompanion.insert(
        id: 'local-task-1',
        title: 'Enviar comprobante',
        dueDate: Value(DateTime(2026, 7, 8)),
        priority: 'medium',
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      ),
    );
    await database.remindersDao.insertReminder(
      ReminderItemsCompanion.insert(
        id: 'local-reminder-1',
        title: 'Pagar gym',
        remindAt: DateTime(2026, 7, 8, 18),
        repeatType: 'none',
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      ),
    );
    await database.inboxDao.insertAction(
      InboxActionsCompanion.insert(
        id: 'local-inbox-1',
        rawText: 'Gasté 180 en comida',
        detectedIntent: 'create_expense',
        structuredPayload: '{"amount":180}',
        status: 'draft',
        createdAt: now,
        updatedAt: now,
      ),
    );
  }
}
