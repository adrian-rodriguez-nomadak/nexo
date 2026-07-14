import 'package:drift/drift.dart';

import '../../../../core/database/app_database.dart' as db;
import '../../../../core/utils/id_generator.dart';
import '../../domain/models/subscription_item.dart';
import '../../domain/repositories/subscriptions_repository.dart';
import '../../../../core/sync/sync_queue_store.dart';

class LocalSubscriptionsRepository implements SubscriptionsRepository {
  const LocalSubscriptionsRepository(this.database, {this.syncQueue});

  final db.AppDatabase database;
  final SyncQueueStore? syncQueue;

  @override
  Future<List<SubscriptionItem>> getSubscriptions() async {
    final rows = await database.subscriptionsDao.getSubscriptions();
    return rows.map(_fromRow).toList();
  }

  Future<void> createSubscription({
    required String name,
    required double amount,
    int billingDay = 15,
    String? category,
  }) async {
    final now = DateTime.now();
    final id = localId('subscription');
    await database.subscriptionsDao.insertSubscription(
      db.SubscriptionsCompanion.insert(
        id: id,
        name: name,
        amount: amount,
        billingDay: billingDay,
        frequency: 'monthly',
        category: Value(category),
        status: 'active',
        createdAt: now,
        updatedAt: now,
      ),
    );
    await syncQueue?.enqueue(
      entity: 'subscription',
      recordId: id,
      operation: 'upsert',
      payload: {
        'name': name,
        'amount': amount,
        'billing_day': billingDay,
        'category': category,
        'status': 'active',
      },
    );
  }

  Future<void> updateSubscription({
    required String id,
    required String name,
    required double amount,
    required int billingDay,
    String? category,
  }) async {
    await database.subscriptionsDao.updateSubscription(
      id,
      db.SubscriptionsCompanion(
        name: Value(name),
        amount: Value(amount),
        billingDay: Value(billingDay),
        category: Value(category),
        syncStatus: const Value('local'),
        updatedAt: Value(DateTime.now()),
      ),
    );
    await syncQueue?.enqueue(
      entity: 'subscription',
      recordId: id,
      operation: 'upsert',
      payload: {
        'name': name,
        'amount': amount,
        'billing_day': billingDay,
        'category': category,
      },
    );
  }

  Future<void> updateStatus(String id, String status) async {
    await database.subscriptionsDao.updateSubscriptionStatus(id, status);
    await syncQueue?.enqueue(
      entity: 'subscription',
      recordId: id,
      operation: 'upsert',
      payload: {'status': status},
    );
  }

  Future<void> deleteSubscription(String id) async {
    await database.subscriptionsDao.deleteSubscription(id);
    await syncQueue?.enqueue(
      entity: 'subscription',
      recordId: id,
      operation: 'delete',
      payload: null,
    );
  }

  SubscriptionItem _fromRow(db.Subscription row) {
    return SubscriptionItem(
      id: row.id,
      name: row.name,
      amount: row.amount,
      billingDay: row.billingDay,
      frequency: row.frequency,
      category: row.category,
      status: row.status,
      notes: row.notes,
    );
  }
}
