import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/subscription_tables.dart';

part 'subscriptions_dao.g.dart';

@DriftAccessor(tables: [Subscriptions])
class SubscriptionsDao extends DatabaseAccessor<AppDatabase>
    with _$SubscriptionsDaoMixin {
  SubscriptionsDao(super.db);

  Future<List<Subscription>> getSubscriptions() {
    return (select(
      subscriptions,
    )..orderBy([(table) => OrderingTerm.asc(table.billingDay)])).get();
  }

  Future<void> insertSubscription(SubscriptionsCompanion subscription) {
    return into(subscriptions).insertOnConflictUpdate(subscription);
  }

  Future<void> updateSubscription(
    String id,
    SubscriptionsCompanion subscription,
  ) {
    return (update(
      subscriptions,
    )..where((table) => table.id.equals(id))).write(subscription);
  }

  Future<void> updateSubscriptionStatus(String id, String status) {
    return (update(subscriptions)..where((table) => table.id.equals(id))).write(
      SubscriptionsCompanion(
        status: Value(status),
        updatedAt: Value(DateTime.now()),
      ),
    );
  }

  Future<void> deleteSubscription(String id) {
    return (delete(subscriptions)..where((table) => table.id.equals(id))).go();
  }
}
